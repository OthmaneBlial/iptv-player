import Hls from "hls.js";
import { appStore } from "../store/appStore";
import { LastPlayedChannel } from "../types/models";
import { addToHistory } from "../utils/history";
import {
  setLastPlayedChannel,
  setPlayerPreferences,
} from "../utils/storage";

let hls: Hls | null = null;
let video: HTMLVideoElement | null = null;
let muteButton: HTMLButtonElement | null = null;
let volumeSlider: HTMLInputElement | null = null;
let currentChannelName: HTMLElement | null = null;
let playerStatus: HTMLElement | null = null;
let resumeButton: HTMLButtonElement | null = null;

function teardownHls(): void {
  if (hls) {
    hls.destroy();
    hls = null;
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
  if (!currentChannelName || !playerStatus || !resumeButton) {
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
    currentChannel: channel,
    errorMessage: null,
    status: "loading",
  });
  setLastPlayedChannel(channel);
}

export function playChannel(url: string, channelName: string): void {
  if (!video) {
    return;
  }

  const currentChannel = {
    name: channelName,
    playedAt: new Date().toISOString(),
    url,
  };

  syncStoredChannel(currentChannel);
  teardownHls();

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video?.play().catch((error) => {
        console.error("Autoplay failed.", error);
      });
    });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) {
        return;
      }

      appStore.setPlayer({
        errorMessage: "This stream could not be played in HLS mode.",
        status: "error",
      });
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
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

  addToHistory(channelName, url);
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
  const pipButton = document.getElementById("pipButton") as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById(
    "fullscreenButton"
  ) as HTMLButtonElement | null;

  if (!video || !muteButton || !volumeSlider || !pipButton || !fullscreenButton) {
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
    appStore.setPlayer({
      errorMessage: "Playback hit an error. Try another stream.",
      status: "error",
    });
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

  appStore.subscribe(() => {
    renderPlayerState();
    updateMuteButton();
  });

  if (currentChannel) {
    renderPlayerState();
  }
}
