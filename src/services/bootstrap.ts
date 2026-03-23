import { appStore } from "../store/appStore";
import {
  Channel,
  FavoriteRecord,
  HistoryItem,
  LastPlayedChannel,
  MultiviewState,
  PlayerPreferences,
  PlaylistRecord,
  ProfileSnapshot,
  SourceHealthEntry,
  ThemeMode,
  UserProfile,
} from "../types/models";
import { createDefaultProfiles } from "../utils/profileDefaults";
import {
  getLastPlayedChannel,
  getStoredMultiview,
  getStoredEpg,
  getPlayerPreferences,
  getStoredFavorites,
  getStoredHistory,
  getStoredPlaylistLibrary,
  getStoredPlaylist,
  getStoredProfiles,
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

function normalizeProfiles(snapshot: ProfileSnapshot | null): {
  activeProfileId: string | null;
  profileAccessUnlocked: boolean;
  profiles: UserProfile[];
} {
  const fallbackProfiles = createDefaultProfiles();
  const profiles = (snapshot?.profiles || fallbackProfiles).map((profile) => ({
    blockedGroups: Array.isArray(profile.blockedGroups)
      ? profile.blockedGroups.filter(Boolean)
      : [],
    id: profile.id || `profile-${Math.random().toString(36).slice(2, 8)}`,
    name: profile.name || "Profile",
    pin: profile.pin || "",
  }));
  const activeProfileId =
    snapshot?.activeProfileId && profiles.some((profile) => profile.id === snapshot.activeProfileId)
      ? snapshot.activeProfileId
      : profiles[0]?.id || null;

  return {
    activeProfileId,
    profileAccessUnlocked: Boolean(snapshot?.profileAccessUnlocked),
    profiles,
  };
}

function normalizeMultiview(multiview: MultiviewState | null): MultiviewState {
  return {
    enabled: Boolean(multiview?.enabled),
    layout: multiview?.layout === 4 ? 4 : 2,
    miniPlayer: Boolean(multiview?.miniPlayer),
    quickSwitchOpen: false,
    slots: Array.isArray(multiview?.slots)
      ? multiview.slots
          .filter((slot) => Boolean(slot?.name) && Boolean(slot?.url))
          .slice(0, 4)
      : [],
  };
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
  const profileSnapshot = normalizeProfiles(getStoredProfiles());
  const multiview = normalizeMultiview(getStoredMultiview());

  appStore.replaceState({
    activePlaylistId,
    activeProfileId: profileSnapshot.activeProfileId,
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
    multiview,
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
    profileAccessUnlocked: profileSnapshot.profileAccessUnlocked,
    profiles: profileSnapshot.profiles,
    sourceHealth,
    theme,
  });
}
