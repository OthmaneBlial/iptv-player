import { PLAYLIST_PRESETS } from "../utils/playlistPresets";

export function Sidebar(): HTMLElement {
  const aside = document.createElement("aside");
  const presetOptions = PLAYLIST_PRESETS.map(
    (preset) =>
      `<option value="${preset.id}">${preset.label} - ${preset.description}</option>`
  ).join("");
  aside.id = "sidebar";
  aside.innerHTML = `
    <!-- Brand Header -->
    <div class="sidebar-header">
      <div class="brand">
        <div class="brand-icon">
          <i class="fas fa-play"></i>
        </div>
        <h1>Streamflow</h1>
      </div>
      <button class="theme-toggle" id="toggleTheme" aria-label="Toggle theme">
        <i class="fas fa-moon"></i>
      </button>
    </div>

    <!-- Playlist URL Input -->
    <div class="input-card">
      <label for="playlistUrl">Playlist URL</label>
      <div class="input-row">
        <input
          type="text"
          id="playlistUrl"
          placeholder="Paste M3U/M3U8 URL..."
          aria-label="Playlist URL"
          autocomplete="url"
        />
        <button id="importPlaylist" type="button" aria-label="Load playlist">
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      <div class="preset-stack">
        <label for="playlistPreset">Quick Sources</label>
        <div class="preset-row">
          <select
            id="playlistPreset"
            class="select-input preset-select"
            aria-label="Choose a preset playlist source"
          >
            ${presetOptions}
          </select>
          <button id="loadPlaylistPreset" type="button" class="btn-secondary">
            Load
          </button>
        </div>
        <p class="preset-hint">
          Built-in demo plus public playlists. Import is reliable; individual channels can still be dead or geo-blocked.
        </p>
      </div>
      <p id="playlistFeedback" class="feedback" role="status" aria-live="polite">
        Load a playlist to start watching.
      </p>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <i class="fas fa-search"></i>
      <input
        type="search"
        id="searchChannels"
        placeholder="Search channels..."
        aria-label="Search channels"
      />
    </div>

    <!-- Channel List Container (Main Content) -->
    <div class="content-area">
      <div class="filter-chips" id="channelGroupChips"></div>
      <ul class="channel-list" id="channelsList"></ul>
    </div>

    <!-- Bottom Tabs -->
    <div class="bottom-tabs">
      <button class="tab-btn active" data-tab="channels" role="tab" aria-selected="true">
        <i class="fas fa-tv"></i>
      </button>
      <button class="tab-btn" data-tab="favorites" role="tab" aria-selected="false">
        <i class="fas fa-heart"></i>
      </button>
      <button class="tab-btn" data-tab="history" role="tab" aria-selected="false">
        <i class="fas fa-clock-rotate-left"></i>
      </button>
      <button class="tab-btn" id="settingsBtn" aria-label="Settings">
        <i class="fas fa-gear"></i>
      </button>
    </div>

    <!-- Settings Panel (Modal) -->
    <div class="settings-panel" id="settingsPanel" hidden>
      <div class="settings-backdrop" id="settingsBackdrop"></div>
      <div class="settings-content">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn" id="closeSettings" aria-label="Close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div class="settings-sections">
          <!-- Quick Settings -->
          <section class="settings-section">
            <h3>Quick Settings</h3>

            <div class="settings-field">
              <label for="profileSelect">Viewing Profile</label>
              <select id="profileSelect" class="select-input" aria-label="Active profile"></select>
            </div>

            <div class="filter-row">
              <select id="channelGroupFilter" class="filter-select" aria-label="Filter by category">
                <option value="all">All Categories</option>
              </select>
              <select id="channelCountryFilter" class="filter-select" aria-label="Filter by country">
                <option value="all">All Countries</option>
              </select>
              <select id="channelSort" class="filter-select" aria-label="Sort channels">
                <option value="name">A-Z</option>
              </select>
            </div>
          </section>

          <!-- Advanced Settings -->
          <details class="settings-advanced">
            <summary>
              <h3>Advanced Settings</h3>
              <i class="fas fa-chevron-down"></i>
            </summary>

            <div class="advanced-content">
              <!-- Playlist Sources -->
              <section class="settings-section">
                <h4><i class="fas fa-list"></i> Playlist Sources</h4>
                <div class="settings-field">
                  <label for="rawPlaylistInput">Raw Playlist</label>
                  <textarea
                    id="rawPlaylistInput"
                    rows="4"
                    placeholder="#EXTM3U&#10;#EXTINF:-1,Channel Name&#10;https://example.com/stream.m3u8"
                    aria-label="Raw playlist content"
                  ></textarea>
                  <div class="settings-actions">
                    <label class="btn-secondary" for="playlistFile">
                      <i class="fas fa-file-import"></i> Import File
                    </label>
                    <input type="file" id="playlistFile" accept=".m3u,.m3u8,text/plain" hidden />
                    <button id="loadRawPlaylist" class="btn-primary">
                      <i class="fas fa-paste"></i> Load
                    </button>
                  </div>
                </div>

                <div class="playlist-library">
                  <div class="library-header">
                    <span>Saved Playlists</span>
                    <div class="library-actions">
                      <button id="exportPlaylistLibrary" class="icon-btn" aria-label="Export library">
                        <i class="fas fa-download"></i>
                      </button>
                      <label class="icon-btn" for="importPlaylistLibraryFile">
                        <i class="fas fa-upload"></i>
                      </label>
                      <input type="file" id="importPlaylistLibraryFile" accept="application/json" hidden />
                    </div>
                  </div>
                  <ul id="playlistLibraryList" class="library-list"></ul>
                </div>
              </section>

              <!-- EPG & Sync -->
              <section class="settings-section">
                <h4><i class="fas fa-calendar"></i> Guide & Sync</h4>
                <div class="settings-field">
                  <label for="epgUrl">EPG XMLTV URL</label>
                  <div class="input-row">
                    <input type="text" id="epgUrl" placeholder="Enter XMLTV URL" aria-label="EPG URL" />
                    <button id="loadEpgUrl" class="btn-secondary">
                      <i class="fas fa-download"></i>
                    </button>
                  </div>
                  <div class="settings-actions">
                    <label class="btn-secondary" for="epgFile">
                      <i class="fas fa-file-arrow-up"></i> Import EPG File
                    </label>
                    <input type="file" id="epgFile" accept=".xml,.xmltv,text/xml" hidden />
                  </div>
                </div>

                <div class="settings-field">
                  <label>Cloud Sync</label>
                  <div class="input-row">
                    <input
                      type="password"
                      id="syncToken"
                      placeholder="GitHub token"
                      aria-label="GitHub token"
                      autocomplete="current-password"
                    />
                  </div>
                  <div class="input-row">
                    <input
                      type="text"
                      id="syncGistId"
                      placeholder="Gist ID (optional)"
                      aria-label="Gist ID"
                    />
                  </div>
                  <div class="settings-actions">
                    <button id="pushCloudSync" class="btn-secondary">
                      <i class="fas fa-cloud-arrow-up"></i> Push
                    </button>
                    <button id="pullCloudSync" class="btn-secondary">
                      <i class="fas fa-cloud-arrow-down"></i> Pull
                    </button>
                  </div>
                  <p id="syncFeedback" class="feedback" role="status"></p>
                </div>
              </section>

              <!-- System -->
              <section class="settings-section">
                <h4><i class="fas fa-wrench"></i> System</h4>
                <div class="settings-actions">
                  <button id="scanSourceHealth" class="btn-secondary">
                    <i class="fas fa-heart-pulse"></i> Scan Sources
                  </button>
                  <button id="exportDiagnostics" class="btn-secondary">
                    <i class="fas fa-file-export"></i> Export Logs
                  </button>
                </div>
                <ul class="diagnostics-list" id="diagnosticsList"></ul>
              </section>
            </div>
          </details>
        </div>
      </div>
    </div>
  `;

  return aside;
}
