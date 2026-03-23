import Hls from "hls.js";
import { appStore } from "../store/appStore";
import { LastPlayedChannel, PlayerTrackOption } from "../types/models";
import { addToHistory } from "../utils/history";
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
let lastRequestedChannel: LastPlayedChannel | null = null;

function teardownHls(): void {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
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
  if (
    !currentChannelName ||
    !playerStatus ||
    !resumeButton ||
    !qualitySelect ||
    !audioTrackSelect ||
    !playerStatusBadge ||
    !playerNetworkBadge ||
    !playerRetriesBadge
  ) {
    return;
  }

  currentChannelName.textContent =
    player.currentChannel?.name || "Select a channel to start watching";

  if (player.currentChannel) {
    resumeButton.hidden = false;
    resumeButton.textContent = `Resume ${player.currentChannel.name}`;
  } else {
    resumeButton.hidden = true;
    resumeButton.textContent = "Resume";
  }

  qualitySelect.innerHTML = player.qualityLevels
    .map(
      (option) => `<option value="${option.value}">${option.label}</option>`
    )
    .join("");
  qualitySelect.value = player.selectedQuality.toString();

  audioTrackSelect.innerHTML = player.audioTracks
    .map(
      (option) => `<option value="${option.value}">${option.label}</option>`
    )
    .join("");
  audioTrackSelect.value = player.selectedAudioTrack.toString();

  playerStatusBadge.textContent = player.status.toUpperCase();
  playerNetworkBadge.textContent =
    player.networkStatus === "offline" ? "Offline" : "Online";
  playerRetriesBadge.textContent = `Retries ${player.retries}/${MAX_RETRIES}`;

  if (player.status === "loading") {
    playerStatus.textContent = "Connecting to stream...";
    return;
  }

  if (player.status === "playing") {
    playerStatus.textContent = "Live playback in progress.";
    return;
  }

  if (player.status === "error") {
    playerStatus.textContent =
      player.errorMessage || "Playback hit an error. Try another stream.";
    return;
  }

  playerStatus.textContent = player.currentChannel
    ? "Ready to resume your last channel."
    : "Load a playlist, browse channels, and start playback.";
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
  const currentChannel = {
    name: channelName,
    playedAt: new Date().toISOString(),
    url,
  };
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

  lastRequestedChannel = currentChannel;
  syncStoredChannel(currentChannel);
  if (!options.resetRetries) {
    appStore.setPlayer({
      retries: appStore.getState().player.retries,
    });
  }
  teardownHls();

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    hls.loadSource(currentChannel.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video?.play().catch((error) => {
        console.error("Autoplay failed.", error);
      });
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
      handlePlaybackRetry("This stream could not be played in HLS mode.");
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = currentChannel.url;
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
      video?.play().catch((error) => {
        console.error("Autoplay failed.", error);
      });
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
  playerStatusBadge = document.getElementById("playerStatusBadge");
  playerNetworkBadge = document.getElementById("playerNetworkBadge");
  playerRetriesBadge = document.getElementById("playerRetriesBadge");
  const pipButton = document.getElementById("pipButton") as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById(
    "fullscreenButton"
  ) as HTMLButtonElement | null;

  if (
    !video ||
    !muteButton ||
    !volumeSlider ||
    !pipButton ||
    !fullscreenButton ||
    !qualitySelect ||
    !audioTrackSelect ||
    !retryButton
  ) {
    return;
  }

  const videoElement = video;
  const { preferences, currentChannel } = appStore.getState().player;
  videoElement.volume = preferences.volume;
  videoElement.muted = preferences.muted;
  volumeSlider.value = preferences.volume.toString();
  updateMuteButton();
  renderPlayerState();

  pipButton.addEventListener("click", async () => {
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

  fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      void videoElement.requestFullscreen();
    } else {
      void document.exitFullscreen?.();
    }
  });

  muteButton.addEventListener("click", () => {
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    updateMuteButton();
    persistPreferences();
  });

  volumeSlider.addEventListener("input", (event) => {
    if (!video) {
      return;
    }

    video.volume = parseFloat((event.target as HTMLInputElement).value);
    video.muted = video.volume === 0;
    updateMuteButton();
    persistPreferences();
  });

  qualitySelect.addEventListener("change", (event) => {
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

  audioTrackSelect.addEventListener("change", (event) => {
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

  retryButton.addEventListener("click", () => {
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

  video.addEventListener("play", () => {
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

    playChannel(detail.url, detail.name);
  });

  window.addEventListener("online", () => {
    appStore.setPlayer({
      networkStatus: "online",
    });
  });

  window.addEventListener("offline", () => {
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
