import { appStore } from "./appStore";

describe("appStore", () => {
  afterEach(() => {
    appStore.replaceState({
      activePlaylistId: null,
      defaultPlaylistId: null,
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
});
