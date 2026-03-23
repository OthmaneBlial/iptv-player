import { getLastPlayedChannel } from "../utils/storage";

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

  return container;
}
