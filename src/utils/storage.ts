import {
  FavoriteRecord,
  HistoryItem,
  LastPlayedChannel,
  PlayerPreferences,
  PlaylistLibrarySnapshot,
  PlaylistRecord,
} from "../types/models";

const STORAGE_KEYS = {
  lastPlayed: "player.lastPlayed",
  playlistLibrary: "playlist.library",
  playerPreferences: "player.preferences",
  playlist: "playlist",
  theme: "theme",
} as const;

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
  localStorage.setItem(STORAGE_KEYS.playlist, JSON.stringify(playlist));
}

export function getStoredPlaylistLibrary(): PlaylistLibrarySnapshot | null {
  return parseJSON<PlaylistLibrarySnapshot | null>(
    localStorage.getItem(STORAGE_KEYS.playlistLibrary),
    null
  );
}

export function setStoredPlaylistLibrary(
  snapshot: PlaylistLibrarySnapshot
): void {
  localStorage.setItem(STORAGE_KEYS.playlistLibrary, JSON.stringify(snapshot));
}

export function getStoredFavorites(): FavoriteRecord[] {
  return parseJSON<FavoriteRecord[]>(
    localStorage.getItem("favorites"),
    parseJSON<string[]>(localStorage.getItem("favorites"), []).map((url) => ({
      addedAt: new Date().toISOString(),
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
