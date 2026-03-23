import { getLastPlayedChannel } from "../utils/storage";

export function Player(): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("player-container");
  const lastPlayedChannel = getLastPlayedChannel();
  container.innerHTML = `
    <div class="player-overlay">
      <div class="player-meta">
        <div class="player-meta-top">
          <p class="player-kicker">Stream Deck</p>
          <div class="player-badges">
            <span id="playerStatusBadge" class="player-badge" aria-live="polite">Idle</span>
            <span id="playerNetworkBadge" class="player-badge" aria-live="polite">Online</span>
            <span id="playerRetriesBadge" class="player-badge" aria-live="polite">Retries 0</span>
          </div>
        </div>
        <h2 id="currentChannelName">${
          lastPlayedChannel?.name || "Select a channel to start watching"
        }</h2>
        <p id="playerStatus" role="status" aria-live="polite">${
          lastPlayedChannel
            ? "Ready to resume your last channel."
            : "Load a playlist, browse channels, and start playback."
        }</p>
        <div class="player-guide-summary">
          <p id="guideNowPlaying">No guide loaded.</p>
          <p id="guideNextPlaying">Import XMLTV data to see now/next program details.</p>
        </div>
      </div>
      <button id="resumeLastChannel" class="resume-button" aria-label="Resume last played channel"${
        lastPlayedChannel ? "" : " hidden"
      }>
        ${
          lastPlayedChannel
            ? `Resume ${lastPlayedChannel.name}`
            : "Resume last channel"
        }
      </button>
    </div>
    <div class="controls">
      <button id="pipButton" aria-label="Toggle picture in picture" aria-keyshortcuts="Shift+P">
        <i class="fas fa-window-restore"></i> PiP
      </button>
      <button id="fullscreenButton" aria-label="Toggle fullscreen" aria-keyshortcuts="f">
        <i class="fas fa-expand"></i> Fullscreen
      </button>
      <div class="volume-control">
        <button id="muteButton" aria-label="Toggle mute" aria-keyshortcuts="m">
          <i class="fas fa-volume-up"></i>
        </button>
        <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="1" aria-label="Player volume" />
      </div>
      <select id="qualitySelect" class="player-select" aria-label="Video quality">
        <option value="-1">Auto Quality</option>
      </select>
      <select id="audioTrackSelect" class="player-select" aria-label="Audio track">
        <option value="-1">Default Audio</option>
      </select>
      <button id="retryPlayback" aria-label="Retry playback" aria-keyshortcuts="r">
        <i class="fas fa-rotate-right"></i> Retry
      </button>
    </div>
    <div id="guideDrawer" class="guide-drawer" aria-label="Guide drawer"></div>
    <video id="videoPlayer" controls aria-label="Video player"></video>
  `;

  return container;
}
