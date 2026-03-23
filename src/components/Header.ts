export function Header(): HTMLElement {
  const header = document.createElement("header");
  header.id = "header";
  header.innerHTML = `
    <div class="header-brand">
      <div class="brand-mark">BC</div>
      <div>
        <p class="header-eyebrow">Live Streaming Workspace</p>
        <h1>Broadcast Console</h1>
        <p class="header-summary">
          Curate playlists, guide data, and watch collections from one control surface.
        </p>
      </div>
    </div>
    <div class="header-status">
      <div class="status-pill">
        <span class="status-label">Playlist</span>
        <strong id="headerPlaylistName">No playlist</strong>
      </div>
      <div class="status-pill">
        <span class="status-label">Channels</span>
        <strong id="headerChannelCountValue">0</strong>
      </div>
      <div class="status-pill">
        <span class="status-label">Guide</span>
        <strong id="headerGuideStatus">Not loaded</strong>
      </div>
    </div>
    <div class="header-actions">
      <div class="header-note" id="installStatus">Installable web app available</div>
      <button class="toggle-theme install-button" id="installAppButton" hidden>
        <i class="fas fa-download"></i> Install App
      </button>
      <button class="toggle-theme" id="toggleTheme">
        <i class="fas fa-moon"></i> Dark Mode
      </button>
    </div>
  `;
  return header;
}
