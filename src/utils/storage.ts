import {
  EpgState,
  FavoriteRecord,
  HistoryItem,
  LastPlayedChannel,
  MultiviewState,
  PlayerPreferences,
  PlaylistLibrarySnapshot,
  PlaylistRecord,
  ProfileSnapshot,
  SourceHealthEntry,
} from "../types/models";

const STORAGE_KEYS = {
  lastPlayed: "player.lastPlayed",
  epg: "epg",
  multiview: "player.multiview",
  playlistLibrary: "playlist.library",
  playlistLibraryMeta: "playlist.library.meta",
  playerPreferences: "player.preferences",
  playlist: "playlist",
  profiles: "profiles",
  sourceHealth: "source.health",
  theme: "theme",
} as const;

const DATABASE_NAME = "broadcast-console-storage";
const DATABASE_VERSION = 1;
const KV_STORE_NAME = "kv";

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function removeLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to remove local storage item.", error);
  }
}

async function openStorageDatabase(): Promise<IDBDatabase | null> {
  if (!supportsIndexedDb()) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(KV_STORE_NAME)) {
        database.createObjectStore(KV_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Could not open IndexedDB storage."));
    };
  });
}

async function readIndexedValue<T>(key: string): Promise<T | null> {
  const database = await openStorageDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(KV_STORE_NAME, "readonly");
    const store = transaction.objectStore(KV_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve((request.result as T | undefined) || null);
    };

    request.onerror = () => {
      reject(request.error || new Error("Could not read IndexedDB value."));
    };

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("IndexedDB read transaction failed."));
    };
  });
}

async function writeIndexedValue<T>(key: string, value: T): Promise<void> {
  const database = await openStorageDatabase();
  if (!database) {
    throw new Error("IndexedDB is not available in this environment.");
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(KV_STORE_NAME, "readwrite");
    const store = transaction.objectStore(KV_STORE_NAME);
    store.put(value, key);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("IndexedDB write transaction failed."));
    };
  });
}

function getPlaylistLibraryFallback(): PlaylistLibrarySnapshot | null {
  return parseJSON<PlaylistLibrarySnapshot | null>(
    localStorage.getItem(STORAGE_KEYS.playlistLibrary),
    null
  );
}

function setPlaylistLibraryFallback(snapshot: PlaylistLibrarySnapshot): void {
  localStorage.setItem(STORAGE_KEYS.playlistLibrary, JSON.stringify(snapshot));
}

function createPlaylistLibraryMeta(
  snapshot: PlaylistLibrarySnapshot
): Pick<PlaylistLibrarySnapshot, "activePlaylistId" | "defaultPlaylistId"> & {
  playlists: Array<
    Pick<
      PlaylistRecord,
      "id" | "lastLoadedAt" | "name" | "sourceLabel" | "sourceType" | "url"
    > & {
      channelCount: number;
    }
  >;
} {
  return {
    activePlaylistId: snapshot.activePlaylistId,
    defaultPlaylistId: snapshot.defaultPlaylistId,
    playlists: snapshot.playlists.map((playlist) => ({
      channelCount: playlist.channels.length,
      id: playlist.id,
      lastLoadedAt: playlist.lastLoadedAt,
      name: playlist.name,
      sourceLabel: playlist.sourceLabel,
      sourceType: playlist.sourceType,
      url: playlist.url,
    })),
  };
}

function parseJSON<T>(rawValue: string | null, fallback: T): T {
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.warn("Failed to parse local storage value.", error);
    return fallback;
  }
}

export function getStoredTheme(): string | null {
  return localStorage.getItem(STORAGE_KEYS.theme);
}

export function setStoredTheme(theme: string): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function getStoredPlaylist(): PlaylistRecord | null {
  const playlist = parseJSON<PlaylistRecord | null>(
    localStorage.getItem(STORAGE_KEYS.playlist),
    null
  );

  if (!playlist || !Array.isArray(playlist.channels) || !playlist.channels.length) {
    return null;
  }

  return playlist;
}

export function setStoredPlaylist(playlist: PlaylistRecord): void {
  try {
    localStorage.setItem(STORAGE_KEYS.playlist, JSON.stringify(playlist));
  } catch (error) {
    console.warn("Could not persist legacy playlist storage.", error);
  }
}

export async function getStoredPlaylistLibrary(): Promise<PlaylistLibrarySnapshot | null> {
  try {
    const indexedValue = await readIndexedValue<PlaylistLibrarySnapshot>(
      STORAGE_KEYS.playlistLibrary
    );
    if (indexedValue?.playlists?.length) {
      return indexedValue;
    }
  } catch (error) {
    console.warn("Could not read playlist library from IndexedDB.", error);
  }

  return getPlaylistLibraryFallback();
}

export async function setStoredPlaylistLibrary(
  snapshot: PlaylistLibrarySnapshot
): Promise<void> {
  if (supportsIndexedDb()) {
    try {
      await writeIndexedValue(STORAGE_KEYS.playlistLibrary, snapshot);
      localStorage.setItem(
        STORAGE_KEYS.playlistLibraryMeta,
        JSON.stringify(createPlaylistLibraryMeta(snapshot))
      );
      removeLocalStorageItem(STORAGE_KEYS.playlistLibrary);
      removeLocalStorageItem(STORAGE_KEYS.playlist);
      return;
    } catch (error) {
      console.warn("Could not persist playlist library to IndexedDB.", error);
    }
  }

  setPlaylistLibraryFallback(snapshot);
}

export function getStoredEpg(): EpgState | null {
  return parseJSON<EpgState | null>(
    localStorage.getItem(STORAGE_KEYS.epg),
    null
  );
}

export function setStoredEpg(epg: EpgState): void {
  localStorage.setItem(STORAGE_KEYS.epg, JSON.stringify(epg));
}

export function getStoredFavorites(): FavoriteRecord[] {
  return parseJSON<FavoriteRecord[]>(
    localStorage.getItem("favorites"),
    parseJSON<string[]>(localStorage.getItem("favorites"), []).map((url) => ({
      addedAt: new Date().toISOString(),
      pinned: false,
      url,
    }))
  );
}

export function setStoredFavorites(favorites: FavoriteRecord[]): void {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

export function getStoredHistory(): HistoryItem[] {
  return parseJSON<HistoryItem[]>(localStorage.getItem("history"), []);
}

export function setStoredHistory(history: HistoryItem[]): void {
  localStorage.setItem("history", JSON.stringify(history));
}

export function getStoredSourceHealth(): SourceHealthEntry[] {
  return parseJSON<SourceHealthEntry[]>(
    localStorage.getItem(STORAGE_KEYS.sourceHealth),
    []
  );
}

export function setStoredSourceHealth(sourceHealth: SourceHealthEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.sourceHealth, JSON.stringify(sourceHealth));
}

export function getStoredProfiles(): ProfileSnapshot | null {
  return parseJSON<ProfileSnapshot | null>(
    localStorage.getItem(STORAGE_KEYS.profiles),
    null
  );
}

export function setStoredProfiles(snapshot: ProfileSnapshot): void {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(snapshot));
}

export function getStoredMultiview(): MultiviewState | null {
  return parseJSON<MultiviewState | null>(
    localStorage.getItem(STORAGE_KEYS.multiview),
    null
  );
}

export function setStoredMultiview(multiview: MultiviewState): void {
  localStorage.setItem(STORAGE_KEYS.multiview, JSON.stringify(multiview));
}

export function getPlayerPreferences(): PlayerPreferences {
  const preferences = parseJSON<Partial<PlayerPreferences>>(
    localStorage.getItem(STORAGE_KEYS.playerPreferences),
    {}
  );

  return {
    volume: typeof preferences.volume === "number" ? preferences.volume : 1,
    muted: typeof preferences.muted === "boolean" ? preferences.muted : false,
  };
}

export function setPlayerPreferences(preferences: PlayerPreferences): void {
  localStorage.setItem(
    STORAGE_KEYS.playerPreferences,
    JSON.stringify(preferences)
  );
}

export function getLastPlayedChannel(): LastPlayedChannel | null {
  return parseJSON<LastPlayedChannel | null>(
    localStorage.getItem(STORAGE_KEYS.lastPlayed),
    null
  );
}

export function setLastPlayedChannel(channel: LastPlayedChannel): void {
  localStorage.setItem(STORAGE_KEYS.lastPlayed, JSON.stringify(channel));
}
