export function Sidebar(): HTMLElement {
  const aside = document.createElement("aside");
  aside.id = "sidebar";
  aside.innerHTML = `
    <div class="playlist-input">
      <div class="import-block">
        <label for="playlistUrl">Playlist URL</label>
        <div class="import-row">
          <input type="text" id="playlistUrl" placeholder="Enter M3U/M3U8 URL" aria-label="Playlist URL" />
          <button id="importPlaylist" aria-label="Load playlist from URL">
            <i class="fas fa-download"></i> Load URL
          </button>
        </div>
      </div>
      <div class="import-block">
        <label for="rawPlaylistInput">Raw Playlist</label>
        <textarea id="rawPlaylistInput" rows="6" placeholder="#EXTM3U&#10;#EXTINF:-1,Sample Channel&#10;https://example.com/live.m3u8" aria-label="Raw playlist content"></textarea>
        <div class="import-row import-row--compact">
          <label class="file-import-button" for="playlistFile">
            <i class="fas fa-file-import"></i> Import File
          </label>
          <input type="file" id="playlistFile" accept=".m3u,.m3u8,text/plain" />
          <button id="loadRawPlaylist">
            <i class="fas fa-paste"></i> Load Text
          </button>
        </div>
      </div>
      <div id="playlistDropZone" class="playlist-dropzone" tabindex="0" role="button" aria-label="Drop playlist file here">
        <i class="fas fa-cloud-upload-alt"></i>
        <span>Drop a playlist file here</span>
      </div>
      <p id="playlistFeedback" class="playlist-feedback" data-tone="neutral" role="status" aria-live="polite">
        Load a playlist from URL, local file, or pasted content.
      </p>
      <div class="import-block">
        <label for="epgUrl">EPG XMLTV</label>
        <div class="import-row">
          <input type="text" id="epgUrl" placeholder="Enter XMLTV guide URL" aria-label="EPG XMLTV URL" />
          <button id="loadEpgUrl" aria-label="Load EPG from URL">
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
          Import XMLTV data to see now/next programming and schedule details.
        </p>
      </div>
    </div>
    <div class="playlist-library-panel">
      <div class="playlist-library-header">
        <div>
          <p class="playlist-library-kicker">Library</p>
          <h2>Saved Playlists</h2>
        </div>
        <div class="playlist-library-tools">
          <button id="exportPlaylistLibrary" class="library-tool-button">
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
    <div class="sections">
      <!-- Channels Section -->
      <div class="section">
        <button class="list-title" type="button" data-target="channelsList" aria-expanded="false">
          Channels (<span id="channelCount">0</span>) <i class="fas fa-chevron-down"></i>
        </button>
        <input type="text" id="searchChannels" class="search-input" placeholder="Search Channels" aria-label="Search channels" />
        <div class="channel-discovery">
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
              <option value="recent">Recently Watched</option>
              <option value="favorites">Favorites First</option>
              <option value="group">Group Order</option>
            </select>
          </div>
          <div id="channelGroupChips" class="channel-group-chips"></div>
        </div>
        <ul class="channel-list collapsed" id="channelsList">
          <!-- Channels will be populated here -->
        </ul>
      </div>
      <!-- Favorites Section -->
      <div class="section">
        <button class="list-title" type="button" data-target="diagnosticsList" aria-expanded="false">
          Diagnostics <i class="fas fa-chevron-down"></i>
        </button>
        <button id="exportDiagnostics" class="clear-button">
          <i class="fas fa-file-export"></i> Export Logs
        </button>
        <ul class="history-list collapsed" id="diagnosticsList">
          <!-- Diagnostics will be populated here -->
        </ul>
      </div>
      <div class="section">
        <button class="list-title" type="button" data-target="guideProgramsList" aria-expanded="false">
          Guide <i class="fas fa-chevron-down"></i>
        </button>
        <ul class="history-list collapsed" id="guideProgramsList">
          <!-- Guide programs will be populated here -->
        </ul>
      </div>
      <div class="section">
        <button class="list-title" type="button" data-target="pinnedList" aria-expanded="false">
          Pinned <i class="fas fa-chevron-down"></i>
        </button>
        <ul class="favorites-list collapsed" id="pinnedList">
          <!-- Pinned channels will be populated here -->
        </ul>
      </div>
      <div class="section">
        <button class="list-title" type="button" data-target="favoritesList" aria-expanded="false">
          Favorites <i class="fas fa-chevron-down"></i>
        </button>
        <ul class="favorites-list collapsed" id="favoritesList">
          <!-- Favorites will be populated here -->
        </ul>
      </div>
      <!-- History Section -->
      <div class="section">
        <button class="list-title" type="button" data-target="historyList" aria-expanded="false">
          History <i class="fas fa-chevron-down"></i>
        </button>
        <ul class="history-list collapsed" id="historyList">
          <!-- History will be populated here -->
        </ul>
        <button id="clearHistory" class="clear-button" aria-label="Clear watch history">
          <i class="fas fa-trash"></i> Clear History
        </button>
      </div>
    </div>
  `;
  return aside;
}
