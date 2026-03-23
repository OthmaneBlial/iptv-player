import {
  getStoredFavorites,
  getStoredMultiview,
  getStoredProfiles,
  getStoredSourceHealth,
  getStoredTheme,
  setStoredFavorites,
  setStoredMultiview,
  setStoredProfiles,
  setStoredSourceHealth,
  setStoredTheme,
} from "./storage";

describe("storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads the active theme", () => {
    setStoredTheme("light");

    expect(getStoredTheme()).toBe("light");
  });

  it("normalizes favorite records", () => {
    setStoredFavorites([
      {
        addedAt: "2026-01-01T00:00:00.000Z",
        pinned: true,
        url: "https://example.com/stream.m3u8",
      },
    ]);

    expect(getStoredFavorites()).toEqual([
      {
        addedAt: "2026-01-01T00:00:00.000Z",
        pinned: true,
        url: "https://example.com/stream.m3u8",
      },
    ]);
  });

  it("stores and reads source health entries", () => {
    setStoredSourceHealth([
      {
        checkedAt: "2026-01-01T00:00:00.000Z",
        failures: 1,
        lastFailureAt: "2026-01-01T00:00:00.000Z",
        lastKnownName: "BBC World",
        lastSuccessfulAt: null,
        latencyMs: 320,
        negativeReports: 1,
        positiveReports: 0,
        status: "unstable",
        url: "https://example.com/live.m3u8",
      },
    ]);

    expect(getStoredSourceHealth()).toEqual([
      {
        checkedAt: "2026-01-01T00:00:00.000Z",
        failures: 1,
        lastFailureAt: "2026-01-01T00:00:00.000Z",
        lastKnownName: "BBC World",
        lastSuccessfulAt: null,
        latencyMs: 320,
        negativeReports: 1,
        positiveReports: 0,
        status: "unstable",
        url: "https://example.com/live.m3u8",
      },
    ]);
  });

  it("stores and reads profile snapshots", () => {
    setStoredProfiles({
      activeProfileId: "profile-owner",
      profileAccessUnlocked: false,
      profiles: [
        {
          blockedGroups: ["Adult"],
          id: "profile-owner",
          name: "Owner",
          pin: "1234",
        },
      ],
    });

    expect(getStoredProfiles()).toEqual({
      activeProfileId: "profile-owner",
      profileAccessUnlocked: false,
      profiles: [
        {
          blockedGroups: ["Adult"],
          id: "profile-owner",
          name: "Owner",
          pin: "1234",
        },
      ],
    });
  });

  it("stores and reads multiview state", () => {
    setStoredMultiview({
      enabled: true,
      layout: 4,
      miniPlayer: true,
      quickSwitchOpen: false,
      slots: [
        {
          name: "BBC World",
          url: "https://example.com/live.m3u8",
        },
      ],
    });

    expect(getStoredMultiview()).toEqual({
      enabled: true,
      layout: 4,
      miniPlayer: true,
      quickSwitchOpen: false,
      slots: [
        {
          name: "BBC World",
          url: "https://example.com/live.m3u8",
        },
      ],
    });
  });
});
