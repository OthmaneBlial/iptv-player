export type ThemeMode = "dark" | "light";

export interface Channel {
  country: string;
  id: string;
  language: string;
  name: string;
  logo: string;
  group: string;
  displayName: string;
  url: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  url: string;
  channels: Channel[];
  lastLoadedAt: string;
  sourceLabel: string;
  sourceType: "file" | "text" | "url";
}

export interface PlaylistLibrarySnapshot {
  activePlaylistId: string | null;
  defaultPlaylistId: string | null;
  playlists: PlaylistRecord[];
}

export interface FavoriteRecord {
  url: string;
  addedAt: string;
}

export interface HistoryItem {
  name: string;
  url: string;
  timestamp: string;
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

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

export interface PlayerState {
  currentChannel: LastPlayedChannel | null;
  errorMessage: string | null;
  preferences: PlayerPreferences;
  status: PlayerStatus;
}

export interface FilterState {
  country: string;
  group: string;
  language: string;
  query: string;
  sort: "favorites" | "group" | "name" | "recent";
}

export interface AppState {
  activePlaylistId: string | null;
  defaultPlaylistId: string | null;
  favorites: FavoriteRecord[];
  filters: FilterState;
  history: HistoryItem[];
  player: PlayerState;
  playlists: PlaylistRecord[];
  theme: ThemeMode;
}
