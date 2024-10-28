import Hls from "hls.js";
import { addToHistory } from "../utils/history";

export function Player(): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("player-container");
  container.innerHTML = `
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

  // PiP Functionality
  pipButton.addEventListener("click", async () => {
    try {
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
  });

  // Expose playChannel globally
  (window as any).playChannel = function playChannel(
    url: string,
    channelName: string
  ) {
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        video.play();
      });
    } else {
      alert("Your browser does not support HLS playback.");
    }
    addToHistory(channelName, url);
  };

  return container;
}
