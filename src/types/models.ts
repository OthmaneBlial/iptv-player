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

export interface EpgChannel {
  displayName: string;
  id: string;
}

export interface EpgProgram {
  channelId: string;
  description: string;
  end: string;
  start: string;
  title: string;
}

export interface EpgState {
  channels: EpgChannel[];
  loadedAt: string | null;
  programs: EpgProgram[];
  sourceLabel: string | null;
}

export interface DiagnosticEntry {
  context?: string;
  level: "error" | "info" | "warn";
  message: string;
  timestamp: string;
}

export type SourceHealthStatus = "healthy" | "offline" | "unknown" | "unstable";

export interface SourceHealthEntry {
  checkedAt: string | null;
  failures: number;
  lastFailureAt: string | null;
  lastKnownName: string;
  lastSuccessfulAt: string | null;
  latencyMs: number | null;
  negativeReports: number;
  positiveReports: number;
  status: SourceHealthStatus;
  url: string;
}

export interface FavoriteRecord {
  url: string;
  addedAt: string;
  pinned: boolean;
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

export interface PlayerTrackOption {
  label: string;
  value: number;
}

export interface PlayerState {
  audioTracks: PlayerTrackOption[];
  currentChannel: LastPlayedChannel | null;
  errorMessage: string | null;
  networkStatus: "offline" | "online";
  preferences: PlayerPreferences;
  qualityLevels: PlayerTrackOption[];
  retries: number;
  selectedAudioTrack: number;
  selectedQuality: number;
  status: PlayerStatus;
}

export interface FilterState {
  country: string;
  group: string;
  language: string;
  query: string;
  sort: "favorites" | "group" | "health" | "name" | "recent";
}

export interface UserProfile {
  blockedGroups: string[];
  id: string;
  name: string;
  pin: string;
}

export interface ProfileSnapshot {
  activeProfileId: string | null;
  profileAccessUnlocked: boolean;
  profiles: UserProfile[];
}

export interface MultiviewSlot {
  name: string;
  url: string;
}

export interface MultiviewState {
  enabled: boolean;
  layout: 2 | 4;
  miniPlayer: boolean;
  quickSwitchOpen: boolean;
  slots: MultiviewSlot[];
}

export interface AppState {
  activePlaylistId: string | null;
  activeProfileId: string | null;
  defaultPlaylistId: string | null;
  diagnostics: DiagnosticEntry[];
  epg: EpgState;
  favorites: FavoriteRecord[];
  filters: FilterState;
  history: HistoryItem[];
  multiview: MultiviewState;
  player: PlayerState;
  playlists: PlaylistRecord[];
  profileAccessUnlocked: boolean;
  profiles: UserProfile[];
  sourceHealth: SourceHealthEntry[];
  theme: ThemeMode;
}
