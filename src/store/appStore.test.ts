import { appStore } from "./appStore";

describe("appStore", () => {
  afterEach(() => {
    appStore.replaceState({
      activePlaylistId: null,
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
      player: {
        audioTracks: [{ label: "Default Audio", value: -1 }],
        currentChannel: null,
        errorMessage: null,
        networkStatus: "online",
        preferences: {
          muted: false,
          volume: 1,
        },
        qualityLevels: [{ label: "Auto Quality", value: -1 }],
        retries: 0,
        selectedAudioTrack: -1,
        selectedQuality: -1,
        status: "idle",
      },
      playlists: [],
      sourceHealth: [],
      theme: "dark",
    });
  });

  it("merges partial filter updates", () => {
    appStore.setFilters({
      group: "News",
    });

    expect(appStore.getState().filters).toMatchObject({
      group: "News",
      sort: "name",
    });
  });

  it("merges player preferences without losing state", () => {
    appStore.setPlayer({
      preferences: {
        muted: true,
        volume: 0.2,
      },
      retries: 1,
    });

    expect(appStore.getState().player).toMatchObject({
      retries: 1,
      preferences: {
        muted: true,
        volume: 0.2,
      },
    });
  });

  it("stores source health entries", () => {
    appStore.setSourceHealth([
      {
        checkedAt: "2026-01-01T00:00:00.000Z",
        failures: 0,
        lastFailureAt: null,
        lastKnownName: "BBC World",
        lastSuccessfulAt: "2026-01-01T00:00:00.000Z",
        latencyMs: 240,
        negativeReports: 0,
        positiveReports: 1,
        status: "healthy",
        url: "https://example.com/live.m3u8",
      },
    ]);

    expect(appStore.getState().sourceHealth).toHaveLength(1);
    expect(appStore.getState().sourceHealth[0].status).toBe("healthy");
  });
});
