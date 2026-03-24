import { getLastPlayedChannel } from "../utils/storage";

export function Player(): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("player-container");
  const lastPlayedChannel = getLastPlayedChannel();
  container.innerHTML = `
    <div class="controls">
      <div class="controls-row">
        <button id="toggleQuickSwitch" class="toolbar-button" aria-label="Open quick switch">
          <i class="fas fa-bolt"></i> Quick Switch
        </button>
        <button id="fullscreenButton" class="toolbar-button" aria-label="Toggle fullscreen" aria-keyshortcuts="f">
          <i class="fas fa-expand"></i> Fullscreen
        </button>
      </div>

      <div class="controls-row controls-row--end">
        <div class="volume-control">
          <button id="muteButton" class="toolbar-button toolbar-button--icon" aria-label="Toggle mute" aria-keyshortcuts="m">
            <i class="fas fa-volume-up"></i>
          </button>
          <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="1" aria-label="Player volume" />
        </div>

        <details class="player-tools-menu">
          <summary class="toolbar-button">
            <i class="fas fa-sliders"></i> Tools
          </summary>
          <div class="player-tools-panel">
            <button id="pipButton" type="button" aria-label="Toggle picture in picture" aria-keyshortcuts="Shift+P">
              <i class="fas fa-window-restore"></i> Picture in Picture
            </button>
            <button id="retryPlayback" type="button" aria-label="Retry playback" aria-keyshortcuts="r">
              <i class="fas fa-rotate-right"></i> Retry Playback
            </button>
            <button id="reportCurrentStream" type="button" aria-label="Report current stream issue">
              <i class="fas fa-triangle-exclamation"></i> Report Stream
            </button>
            <button id="toggleMiniPlayer" type="button" aria-label="Toggle mini player">
              <i class="fas fa-up-right-and-down-left-from-center"></i> Mini Player
            </button>
            <button id="toggleMultiview" type="button" aria-label="Toggle multiview mode">
              <i class="fas fa-table-cells-large"></i> Multiview
            </button>
            <button id="addCurrentToMultiview" type="button" aria-label="Add current channel to multiview">
              <i class="fas fa-plus"></i> Add Current
            </button>

            <label class="player-tools-field" for="qualitySelect">
              <span>Quality</span>
              <select id="qualitySelect" class="player-select" aria-label="Video quality">
                <option value="-1">Auto Quality</option>
              </select>
            </label>

            <label class="player-tools-field" for="audioTrackSelect">
              <span>Audio</span>
              <select id="audioTrackSelect" class="player-select" aria-label="Audio track">
                <option value="-1">Default Audio</option>
              </select>
            </label>

            <label class="player-tools-field" for="multiviewLayout">
              <span>Wall Layout</span>
              <select id="multiviewLayout" class="player-select" aria-label="Multiview layout">
                <option value="2">2-Up</option>
                <option value="4">4-Up</option>
              </select>
            </label>
          </div>
        </details>
      </div>
    </div>

    <div class="player-side-panels">
      <details class="player-guide-panel">
        <summary class="toolbar-button">
          <i class="fas fa-calendar-days"></i> Guide
        </summary>
        <div id="guideDrawer" class="guide-drawer" aria-label="Guide drawer"></div>
      </details>
    </div>

    <div class="player-overlay">
      <div class="player-meta">
        <div class="player-meta-top">
          <p class="player-kicker">Live Now</p>
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
          <p id="guideNextPlaying">Import XMLTV data to unlock now and next programme details.</p>
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

    <div id="quickSwitchOverlay" class="quick-switch-overlay" aria-label="Quick switch overlay" hidden></div>
    <div id="multiviewGrid" class="multiview-grid" aria-label="Multiview grid" hidden></div>
    <video id="videoPlayer" controls aria-label="Video player"></video>
  `;

  return container;
}
