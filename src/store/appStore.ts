import { AppState, FilterState, PlayerState, PlaylistRecord, ThemeMode } from "../types/models";

type Listener = (state: AppState) => void;

const listeners = new Set<Listener>();

let state: AppState = {
  activePlaylistId: null,
  defaultPlaylistId: null,
  favorites: [],
  filters: {
    country: "all",
    group: "all",
    language: "all",
    query: "",
    sort: "name",
  },
  history: [],
  player: {
    audioTracks: [
      {
        label: "Default Audio",
        value: -1,
      },
    ],
    currentChannel: null,
    errorMessage: null,
    networkStatus: "online",
    preferences: {
      muted: false,
      volume: 1,
    },
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
  playlists: [],
  theme: "dark",
};

function emit(): void {
  listeners.forEach((listener) => listener(state));
}

export const appStore = {
  getState(): AppState {
    return state;
  },

  replaceState(nextState: AppState): void {
    state = nextState;
    emit();
  },

  setFavorites(favorites: AppState["favorites"]): void {
    state = {
      ...state,
      favorites,
    };
    emit();
  },

  setActivePlaylistId(activePlaylistId: string | null): void {
    state = {
      ...state,
      activePlaylistId,
    };
    emit();
  },

  setDefaultPlaylistId(defaultPlaylistId: string | null): void {
    state = {
      ...state,
      defaultPlaylistId,
    };
    emit();
  },

  setFilters(filters: Partial<FilterState>): void {
    state = {
      ...state,
      filters: {
        ...state.filters,
        ...filters,
      },
    };
    emit();
  },

  setHistory(history: AppState["history"]): void {
    state = {
      ...state,
      history,
    };
    emit();
  },

  setPlayer(player: Partial<PlayerState>): void {
    state = {
      ...state,
      player: {
        ...state.player,
        ...player,
        preferences: {
          ...state.player.preferences,
          ...(player.preferences || {}),
        },
      },
    };
    emit();
  },

  setPlaylists(playlists: PlaylistRecord[]): void {
    state = {
      ...state,
      playlists,
    };
    emit();
  },

  setTheme(theme: ThemeMode): void {
    state = {
      ...state,
      theme,
    };
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
