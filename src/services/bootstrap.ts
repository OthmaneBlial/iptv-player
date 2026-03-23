import { appStore } from "../store/appStore";
import {
  Channel,
  FavoriteRecord,
  HistoryItem,
  LastPlayedChannel,
  PlayerPreferences,
  PlaylistRecord,
  SourceHealthEntry,
  ThemeMode,
} from "../types/models";
import {
  getLastPlayedChannel,
  getStoredEpg,
  getPlayerPreferences,
  getStoredFavorites,
  getStoredHistory,
  getStoredPlaylistLibrary,
  getStoredPlaylist,
  getStoredSourceHealth,
  getStoredTheme,
} from "../utils/storage";

function normalizeTheme(theme: string | null): ThemeMode {
  return theme === "light" ? "light" : "dark";
}

function normalizeChannel(channel: Partial<Channel>): Channel {
  return {
    country: channel.country || "",
    id: channel.id || "",
    language: channel.language || "",
    name: channel.name || channel.displayName || "Unknown",
    logo: channel.logo || "",
    group: channel.group || "Ungrouped",
    displayName: channel.displayName || channel.name || "Unknown",
    url: channel.url || "",
  };
}

function normalizePlaylist(playlist: PlaylistRecord | null): PlaylistRecord | null {
  if (!playlist) {
    return null;
  }

  return {
    ...playlist,
    channels: playlist.channels.map((channel) => normalizeChannel(channel)),
    sourceLabel: playlist.sourceLabel || playlist.name || "Imported playlist",
    sourceType: playlist.sourceType || "url",
  };
}

function normalizePlaylists(playlists: PlaylistRecord[]): PlaylistRecord[] {
  return playlists
    .map((playlist) => normalizePlaylist(playlist))
    .filter(Boolean) as PlaylistRecord[];
}

function normalizeHistory(history: HistoryItem[]): HistoryItem[] {
  return history.filter((item) => Boolean(item.name) && Boolean(item.url));
}

function normalizeFavorites(favorites: FavoriteRecord[]): FavoriteRecord[] {
  return favorites
    .filter((item) => Boolean(item.url))
    .map((item) => ({
      ...item,
      pinned: Boolean(item.pinned),
    }));
}

function normalizeSourceHealth(
  sourceHealth: SourceHealthEntry[]
): SourceHealthEntry[] {
  return sourceHealth
    .filter((entry) => Boolean(entry.url))
    .map((entry) => ({
      checkedAt: entry.checkedAt || null,
      failures: typeof entry.failures === "number" ? entry.failures : 0,
      lastFailureAt: entry.lastFailureAt || null,
      lastKnownName: entry.lastKnownName || "Unknown channel",
      lastSuccessfulAt: entry.lastSuccessfulAt || null,
      latencyMs: typeof entry.latencyMs === "number" ? entry.latencyMs : null,
      negativeReports:
        typeof entry.negativeReports === "number" ? entry.negativeReports : 0,
      positiveReports:
        typeof entry.positiveReports === "number" ? entry.positiveReports : 0,
      status: entry.status || "unknown",
      url: entry.url,
    }));
}

function normalizePlayerPreferences(
  preferences: PlayerPreferences
): PlayerPreferences {
  return {
    muted: Boolean(preferences.muted),
    volume:
      typeof preferences.volume === "number" &&
      preferences.volume >= 0 &&
      preferences.volume <= 1
        ? preferences.volume
        : 1,
  };
}

function normalizeLastPlayed(
  channel: LastPlayedChannel | null
): LastPlayedChannel | null {
  if (!channel?.name || !channel.url) {
    return null;
  }

  return channel;
}

export function bootstrapAppState(): void {
  const theme = normalizeTheme(getStoredTheme());
  const storedLibrary = getStoredPlaylistLibrary();
  const legacyPlaylist = normalizePlaylist(getStoredPlaylist());
  const playlists = storedLibrary
    ? normalizePlaylists(storedLibrary.playlists)
    : legacyPlaylist
      ? [legacyPlaylist]
      : [];
  const defaultPlaylistId =
    storedLibrary?.defaultPlaylistId ||
    playlists[0]?.id ||
    null;
  const activePlaylistId =
    storedLibrary?.activePlaylistId ||
    defaultPlaylistId ||
    null;
  const favorites = normalizeFavorites(getStoredFavorites());
  const epg = getStoredEpg();
  const history = normalizeHistory(getStoredHistory());
  const preferences = normalizePlayerPreferences(getPlayerPreferences());
  const lastPlayed = normalizeLastPlayed(getLastPlayedChannel());
  const sourceHealth = normalizeSourceHealth(getStoredSourceHealth());

  appStore.replaceState({
    activePlaylistId,
    defaultPlaylistId,
    diagnostics: [],
    epg: epg || {
      channels: [],
      loadedAt: null,
      programs: [],
      sourceLabel: null,
    },
    favorites,
    filters: {
      country: "all",
      group: "all",
      language: "all",
      query: "",
      sort: "name",
    },
    history,
    player: {
      audioTracks: [
        {
          label: "Default Audio",
          value: -1,
        },
      ],
      currentChannel: lastPlayed,
      errorMessage: null,
      networkStatus: navigator.onLine === false ? "offline" : "online",
      preferences,
      qualityLevels: [
        {
          label: "Auto Quality",
          value: -1,
        },
      ],
      retries: 0,
      selectedAudioTrack: -1,
      selectedQuality: -1,
      status: "idle",
    },
    playlists,
    sourceHealth,
    theme,
  });
}
