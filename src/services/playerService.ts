import Hls from "hls.js";
import { appStore } from "../store/appStore";
import { LastPlayedChannel, PlayerTrackOption } from "../types/models";
import { logDiagnostic } from "../utils/diagnostics";
import { addToHistory } from "../utils/history";
import {
  getProxyAwareUrl,
  isIgnorablePlaybackError,
  isStreamProxyEnabled,
  normalizePlayableUrl,
} from "../utils/network";
import {
  markSourcePlaybackFailure,
  markSourcePlaybackSuccess,
  reportSourceIssue,
} from "../utils/sourceHealth";
import {
  setLastPlayedChannel,
  setPlayerPreferences,
} from "../utils/storage";

const MAX_RETRIES = 2;

let hls: Hls | null = null;
let video: HTMLVideoElement | null = null;
let muteButton: HTMLButtonElement | null = null;
let volumeSlider: HTMLInputElement | null = null;
let currentChannelName: HTMLElement | null = null;
let playerStatus: HTMLElement | null = null;
let resumeButton: HTMLButtonElement | null = null;
let qualitySelect: HTMLSelectElement | null = null;
let audioTrackSelect: HTMLSelectElement | null = null;
let retryButton: HTMLButtonElement | null = null;
let playerStatusBadge: HTMLElement | null = null;
let playerNetworkBadge: HTMLElement | null = null;
let playerRetriesBadge: HTMLElement | null = null;
let reportCurrentStreamButton: HTMLButtonElement | null = null;
let playerContainer: HTMLElement | null = null;
let lastRequestedChannel: LastPlayedChannel | null = null;
let lastConfirmedHealthyUrl = "";
let playbackSessionId = 0;

function updateTrackSelector(
  select: HTMLSelectElement | null,
  options: PlayerTrackOption[],
  selectedValue: number
): void {
  if (!select) {
    return;
  }

  select.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
  select.value = selectedValue.toString();
}

function teardownHls(): void {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (video) {
    video.onloadedmetadata = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function getHlsErrorMessage(data: {
  details?: string;
  response?: {
    code?: number;
    text?: string;
  };
  type?: string;
}): string {
  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
    const statusCode = data.response?.code;
    const statusSuffix = statusCode ? ` Upstream status ${statusCode}.` : "";
    return isStreamProxyEnabled()
      ? `The stream request failed upstream. The source may be offline, geo-blocked, or refusing the proxy request.${statusSuffix}`
      : `The stream request was blocked. This usually means the source does not allow browser playback from your current origin.${statusSuffix}`;
  }

  if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
    return "The stream loaded, but the media could not be decoded by the browser.";
  }

  return "This stream could not be played in HLS mode.";
}

function requestVideoPlayback(sessionId: number): void {
  if (!video || sessionId !== playbackSessionId) {
    return;
  }

  void video.play().catch((error) => {
    if (sessionId !== playbackSessionId || isIgnorablePlaybackError(error)) {
      return;
    }

    logDiagnostic("warn", "Autoplay was blocked by the browser.");
    appStore.setPlayer({
      errorMessage: "Autoplay was blocked. Use the player controls to start playback.",
      status: "idle",
    });
  });
}

function persistPreferences(): void {
  if (!video) {
    return;
  }

  const preferences = {
    muted: video.muted,
    volume: video.volume,
  };

  appStore.setPlayer({ preferences });
  setPlayerPreferences(preferences);
}

function updateMuteButton(): void {
  if (!muteButton || !video) {
    return;
  }

  muteButton.innerHTML = video.muted
    ? '<i class="fas fa-volume-mute"></i>'
    : '<i class="fas fa-volume-up"></i>';
}

function renderPlayerState(): void {
  const { player } = appStore.getState();
  const hasChannel = Boolean(player.currentChannel);
  const statusLabel =
    player.status === "playing"
      ? "ON AIR"
      : player.status === "loading"
        ? "BUFFERING"
        : player.status === "error"
          ? "SIGNAL LOST"
          : "STANDBY";

  playerContainer?.setAttribute("data-player-state", player.status);
  playerContainer?.setAttribute("data-has-channel", hasChannel ? "true" : "false");

  if (currentChannelName) {
    currentChannelName.textContent =
      player.currentChannel?.name || "Select a channel to start watching";
  }

  if (resumeButton) {
    if (player.currentChannel) {
      resumeButton.hidden = false;
      resumeButton.textContent = `Resume ${player.currentChannel.name}`;
    } else {
      resumeButton.hidden = true;
      resumeButton.textContent = "Resume";
    }
  }

  updateTrackSelector(
    qualitySelect,
    player.qualityLevels,
    player.selectedQuality
  );
  updateTrackSelector(
    audioTrackSelect,
    player.audioTracks,
    player.selectedAudioTrack
  );

  if (qualitySelect) {
    qualitySelect.disabled = !hasChannel || player.qualityLevels.length <= 1;
  }

  if (audioTrackSelect) {
    audioTrackSelect.disabled = !hasChannel || player.audioTracks.length <= 1;
  }

  if (retryButton) {
    retryButton.disabled = !hasChannel;
  }

  if (reportCurrentStreamButton) {
    reportCurrentStreamButton.disabled = !hasChannel;
  }

  if (playerStatusBadge) {
    playerStatusBadge.textContent = statusLabel;
  }

  if (playerNetworkBadge) {
    playerNetworkBadge.textContent =
      player.networkStatus === "offline" ? "Offline" : "Online";
  }

  if (playerRetriesBadge) {
    playerRetriesBadge.textContent = `Retries ${player.retries}/${MAX_RETRIES}`;
  }

  if (!playerStatus) {
    return;
  }

  if (player.status === "loading") {
    playerStatus.textContent = player.currentChannel
      ? `Locking onto ${player.currentChannel.name}. The stream is connecting now.`
      : "Preparing the live player.";
    return;
  }

  if (player.status === "playing") {
    playerStatus.textContent = player.currentChannel
      ? `${player.currentChannel.name} is streaming live.`
      : "Live playback in progress.";
    return;
  }

  if (player.status === "error") {
    playerStatus.textContent =
      player.errorMessage || "Playback hit an error. Try another stream.";
    return;
  }

  playerStatus.textContent = player.currentChannel
    ? "Channel armed. Resume when you are ready."
    : "Load a playlist, pick a channel, and the player will light up here.";
}

function syncStoredChannel(channel: LastPlayedChannel): void {
  appStore.setPlayer({
    audioTracks: [
      {
        label: "Default Audio",
        value: -1,
      },
    ],
    currentChannel: channel,
    errorMessage: null,
    qualityLevels: [
      {
        label: "Auto Quality",
        value: -1,
      },
    ],
    retries: 0,
    selectedAudioTrack: -1,
    selectedQuality: -1,
    status: "loading",
  });
  setLastPlayedChannel(channel);
}

export function playChannel(url: string, channelName: string): void {
  console.log('[PLAYER] playChannel called:', { url, channelName });

  // Re-find video element in case DOM changed
  if (!video) {
    video = document.getElementById("videoPlayer") as HTMLVideoElement | null;
    console.log('[PLAYER] Re-found video element:', video);
  }

  if (!video) {
    console.error('[PLAYER] Video element not found!');
    alert('Player not initialized. Please refresh the page.');
    return;
  }

  const currentChannel = {
    name: channelName,
    playedAt: new Date().toISOString(),
    url,
  };

  console.log('[PLAYER] Starting playback for:', currentChannel);
  startPlayback(currentChannel, {
    persistHistory: true,
    resetRetries: true,
  });
}

function startPlayback(
  currentChannel: LastPlayedChannel,
  options: {
    persistHistory: boolean;
    resetRetries: boolean;
  }
): void {
  if (!video) {
    return;
  }

  const existingRetries = appStore.getState().player.retries;
  lastRequestedChannel = currentChannel;
  lastConfirmedHealthyUrl = "";
  const currentPlaybackSessionId = ++playbackSessionId;
  syncStoredChannel(currentChannel);
  if (!options.resetRetries) {
    appStore.setPlayer({
      retries: existingRetries,
    });
  }
  teardownHls();
  logDiagnostic("info", `Starting playback for ${currentChannel.name}`, currentChannel.url);

  console.log('[PLAYER] HLS supported:', Hls.isSupported());
  console.log('[PLAYER] Video element:', video);
  console.log('[PLAYER] Stream URL:', currentChannel.url);
  const playbackUrl = normalizePlayableUrl(currentChannel.url);
  if (playbackUrl !== currentChannel.url) {
    console.log("[PLAYER] Normalized stream URL for playback:", playbackUrl);
  }

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      xhrSetup: (xhr, url) => {
        const proxiedUrl = getProxyAwareUrl(url);
        if (proxiedUrl !== url) {
          xhr.open("GET", proxiedUrl, true);
        }
      },
    });
    hls.loadSource(playbackUrl);
    hls.attachMedia(video);
    console.log('[PLAYER HLS] Loading source:', playbackUrl);
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('[PLAYER HLS] Manifest parsed:', data);
      requestVideoPlayback(currentPlaybackSessionId);
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('[PLAYER HLS] Error:', data);
    });
    hls.on(Hls.Events.LEVELS_UPDATED, (_, data) => {
      const qualityLevels: PlayerTrackOption[] = [
        {
          label: "Auto Quality",
          value: -1,
        },
        ...data.levels.map((level, index) => ({
          label: level.height
            ? `${level.height}p`
            : `${Math.round(level.bitrate / 1000)} kbps`,
          value: index,
        })),
      ];
      appStore.setPlayer({
        qualityLevels,
      });
    });
    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
      const audioTracks: PlayerTrackOption[] = [
        {
          label: "Default Audio",
          value: -1,
        },
        ...data.audioTracks.map((track, index) => ({
          label:
            track.name ||
            track.lang ||
            `Audio ${index + 1}`,
          value: index,
        })),
      ];
      appStore.setPlayer({
        audioTracks,
      });
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      appStore.setPlayer({
        selectedQuality: data.level,
      });
    });
    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
      appStore.setPlayer({
        selectedAudioTrack: data.id,
      });
    });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) {
        return;
      }
      const errorMessage = getHlsErrorMessage(data);
      logDiagnostic(
        "error",
        `Fatal HLS playback error detected (${data.type || "unknown"}:${data.details || "unknown"}).`,
        currentChannel.url
      );
      markSourcePlaybackFailure(currentChannel.url, currentChannel.name);
      handlePlaybackRetry(errorMessage);
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = getProxyAwareUrl(playbackUrl);
    appStore.setPlayer({
      audioTracks: [
        {
          label: "Native Audio",
          value: -1,
        },
      ],
      qualityLevels: [
        {
          label: "Native Quality",
          value: -1,
        },
      ],
    });
    video.onloadedmetadata = () => {
      requestVideoPlayback(currentPlaybackSessionId);
    };
  } else {
    appStore.setPlayer({
      errorMessage: "Your browser does not support HLS playback.",
      status: "error",
    });
    alert("Your browser does not support HLS playback.");
    return;
  }

  if (options.persistHistory) {
    addToHistory(currentChannel.name, currentChannel.url);
  }
}

function handlePlaybackRetry(errorMessage: string): void {
  const retries = appStore.getState().player.retries;
  if (!lastRequestedChannel || retries >= MAX_RETRIES) {
    logDiagnostic("error", errorMessage, lastRequestedChannel?.url);
    if (lastRequestedChannel) {
      markSourcePlaybackFailure(lastRequestedChannel.url, lastRequestedChannel.name);
    }
    appStore.setPlayer({
      errorMessage,
      status: "error",
    });
    return;
  }

  appStore.setPlayer({
    errorMessage: `Retrying playback (${retries + 1}/${MAX_RETRIES})...`,
    retries: retries + 1,
    status: "loading",
  });
  logDiagnostic(
    "warn",
    `Retrying playback (${retries + 1}/${MAX_RETRIES}).`,
    lastRequestedChannel.url
  );

  window.setTimeout(() => {
    if (!lastRequestedChannel) {
      return;
    }

    startPlayback(
      {
        ...lastRequestedChannel,
        playedAt: new Date().toISOString(),
      },
      {
        persistHistory: false,
        resetRetries: false,
      }
    );
  }, 900);
}

export function initializePlayerService(): void {
  video = document.getElementById("videoPlayer") as HTMLVideoElement | null;
  playerContainer = video?.closest(".player-container") as HTMLElement | null;
  muteButton = document.getElementById("muteButton") as HTMLButtonElement | null;
  volumeSlider = document.getElementById(
    "volumeSlider"
  ) as HTMLInputElement | null;
  currentChannelName = document.getElementById("currentChannelName");
  playerStatus = document.getElementById("playerStatus");
  resumeButton = document.getElementById(
    "resumeLastChannel"
  ) as HTMLButtonElement | null;
  qualitySelect = document.getElementById(
    "qualitySelect"
  ) as HTMLSelectElement | null;
  audioTrackSelect = document.getElementById(
    "audioTrackSelect"
  ) as HTMLSelectElement | null;
  retryButton = document.getElementById(
    "retryPlayback"
  ) as HTMLButtonElement | null;
  reportCurrentStreamButton = document.getElementById(
    "reportCurrentStream"
  ) as HTMLButtonElement | null;
  playerStatusBadge = document.getElementById("playerStatusBadge");
  playerNetworkBadge = document.getElementById("playerNetworkBadge");
  playerRetriesBadge = document.getElementById("playerRetriesBadge");
  const pipButton = document.getElementById("pipButton") as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById(
    "fullscreenButton"
  ) as HTMLButtonElement | null;

  if (!video) {
    return;
  }

  const videoElement = video;
  const { preferences, currentChannel } = appStore.getState().player;
  videoElement.volume = preferences.volume;
  videoElement.muted = preferences.muted;
  if (volumeSlider) {
    volumeSlider.value = preferences.volume.toString();
  }
  updateMuteButton();
  renderPlayerState();

  pipButton?.addEventListener("click", async () => {
    try {
      if (!document.pictureInPictureEnabled) {
        throw new Error("Picture-in-picture is not supported in this browser.");
      }

      if (videoElement !== document.pictureInPictureElement) {
        await videoElement.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error(error);
    }
  });

  fullscreenButton?.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      void videoElement.requestFullscreen();
    } else {
      void document.exitFullscreen?.();
    }
  });

  muteButton?.addEventListener("click", () => {
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    updateMuteButton();
    persistPreferences();
  });

  volumeSlider?.addEventListener("input", (event) => {
    if (!video) {
      return;
    }

    video.volume = parseFloat((event.target as HTMLInputElement).value);
    video.muted = video.volume === 0;
    updateMuteButton();
    persistPreferences();
  });

  qualitySelect?.addEventListener("change", (event) => {
    const selectedQuality = parseInt(
      (event.target as HTMLSelectElement).value,
      10
    );
    appStore.setPlayer({
      selectedQuality,
    });
    if (hls) {
      hls.currentLevel = selectedQuality;
    }
  });

  audioTrackSelect?.addEventListener("change", (event) => {
    const selectedAudioTrack = parseInt(
      (event.target as HTMLSelectElement).value,
      10
    );
    appStore.setPlayer({
      selectedAudioTrack,
    });
    if (hls && selectedAudioTrack >= 0) {
      hls.audioTrack = selectedAudioTrack;
    }
  });

  retryButton?.addEventListener("click", () => {
    if (!lastRequestedChannel) {
      return;
    }

    startPlayback(
      {
        ...lastRequestedChannel,
        playedAt: new Date().toISOString(),
      },
      {
        persistHistory: false,
        resetRetries: true,
      }
    );
  });

  reportCurrentStreamButton?.addEventListener("click", () => {
    const channel = appStore.getState().player.currentChannel;
    if (!channel) {
      return;
    }

    reportSourceIssue(channel.url, channel.name);
  });

  video.addEventListener("play", () => {
    const channel = appStore.getState().player.currentChannel;
    if (channel && lastConfirmedHealthyUrl !== channel.url) {
      lastConfirmedHealthyUrl = channel.url;
      markSourcePlaybackSuccess(channel.url, channel.name);
    }

    appStore.setPlayer({
      errorMessage: null,
      status: "playing",
    });
  });

  video.addEventListener("waiting", () => {
    appStore.setPlayer({
      status: "loading",
    });
  });

  video.addEventListener("error", () => {
    const channel = appStore.getState().player.currentChannel;
    if (channel) {
      markSourcePlaybackFailure(channel.url, channel.name);
    }
    handlePlaybackRetry("Playback hit an error. Try another stream.");
  });

  resumeButton?.addEventListener("click", () => {
    const channel = appStore.getState().player.currentChannel;
    if (!channel) {
      return;
    }

    playChannel(channel.url, channel.name);
  });

  window.addEventListener("app:play-channel", (event: Event) => {
    const detail = (event as CustomEvent<{ name: string; url: string }>).detail;
    if (!detail?.name || !detail.url) {
      return;
    }

    console.log('[PLAYER] Playing channel:', detail.name, detail.url);
    playChannel(detail.url, detail.name);
  });

  window.addEventListener("online", () => {
    logDiagnostic("info", "Network connection restored.");
    appStore.setPlayer({
      networkStatus: "online",
    });
  });

  window.addEventListener("offline", () => {
    logDiagnostic("warn", "Network connection lost.");
    appStore.setPlayer({
      errorMessage: "You appear to be offline.",
      networkStatus: "offline",
      status: "error",
    });
  });

  appStore.subscribe(() => {
    renderPlayerState();
    updateMuteButton();
  });

  if (currentChannel) {
    renderPlayerState();
  }
}
