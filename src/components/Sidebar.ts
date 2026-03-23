export function Sidebar(): HTMLElement {
  const aside = document.createElement("aside");
  aside.id = "sidebar";
  aside.innerHTML = `
    <div class="playlist-input">
      <div class="import-block">
        <label for="playlistUrl">Playlist URL</label>
        <div class="import-row">
          <input type="text" id="playlistUrl" placeholder="Enter M3U/M3U8 URL" />
          <button id="importPlaylist">
            <i class="fas fa-download"></i> Load URL
          </button>
        </div>
      </div>
      <div class="import-block">
        <label for="rawPlaylistInput">Raw Playlist</label>
        <textarea id="rawPlaylistInput" rows="6" placeholder="#EXTM3U&#10;#EXTINF:-1,Sample Channel&#10;https://example.com/live.m3u8"></textarea>
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
      <div id="playlistDropZone" class="playlist-dropzone" tabindex="0">
        <i class="fas fa-cloud-upload-alt"></i>
        <span>Drop a playlist file here</span>
      </div>
      <p id="playlistFeedback" class="playlist-feedback" data-tone="neutral">
        Load a playlist from URL, local file, or pasted content.
      </p>
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
        <div class="list-title" data-target="channelsList">
          Channels (<span id="channelCount">0</span>) <i class="fas fa-chevron-down"></i>
        </div>
        <input type="text" id="searchChannels" class="search-input" placeholder="Search Channels" />
        <div class="channel-discovery">
          <div class="channel-filter-grid">
            <select id="channelGroupFilter" class="channel-filter-select">
              <option value="all">All Categories</option>
            </select>
            <select id="channelCountryFilter" class="channel-filter-select">
              <option value="all">All Countries</option>
            </select>
            <select id="channelLanguageFilter" class="channel-filter-select">
              <option value="all">All Languages</option>
            </select>
            <select id="channelSort" class="channel-filter-select">
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
        <div class="list-title" data-target="pinnedList">
          Pinned <i class="fas fa-chevron-down"></i>
        </div>
        <ul class="favorites-list collapsed" id="pinnedList">
          <!-- Pinned channels will be populated here -->
        </ul>
      </div>
      <div class="section">
        <div class="list-title" data-target="favoritesList">
          Favorites <i class="fas fa-chevron-down"></i>
        </div>
        <ul class="favorites-list collapsed" id="favoritesList">
          <!-- Favorites will be populated here -->
        </ul>
      </div>
      <!-- History Section -->
      <div class="section">
        <div class="list-title" data-target="historyList">
          History <i class="fas fa-chevron-down"></i>
        </div>
        <ul class="history-list collapsed" id="historyList">
          <!-- History will be populated here -->
        </ul>
        <button id="clearHistory" class="clear-button">
          <i class="fas fa-trash"></i> Clear History
        </button>
      </div>
    </div>
  `;
  return aside;
}
