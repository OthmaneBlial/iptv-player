import { getLastPlayedChannel } from "../utils/storage";

export function Player(): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("player-container");
  const lastPlayedChannel = getLastPlayedChannel();
  container.setAttribute("data-player-state", "idle");
  container.setAttribute("data-has-channel", lastPlayedChannel ? "true" : "false");

  container.innerHTML = `
    <div class="player-stage">
      <video id="videoPlayer" controls aria-label="Video player"></video>
    </div>

    <div class="player-controls">
      <div class="controls-left">
        <button id="toggleQuickSwitch" class="control-btn" aria-label="Quick switch">
          <i class="fas fa-bolt"></i>
        </button>
        <button id="pipButton" class="control-btn" aria-label="Picture in picture">
          <i class="fas fa-window-restore"></i>
        </button>
        <button id="toggleMultiview" class="control-btn" aria-label="Multiview">
          <i class="fas fa-table-cells-large"></i>
        </button>
      </div>

      <div class="controls-center">
        <button id="retryPlayback" class="control-btn control-btn--large" aria-label="Retry playback">
          <i class="fas fa-rotate"></i>
        </button>
      </div>

      <div class="controls-right">
        <label class="select-pill" aria-label="Video quality">
          <span>Video</span>
          <select id="qualitySelect">
            <option value="-1">Auto Quality</option>
          </select>
        </label>

        <label class="select-pill" aria-label="Audio track">
          <span>Audio</span>
          <select id="audioTrackSelect">
            <option value="-1">Default Audio</option>
          </select>
        </label>

        <div class="volume-control">
          <button id="muteButton" class="control-btn" aria-label="Toggle mute">
            <i class="fas fa-volume-high"></i>
          </button>
          <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
        </div>

        <button id="reportCurrentStream" class="control-btn" aria-label="Report current stream">
          <i class="fas fa-flag"></i>
        </button>
        <button id="fullscreenButton" class="control-btn" aria-label="Fullscreen">
          <i class="fas fa-expand"></i>
        </button>

        <button class="control-btn" id="moreButton" aria-label="More options">
          <i class="fas fa-ellipsis"></i>
        </button>
      </div>
    </div>

    <div class="player-overlay">
      <div class="player-state-card">
        <div class="player-state-visual" aria-hidden="true">
          <span class="player-status-orb"></span>
          <span class="player-status-spinner"></span>
        </div>

        <div class="channel-info">
          <div class="player-status-strip">
            <span class="player-chip" id="playerStatusBadge">STANDBY</span>
            <span class="player-chip player-chip--secondary" id="playerNetworkBadge">Online</span>
            <span class="player-chip player-chip--ghost" id="playerRetriesBadge">Retries 0/2</span>
          </div>

          <div class="channel-meta">
            <span class="live-badge">Control Room</span>
            <span class="channel-name" id="currentChannelName">${
              lastPlayedChannel?.name || "Select a channel to start watching"
            }</span>
          </div>

          <p class="channel-status" id="playerStatus" aria-live="polite">${
            lastPlayedChannel
              ? "Ready to resume your last channel."
              : "Load a playlist, pick a channel, and the player will light up here."
          }</p>
        </div>

        <div class="player-overlay-actions">
          <button id="resumeLastChannel" class="resume-btn" ${
            lastPlayedChannel ? "" : "hidden"
          } aria-label="Resume last channel">
            <i class="fas fa-play"></i>
            <span>Resume</span>
          </button>
        </div>
      </div>
    </div>

    <div id="quickSwitchOverlay" class="quick-switch-panel" aria-label="Quick switch" hidden>
      <div class="panel-header">
        <h3>Quick Switch</h3>
        <button class="close-btn" id="closeQuickSwitch" aria-label="Close">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="quick-switch-grid" id="quickSwitchGrid"></div>
    </div>

    <div id="multiviewGrid" class="multiview-grid" aria-label="Multiview grid" hidden></div>

    <div class="guide-panel" id="guidePanel" hidden>
      <div class="panel-header">
        <h3>Program Guide</h3>
        <button class="close-btn" id="closeGuide" aria-label="Close">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="guide-content" id="guideContent"></div>
    </div>
  `;

  return container;
}
