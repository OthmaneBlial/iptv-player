export interface StoredPlaylist {
  url: string;
  channels: Array<{
    id?: string;
    name?: string;
    logo?: string;
    group?: string;
    displayName: string;
    url: string;
  }>;
  lastLoadedAt: string;
}

export interface PlayerPreferences {
  volume: number;
  muted: boolean;
}

export interface LastPlayedChannel {
  name: string;
  url: string;
  playedAt: string;
}

const STORAGE_KEYS = {
  lastPlayed: "player.lastPlayed",
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

export function getStoredPlaylist(): StoredPlaylist | null {
  const playlist = parseJSON<StoredPlaylist | null>(
    localStorage.getItem(STORAGE_KEYS.playlist),
    null
  );

  if (!playlist || !Array.isArray(playlist.channels) || !playlist.channels.length) {
    return null;
  }

  return playlist;
}

export function setStoredPlaylist(playlist: StoredPlaylist): void {
  localStorage.setItem(STORAGE_KEYS.playlist, JSON.stringify(playlist));
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
