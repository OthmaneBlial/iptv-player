import { appStore } from "../store/appStore";
import {
  setPlayerPreferences,
  setStoredEpg,
  setStoredFavorites,
  setStoredHistory,
  setStoredMultiview,
  setStoredPlaylistLibrary,
  setStoredProfiles,
  setStoredSourceHealth,
  setStoredTheme,
} from "./storage";

interface SyncConfig {
  gistId: string;
  lastLocalChangeAt: string;
  lastSyncedAt: string;
  token: string;
}

interface SyncPayload {
  generatedAt: string;
  state: {
    activePlaylistId: string | null;
    activeProfileId?: string | null;
    defaultPlaylistId: string | null;
    epg: ReturnType<typeof getSyncableState>["epg"];
    favorites: ReturnType<typeof getSyncableState>["favorites"];
    history: ReturnType<typeof getSyncableState>["history"];
    multiview?: ReturnType<typeof getSyncableState>["multiview"];
    playerPreferences: ReturnType<typeof getSyncableState>["playerPreferences"];
    playlists: ReturnType<typeof getSyncableState>["playlists"];
    profileAccessUnlocked?: ReturnType<typeof getSyncableState>["profileAccessUnlocked"];
    profiles?: ReturnType<typeof getSyncableState>["profiles"];
    sourceHealth?: ReturnType<typeof getSyncableState>["sourceHealth"];
    theme: ReturnType<typeof getSyncableState>["theme"];
  };
}

const STORAGE_KEY = "cloud.sync.config";

function getSyncableState() {
  const state = appStore.getState();
  return {
    activePlaylistId: state.activePlaylistId,
    activeProfileId: state.activeProfileId,
    defaultPlaylistId: state.defaultPlaylistId,
    epg: state.epg,
    favorites: state.favorites,
    history: state.history,
    multiview: state.multiview,
    playerPreferences: state.player.preferences,
    playlists: state.playlists,
    profileAccessUnlocked: state.profileAccessUnlocked,
    profiles: state.profiles,
    sourceHealth: state.sourceHealth,
    theme: state.theme,
  };
}

function getStoredSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        gistId: "",
        lastLocalChangeAt: "",
        lastSyncedAt: "",
        token: "",
      };
    }

    return {
      gistId: "",
      lastLocalChangeAt: "",
      lastSyncedAt: "",
      token: "",
      ...JSON.parse(raw),
    };
  } catch (error) {
    return {
      gistId: "",
      lastLocalChangeAt: "",
      lastSyncedAt: "",
      token: "",
    };
  }
}

function setStoredSyncConfig(config: SyncConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function setSyncFeedback(message: string, tone: "error" | "neutral" | "success"): void {
  const feedback = document.getElementById("syncFeedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.setAttribute("data-tone", tone);
}

function buildPayload(): SyncPayload {
  return {
    generatedAt: new Date().toISOString(),
    state: getSyncableState(),
  };
}

async function applyPayload(payload: SyncPayload): Promise<void> {
  const currentState = appStore.getState();
  const multiview = payload.state.multiview || currentState.multiview;
  const profiles = payload.state.profiles || currentState.profiles;
  const sourceHealth = payload.state.sourceHealth || [];
  const nextState = {
    ...currentState,
    activePlaylistId: payload.state.activePlaylistId,
    activeProfileId: payload.state.activeProfileId || currentState.activeProfileId,
    defaultPlaylistId: payload.state.defaultPlaylistId,
    epg: payload.state.epg,
    favorites: payload.state.favorites,
    history: payload.state.history,
    multiview,
    playlists: payload.state.playlists,
    profileAccessUnlocked:
      typeof payload.state.profileAccessUnlocked === "boolean"
        ? payload.state.profileAccessUnlocked
        : currentState.profileAccessUnlocked,
    profiles,
    sourceHealth,
    theme: payload.state.theme,
    player: {
      ...currentState.player,
      preferences: payload.state.playerPreferences,
    },
  };

  appStore.replaceState(nextState);
  await setStoredPlaylistLibrary({
    activePlaylistId: payload.state.activePlaylistId,
    defaultPlaylistId: payload.state.defaultPlaylistId,
    playlists: payload.state.playlists,
  });
  setStoredProfiles({
    activeProfileId: payload.state.activeProfileId || currentState.activeProfileId,
    profileAccessUnlocked:
      typeof payload.state.profileAccessUnlocked === "boolean"
        ? payload.state.profileAccessUnlocked
        : currentState.profileAccessUnlocked,
    profiles,
  });
  setStoredFavorites(payload.state.favorites);
  setStoredHistory(payload.state.history);
  setStoredTheme(payload.state.theme);
  setStoredEpg(payload.state.epg);
  setStoredMultiview(multiview);
  setStoredSourceHealth(sourceHealth);
  setPlayerPreferences(payload.state.playerPreferences);
}

async function createOrUpdateGist(config: SyncConfig, payload: SyncPayload): Promise<SyncConfig> {
  const body = {
    description: "Broadcast Console cloud sync",
    files: {
      "broadcast-console-sync.json": {
        content: JSON.stringify(payload, null, 2),
      },
    },
    public: false,
  };

  const method = config.gistId ? "PATCH" : "POST";
  const endpoint = config.gistId
    ? `https://api.github.com/gists/${config.gistId}`
    : "https://api.github.com/gists";
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    method,
  });

  if (!response.ok) {
    throw new Error("GitHub sync request failed.");
  }

  const result = await response.json();
  return {
    ...config,
    gistId: result.id || config.gistId,
    lastLocalChangeAt: payload.generatedAt,
    lastSyncedAt: payload.generatedAt,
  };
}

async function readGistPayload(config: SyncConfig): Promise<SyncPayload> {
  const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not fetch sync data from GitHub.");
  }

  const gist = await response.json();
  const content = gist.files?.["broadcast-console-sync.json"]?.content;
  if (!content) {
    throw new Error("Sync gist did not contain app state.");
  }

  return JSON.parse(content) as SyncPayload;
}

export async function pushCloudSync(): Promise<void> {
  const config = readConfigFromInputs();
  if (!config.token) {
    setSyncFeedback("Add a GitHub token before pushing cloud sync.", "error");
    return;
  }

  const nextConfig = await createOrUpdateGist(config, buildPayload());
  setStoredSyncConfig(nextConfig);
  writeConfigToInputs(nextConfig);
  setSyncFeedback(
    nextConfig.gistId
      ? `Cloud sync pushed to gist ${nextConfig.gistId}.`
      : "Cloud sync updated.",
    "success"
  );
}

export async function pullCloudSync(): Promise<void> {
  const config = readConfigFromInputs();
  if (!config.token || !config.gistId) {
    setSyncFeedback("Add both a GitHub token and gist ID before pulling sync.", "error");
    return;
  }

  const payload = await readGistPayload(config);
  if (
    config.lastSyncedAt &&
    config.lastLocalChangeAt > config.lastSyncedAt &&
    payload.generatedAt > config.lastSyncedAt
  ) {
    const shouldOverwrite = confirm(
      "Local data changed after your last sync. Pulling will overwrite those local changes. Continue?"
    );
    if (!shouldOverwrite) {
      return;
    }
  }

  await applyPayload(payload);
  const nextConfig = {
    ...config,
    lastLocalChangeAt: payload.generatedAt,
    lastSyncedAt: payload.generatedAt,
  };
  setStoredSyncConfig(nextConfig);
  writeConfigToInputs(nextConfig);
  setSyncFeedback(`Pulled cloud sync from gist ${config.gistId}.`, "success");
}

function readConfigFromInputs(): SyncConfig {
  const tokenInput = document.getElementById("syncToken") as HTMLInputElement | null;
  const gistInput = document.getElementById("syncGistId") as HTMLInputElement | null;
  const storedConfig = getStoredSyncConfig();

  return {
    ...storedConfig,
    gistId: gistInput?.value.trim() || storedConfig.gistId,
    token: tokenInput?.value.trim() || storedConfig.token,
  };
}

function writeConfigToInputs(config: SyncConfig): void {
  const tokenInput = document.getElementById("syncToken") as HTMLInputElement | null;
  const gistInput = document.getElementById("syncGistId") as HTMLInputElement | null;

  if (tokenInput) {
    tokenInput.value = config.token;
  }

  if (gistInput) {
    gistInput.value = config.gistId;
  }
}

function trackLocalChanges(): void {
  let lastSignature = "";

  appStore.subscribe(() => {
    const signature = JSON.stringify(getSyncableState());
    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;
    const config = getStoredSyncConfig();
    setStoredSyncConfig({
      ...config,
      lastLocalChangeAt: new Date().toISOString(),
    });
  });
}

export function initializeCloudSync(): void {
  const config = getStoredSyncConfig();
  writeConfigToInputs(config);
  trackLocalChanges();

  document.getElementById("pushCloudSync")?.addEventListener("click", () => {
    void pushCloudSync().catch((error) => {
      setSyncFeedback("Cloud sync push failed.", "error");
      console.error(error);
    });
  });

  document.getElementById("pullCloudSync")?.addEventListener("click", () => {
    void pullCloudSync().catch((error) => {
      setSyncFeedback("Cloud sync pull failed.", "error");
      console.error(error);
    });
  });
}
