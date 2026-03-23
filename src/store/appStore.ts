import { AppState, FilterState, PlayerState, PlaylistRecord, ThemeMode } from "../types/models";

type Listener = (state: AppState) => void;

const listeners = new Set<Listener>();

let state: AppState = {
  activePlaylistId: null,
  activeProfileId: null,
  defaultPlaylistId: null,
  diagnostics: [],
  epg: {
    channels: [],
    loadedAt: null,
    programs: [],
    sourceLabel: null,
  },
  favorites: [],
  filters: {
    country: "all",
    group: "all",
    language: "all",
    query: "",
    sort: "name",
  },
  history: [],
  multiview: {
    enabled: false,
    layout: 2,
    miniPlayer: false,
    quickSwitchOpen: false,
    slots: [],
  },
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
  profileAccessUnlocked: false,
  profiles: [],
  sourceHealth: [],
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

  setEpg(epg: AppState["epg"]): void {
    state = {
      ...state,
      epg,
    };
    emit();
  },

  setDiagnostics(diagnostics: AppState["diagnostics"]): void {
    state = {
      ...state,
      diagnostics,
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

  setActiveProfileId(activeProfileId: string | null): void {
    state = {
      ...state,
      activeProfileId,
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

  setMultiview(multiview: Partial<AppState["multiview"]>): void {
    state = {
      ...state,
      multiview: {
        ...state.multiview,
        ...multiview,
      },
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

  setProfileAccessUnlocked(profileAccessUnlocked: boolean): void {
    state = {
      ...state,
      profileAccessUnlocked,
    };
    emit();
  },

  setProfiles(profiles: AppState["profiles"]): void {
    state = {
      ...state,
      profiles,
    };
    emit();
  },

  setSourceHealth(sourceHealth: AppState["sourceHealth"]): void {
    state = {
      ...state,
      sourceHealth,
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
