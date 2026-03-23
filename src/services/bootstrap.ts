import { appStore } from "../store/appStore";
import {
  Channel,
  FavoriteRecord,
  HistoryItem,
  LastPlayedChannel,
  PlayerPreferences,
  PlaylistRecord,
  ThemeMode,
} from "../types/models";
import {
  getLastPlayedChannel,
  getPlayerPreferences,
  getStoredFavorites,
  getStoredHistory,
  getStoredPlaylist,
  getStoredTheme,
} from "../utils/storage";

function normalizeTheme(theme: string | null): ThemeMode {
  return theme === "light" ? "light" : "dark";
}

function normalizeChannel(channel: Partial<Channel>): Channel {
  return {
    id: channel.id || "",
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

function normalizeHistory(history: HistoryItem[]): HistoryItem[] {
  return history.filter((item) => Boolean(item.name) && Boolean(item.url));
}

function normalizeFavorites(favorites: FavoriteRecord[]): FavoriteRecord[] {
  return favorites.filter((item) => Boolean(item.url));
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
  const playlist = normalizePlaylist(getStoredPlaylist());
  const favorites = normalizeFavorites(getStoredFavorites());
  const history = normalizeHistory(getStoredHistory());
  const preferences = normalizePlayerPreferences(getPlayerPreferences());
  const lastPlayed = normalizeLastPlayed(getLastPlayedChannel());

  appStore.replaceState({
    favorites,
    filters: {
      query: "",
    },
    history,
    player: {
      currentChannel: lastPlayed,
      errorMessage: null,
      preferences,
      status: "idle",
    },
    playlist,
    theme,
  });
}
