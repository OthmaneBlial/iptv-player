import { AppState, FilterState, PlayerState, PlaylistRecord, ThemeMode } from "../types/models";

type Listener = (state: AppState) => void;

const listeners = new Set<Listener>();

let state: AppState = {
  favorites: [],
  filters: {
    query: "",
  },
  history: [],
  player: {
    currentChannel: null,
    errorMessage: null,
    preferences: {
      muted: false,
      volume: 1,
    },
    status: "idle",
  },
  playlist: null,
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

  setPlaylist(playlist: PlaylistRecord | null): void {
    state = {
      ...state,
      playlist,
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
