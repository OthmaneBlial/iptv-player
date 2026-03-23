Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    addEventListener: jest.fn(),
    addListener: jest.fn(),
    dispatchEvent: jest.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: jest.fn(),
    removeListener: jest.fn(),
  })),
});

jest.mock("hls.js", () => {
  class MockHls {
    static Events = {
      AUDIO_TRACKS_UPDATED: "AUDIO_TRACKS_UPDATED",
      AUDIO_TRACK_SWITCHED: "AUDIO_TRACK_SWITCHED",
      ERROR: "ERROR",
      LEVELS_UPDATED: "LEVELS_UPDATED",
      LEVEL_SWITCHED: "LEVEL_SWITCHED",
      MANIFEST_PARSED: "MANIFEST_PARSED",
    };

    static isSupported(): boolean {
      return false;
    }

    audioTrack = -1;
    currentLevel = -1;

    attachMedia(): void {}
    destroy(): void {}
    loadSource(): void {}
    on(): void {}
  }

  return {
    __esModule: true,
    default: MockHls,
  };
});
