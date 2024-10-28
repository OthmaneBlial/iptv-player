export function Sidebar(): HTMLElement {
  const aside = document.createElement("aside");
  aside.id = "sidebar";
  aside.innerHTML = `
    <div class="playlist-input">
      <input type="text" id="playlistUrl" placeholder="Enter M3U/M3U8 URL" />
      <button id="importPlaylist">
        <i class="fas fa-download"></i> Load
      </button>
    </div>
    <div class="sections">
      <!-- Channels Section -->
      <div class="section">
        <div class="list-title" data-target="channelsList">
          Channels (<span id="channelCount">0</span>) <i class="fas fa-chevron-down"></i>
        </div>
        <input type="text" id="searchChannels" class="search-input" placeholder="Search Channels" />
        <ul class="channel-list collapsed" id="channelsList">
          <!-- Channels will be populated here -->
        </ul>
      </div>
      <!-- Favorites Section -->
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
