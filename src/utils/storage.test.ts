import {
  getStoredFavorites,
  getStoredTheme,
  setStoredFavorites,
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
});
