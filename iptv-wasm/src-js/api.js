/**
 * JavaScript API Layer for IPTV WASM
 * Handles network requests, IndexedDB storage, and bridges to WASM
 */

// IndexedDB wrapper for persistent storage
class IptvStorage {
  constructor() {
    this.dbName = 'iptv-player-db';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Playlist library store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistStore.createIndex('name', 'name', { unique: false });
        }

        // Favorites store
        if (!db.objectStoreNames.contains('favorites')) {
          const favoritesStore = db.createObjectStore('favorites', { keyPath: 'url' });
          favoritesStore.createIndex('addedAt', 'addedAt', { unique: false });
        }

        // History store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'url' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Source health store
        if (!db.objectStoreNames.contains('sourceHealth')) {
          const healthStore = db.createObjectStore('sourceHealth', { keyPath: 'url' });
          healthStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// API client for playlist operations
class IptvApi {
  constructor() {
    this.storage = new IptvStorage();
    this.wasm = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Initialize storage
    await this.storage.init();

    // Load WASM module
    try {
      const module = await import('./pkg/iptv_wasm.js');
      await module.default();
      this.wasm = module;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }

  /**
   * Fetch playlist from URL
   */
  async fetchPlaylist(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.statusText}`);
    }
    const data = await response.text();
    return this.wasm.parse_playlist(data, url);
  }

  /**
   * Parse playlist from text
   */
  async parsePlaylist(data, baseUrl = '') {
    return this.wasm.parse_playlist(data, baseUrl);
  }

  /**
   * Filter channels
   */
  async filterChannels(channels, filters) {
    const filter = {
      query: filters.query || '',
      country: filters.country || 'all',
      group: filters.group || 'all',
      language: filters.language || 'all',
      sort: filters.sort || 'name',
    };
    return this.wasm.filter_channels_js(channels, filter);
  }

  /**
   * Search channels with fuzzy matching
   */
  async searchChannels(channels, query) {
    return this.wasm.search_channels_js(channels, query);
  }

  /**
   * Get fuzzy score for a value
   */
  getFuzzyScore(value, query) {
    if (!this.wasm) return -1;
    return this.wasm.get_fuzzy_score(value, query);
  }

  /**
   * Get unique groups from channels
   */
  getUniqueGroups(channels) {
    if (!this.wasm) return [];
    return this.wasm.get_unique_groups(channels);
  }

  /**
   * Get unique countries from channels
   */
  getUniqueCountries(channels) {
    if (!this.wasm) return [];
    return this.wasm.get_unique_countries(channels);
  }

  /**
   * Get unique languages from channels
   */
  getUniqueLanguages(channels) {
    if (!this.wasm) return [];
    return this.wasm.get_unique_languages(channels);
  }

  /**
   * Sort channels by favorites
   */
  sortChannelsByFavorites(channels, favorites) {
    if (!this.wasm) return channels;
    return this.wasm.sort_channels_by_favorites(channels, favorites);
  }

  // Storage operations

  async getPlaylists() {
    return this.storage.getAll('playlists');
  }

  async savePlaylist(playlist) {
    return this.storage.put('playlists', playlist);
  }

  async deletePlaylist(id) {
    return this.storage.delete('playlists', id);
  }

  async getFavorites() {
    const favorites = await this.storage.getAll('favorites');
    return favorites.map(f => ({ url: f.url, addedAt: f.addedAt, pinned: f.pinned || false }));
  }

  async toggleFavorite(url, pinned = false) {
    const favorites = await this.getFavorites();
    const existing = favorites.find(f => f.url === url);

    if (existing) {
      await this.storage.delete('favorites', url);
      return false; // Removed
    } else {
      await this.storage.put('favorites', {
        url,
        addedAt: new Date().toISOString(),
        pinned,
      });
      return true; // Added
    }
  }

  async isFavorite(url) {
    const favorites = await this.getFavorites();
    return favorites.some(f => f.url === url);
  }

  async isPinned(url) {
    const favorites = await this.getFavorites();
    const fav = favorites.find(f => f.url === url);
    return fav?.pinned || false;
  }

  async togglePinned(url) {
    const favorites = await this.storage.getAll('favorites');
    const existing = favorites.find(f => f.url === url);

    if (existing) {
      existing.pinned = !existing.pinned;
      await this.storage.put('favorites', existing);
      return existing.pinned;
    }
    return false;
  }

  async getHistory() {
    return this.storage.getAll('history');
  }

  async addToHistory(channel) {
    await this.storage.put('history', {
      url: channel.url,
      name: channel.name,
      timestamp: new Date().toISOString(),
    });
  }

  async clearHistory() {
    return this.storage.clear('history');
  }

  async getSourceHealth() {
    return this.storage.getAll('sourceHealth');
  }

  async updateSourceHealth(url, health) {
    const existing = await this.storage.getAll('sourceHealth');
    const entry = existing.find(h => h.url === url) || {
      url,
      failures: 0,
      positiveReports: 0,
      negativeReports: 0,
      checkedAt: null,
      lastSuccessfulAt: null,
      lastFailureAt: null,
      status: 'unknown',
      latencyMs: null,
      lastKnownName: '',
    };

    Object.assign(entry, health, {
      checkedAt: new Date().toISOString(),
    });

    await this.storage.put('sourceHealth', entry);
  }
}

// Create singleton instance
const iptvApi = new IptvApi();

// Auto-initialize when loaded
iptvApi.init().catch(err => {
  console.error('Failed to initialize IPTV API:', err);
});

export default iptvApi;
