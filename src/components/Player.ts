import { playChannel } from "../utils/playlist";
import {
  getLastPlayedChannel,
  getPlayerPreferences,
  setPlayerPreferences,
} from "../utils/storage";

export function Player(): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("player-container");
  const lastPlayedChannel = getLastPlayedChannel();
  container.innerHTML = `
    <div class="player-overlay">
      <div class="player-meta">
        <p class="player-kicker">Stream Deck</p>
        <h2 id="currentChannelName">${
          lastPlayedChannel?.name || "Select a channel to start watching"
        }</h2>
        <p id="playerStatus">${
          lastPlayedChannel
            ? "Ready to resume your last channel."
            : "Load a playlist, browse channels, and start playback."
        }</p>
      </div>
      ${
        lastPlayedChannel
          ? `<button id="resumeLastChannel" class="resume-button">Resume ${lastPlayedChannel.name}</button>`
          : ""
      }
    </div>
    <div class="controls">
      <button id="pipButton">
        <i class="fas fa-window-restore"></i> PiP
      </button>
      <button id="fullscreenButton">
        <i class="fas fa-expand"></i> Fullscreen
      </button>
      <div class="volume-control">
        <button id="muteButton">
          <i class="fas fa-volume-up"></i>
        </button>
        <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="1" />
      </div>
    </div>
    <video id="videoPlayer" controls></video>
  `;

  // Initialize Video Player
  const video = container.querySelector("#videoPlayer") as HTMLVideoElement;
  const pipButton = container.querySelector("#pipButton") as HTMLButtonElement;
  const fullscreenButton = container.querySelector(
    "#fullscreenButton"
  ) as HTMLButtonElement;
  const muteButton = container.querySelector(
    "#muteButton"
  ) as HTMLButtonElement;
  const volumeSlider = container.querySelector(
    "#volumeSlider"
  ) as HTMLInputElement;
  const currentChannelName = container.querySelector(
    "#currentChannelName"
  ) as HTMLElement;
  const playerStatus = container.querySelector("#playerStatus") as HTMLElement;
  const resumeButton = container.querySelector(
    "#resumeLastChannel"
  ) as HTMLButtonElement | null;
  const savedPreferences = getPlayerPreferences();

  video.volume = savedPreferences.volume;
  video.muted = savedPreferences.muted;
  volumeSlider.value = savedPreferences.volume.toString();

  // PiP Functionality
  pipButton.addEventListener("click", async () => {
    try {
      if (!document.pictureInPictureEnabled) {
        throw new Error("Picture-in-picture is not supported in this browser.");
      }

      if (video !== document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error(error);
    }
  });

  // Fullscreen Functionality
  fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      video.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  // Mute Functionality
  muteButton.addEventListener("click", () => {
    video.muted = !video.muted;
    updateMuteButton();
    persistPreferences();
  });

  function updateMuteButton() {
    if (video.muted) {
      muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
      muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
  }

  // Volume Control
  volumeSlider.addEventListener("input", (e) => {
    video.volume = parseFloat((e.target as HTMLInputElement).value);
    if (video.volume === 0) {
      video.muted = true;
    } else {
      video.muted = false;
    }
    updateMuteButton();
    persistPreferences();
  });

  function persistPreferences(): void {
    setPlayerPreferences({
      volume: video.volume,
      muted: video.muted,
    });
  }

  video.addEventListener("play", () => {
    playerStatus.textContent = "Live playback in progress.";
  });

  video.addEventListener("waiting", () => {
    playerStatus.textContent = "Buffering stream...";
  });

  video.addEventListener("error", () => {
    playerStatus.textContent = "Playback hit an error. Try another stream.";
  });

  window.addEventListener("channel:play", (event: Event) => {
    const detail = (event as CustomEvent<{ name: string }>).detail;
    currentChannelName.textContent = detail?.name || "Now playing";
    playerStatus.textContent = "Connecting to stream...";
  });

  resumeButton?.addEventListener("click", () => {
    if (!lastPlayedChannel) {
      return;
    }

    playChannel(lastPlayedChannel.url, lastPlayedChannel.name);
  });

  updateMuteButton();

  return container;
}
