export type ThemeMode = "dark" | "light";

export interface Channel {
  id: string;
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
  query: string;
}

export interface AppState {
  favorites: FavoriteRecord[];
  filters: FilterState;
  history: HistoryItem[];
  player: PlayerState;
  playlist: PlaylistRecord | null;
  theme: ThemeMode;
}
