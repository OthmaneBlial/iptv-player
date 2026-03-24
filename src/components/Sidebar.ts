export function Sidebar(): HTMLElement {
  const aside = document.createElement("aside");
  aside.id = "sidebar";
  aside.innerHTML = `
    <div class="sidebar-hero">
      <div class="sidebar-hero__copy">
        <p class="sidebar-eyebrow">Watch-first workspace</p>
        <h1>IPTV Player</h1>
        <p class="sidebar-summary">
          Load a playlist, search fast, and keep advanced tools tucked away until you need them.
        </p>
      </div>
      <button class="theme-toggle" id="toggleTheme" type="button" aria-label="Toggle theme">
        <i class="fas fa-moon"></i> Dark
      </button>
    </div>

    <div class="sidebar-status-card">
      <div class="status-row">
        <span class="status-label">Active Playlist</span>
        <strong id="headerPlaylistName">No playlist</strong>
      </div>
      <div class="status-grid">
        <div class="status-chip">
          <span class="status-chip__label">Channels</span>
          <strong id="headerChannelCountValue">0</strong>
        </div>
        <div class="status-chip">
          <span class="status-chip__label">Guide</span>
          <strong id="headerGuideStatus">Not loaded</strong>
        </div>
        <div class="status-chip status-chip--wide">
          <span class="status-chip__label">Profile</span>
          <strong id="headerProfileStatus">Owner • Open</strong>
        </div>
      </div>
    </div>

    <div class="playlist-input playlist-import-card">
      <div class="import-block">
        <label for="playlistUrl">Playlist URL</label>
        <div class="import-row">
          <input
            type="text"
            id="playlistUrl"
            placeholder="https://iptv-org.github.io/iptv/index.m3u"
            aria-label="Playlist URL"
            autocomplete="url"
          />
          <button id="importPlaylist" type="button" aria-label="Load playlist from URL">
            <i class="fas fa-download"></i> Load
          </button>
        </div>
        <p id="playlistFeedback" class="playlist-feedback" data-tone="neutral" role="status" aria-live="polite">
          Load a playlist from a remote URL to start browsing.
        </p>
      </div>
    </div>

    <section class="channel-browser" aria-label="Channel browser">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Browse</p>
          <h2>
            Channels
            <span id="channelCount">0</span>
          </h2>
        </div>
      </div>

      <input
        type="search"
        id="searchChannels"
        class="search-input"
        placeholder="Search channels, groups, countries..."
        aria-label="Search channels"
      />

      <div id="channelGroupChips" class="channel-group-chips"></div>

      <details class="sidebar-panel sidebar-panel--filters">
        <summary>Filters & Sort</summary>
        <div class="sidebar-panel__content">
          <div class="channel-filter-grid">
            <select id="channelGroupFilter" class="channel-filter-select" aria-label="Filter channels by category">
              <option value="all">All Categories</option>
            </select>
            <select id="channelCountryFilter" class="channel-filter-select" aria-label="Filter channels by country">
              <option value="all">All Countries</option>
            </select>
            <select id="channelLanguageFilter" class="channel-filter-select" aria-label="Filter channels by language">
              <option value="all">All Languages</option>
            </select>
            <select id="channelSort" class="channel-filter-select" aria-label="Sort channels">
              <option value="name">A-Z</option>
              <option value="health">Source Health</option>
              <option value="recent">Recently Watched</option>
              <option value="favorites">Favorites First</option>
              <option value="group">Group Order</option>
            </select>
          </div>
        </div>
      </details>

      <ul class="channel-list" id="channelsList">
        <!-- Channels will be populated here -->
      </ul>
    </section>

    <div class="sidebar-stack">
      <details class="sidebar-panel">
        <summary>Collections</summary>
        <div class="sidebar-panel__content">
          <details class="nested-panel">
            <summary>For You</summary>
            <div class="nested-panel__content">
              <ul class="history-list personalized-sections" id="personalizedSections">
                <!-- Personalized recommendations render here -->
              </ul>
            </div>
          </details>

          <details class="nested-panel">
            <summary>Pinned</summary>
            <div class="nested-panel__content">
              <ul class="favorites-list" id="pinnedList">
                <!-- Pinned channels will be populated here -->
              </ul>
            </div>
          </details>

          <details class="nested-panel">
            <summary>Favorites</summary>
            <div class="nested-panel__content">
              <ul class="favorites-list" id="favoritesList">
                <!-- Favorites will be populated here -->
              </ul>
            </div>
          </details>

          <details class="nested-panel">
            <summary>History</summary>
            <div class="nested-panel__content">
              <ul class="history-list" id="historyList">
                <!-- History will be populated here -->
              </ul>
              <button id="clearHistory" class="clear-button" type="button" aria-label="Clear watch history">
                <i class="fas fa-trash"></i> Clear History
              </button>
            </div>
          </details>
        </div>
      </details>

      <details class="sidebar-panel">
        <summary>Settings</summary>
        <div class="sidebar-panel__content">
          <details class="nested-panel">
            <summary>Playlist Sources</summary>
            <div class="nested-panel__content">
              <div class="playlist-input playlist-input--nested">
                <div class="import-block">
                  <label for="rawPlaylistInput">Raw Playlist</label>
                  <textarea
                    id="rawPlaylistInput"
                    rows="6"
                    placeholder="#EXTM3U&#10;#EXTINF:-1,Sample Channel&#10;https://example.com/live.m3u8"
                    aria-label="Raw playlist content"
                  ></textarea>
                  <div class="import-row import-row--compact">
                    <label class="file-import-button" for="playlistFile">
                      <i class="fas fa-file-import"></i> Import File
                    </label>
                    <input type="file" id="playlistFile" accept=".m3u,.m3u8,text/plain" />
                    <button id="loadRawPlaylist" type="button">
                      <i class="fas fa-paste"></i> Load Text
                    </button>
                  </div>
                </div>

                <div
                  id="playlistDropZone"
                  class="playlist-dropzone"
                  tabindex="0"
                  role="button"
                  aria-label="Drop playlist file here"
                >
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>Drop a playlist file here or tap to import one.</span>
                </div>
              </div>

              <div class="playlist-library-panel">
                <div class="playlist-library-header">
                  <div>
                    <p class="playlist-library-kicker">Library</p>
                    <h2>Saved Playlists</h2>
                  </div>
                  <div class="playlist-library-tools">
                    <button id="exportPlaylistLibrary" class="library-tool-button" type="button">
                      Export
                    </button>
                    <label class="library-tool-button" for="importPlaylistLibraryFile">
                      Import Backup
                    </label>
                    <input
                      type="file"
                      id="importPlaylistLibraryFile"
                      accept="application/json"
                    />
                  </div>
                </div>
                <ul id="playlistLibraryList" class="playlist-library-list"></ul>
              </div>
            </div>
          </details>

          <details class="nested-panel">
            <summary>Guide & Sync</summary>
            <div class="nested-panel__content">
              <div class="playlist-input playlist-input--nested">
                <div class="import-block">
                  <label for="epgUrl">EPG XMLTV</label>
                  <div class="import-row">
                    <input type="text" id="epgUrl" placeholder="Enter XMLTV guide URL" aria-label="EPG XMLTV URL" />
                    <button id="loadEpgUrl" type="button" aria-label="Load EPG from URL">
                      <i class="fas fa-tv"></i> Load EPG
                    </button>
                  </div>
                  <div class="import-row import-row--compact">
                    <label class="file-import-button" for="epgFile">
                      <i class="fas fa-file-arrow-up"></i> Import EPG File
                    </label>
                    <input type="file" id="epgFile" accept=".xml,.xmltv,text/xml,application/xml" />
                  </div>
                  <p id="epgFeedback" class="playlist-feedback" data-tone="neutral" role="status" aria-live="polite">
                    Import XMLTV data to unlock now and next programme details.
                  </p>
                </div>

                <details class="nested-panel nested-panel--soft">
                  <summary>Guide Timeline</summary>
                  <div class="nested-panel__content">
                    <ul class="history-list" id="guideProgramsList">
                      <!-- Guide programs will be populated here -->
                    </ul>
                  </div>
                </details>

                <div class="import-block">
                  <label for="syncToken">Cloud Sync</label>
                  <form id="syncForm" class="sync-form">
                    <input
                      type="password"
                      id="syncToken"
                      placeholder="GitHub token for private gist sync"
                      aria-label="GitHub token for cloud sync"
                      autocomplete="current-password"
                    />
                    <input
                      type="text"
                      id="syncGistId"
                      placeholder="Existing gist ID or leave empty to create one"
                      aria-label="GitHub gist identifier"
                      autocomplete="off"
                    />
                    <div class="import-row import-row--compact">
                      <button id="pushCloudSync" type="button">
                        <i class="fas fa-cloud-arrow-up"></i> Push Sync
                      </button>
                      <button id="pullCloudSync" type="button">
                        <i class="fas fa-cloud-arrow-down"></i> Pull Sync
                      </button>
                    </div>
                  </form>
                  <p id="syncFeedback" class="playlist-feedback" data-tone="neutral" role="status" aria-live="polite">
                    Local-first mode is active. Add a GitHub token to sync through a private gist.
                  </p>
                </div>

                <div class="install-actions">
                  <div class="install-status" id="installStatus">Use your browser menu to install</div>
                  <button class="library-tool-button" id="installAppButton" type="button" hidden>
                    <i class="fas fa-download"></i> Install App
                  </button>
                </div>
              </div>
            </div>
          </details>

          <details class="nested-panel">
            <summary>Profiles</summary>
            <div class="nested-panel__content">
              <div class="profile-controls-panel">
                <label for="profileSelect">Viewing Profile</label>
                <select id="profileSelect" class="channel-filter-select" aria-label="Active viewing profile"></select>
                <button class="library-tool-button" id="toggleProfileAccess" type="button" hidden>
                  Unlock Filters
                </button>
              </div>
            </div>
          </details>

          <details class="nested-panel">
            <summary>System</summary>
            <div class="nested-panel__content">
              <div class="section-inline-tools">
                <button id="scanSourceHealth" class="playlist-action-button" type="button">
                  <i class="fas fa-heart-pulse"></i> Scan Active Playlist
                </button>
                <button id="exportDiagnostics" class="playlist-action-button" type="button">
                  <i class="fas fa-file-export"></i> Export Logs
                </button>
              </div>
              <p id="sourceHealthFeedback" class="playlist-feedback" data-tone="neutral" role="status" aria-live="polite">
                Validate the active playlist and report dead channels to keep trusted streams on top.
              </p>
              <ul class="history-list" id="sourceHealthList">
                <!-- Source health checks render here -->
              </ul>
              <ul class="history-list" id="diagnosticsList">
                <!-- Diagnostics will be populated here -->
              </ul>
            </div>
          </details>
        </div>
      </details>
    </div>
  `;
  return aside;
}
