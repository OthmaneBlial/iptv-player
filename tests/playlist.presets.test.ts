import {
  PLAYLIST_PRESETS,
  getPlaylistPreset,
  normalizePlaylistImportUrl,
} from "../src/utils/playlistPresets";

describe("playlist presets", () => {
  it("exposes the expected built-in presets", () => {
    expect(PLAYLIST_PRESETS.map((preset) => preset.id)).toEqual([
      "streamflow-demo",
      "free-tv",
      "rw1986-fast",
      "world-mix",
    ]);
    expect(getPlaylistPreset("streamflow-demo")?.mode).toBe("text");
    expect(getPlaylistPreset("rw1986-fast")?.mode).toBe("url");
  });

  it("normalizes GitHub raw and blob URLs to raw.githubusercontent.com", () => {
    expect(
      normalizePlaylistImportUrl(
        "https://github.com/RW1986/IPTV/raw/main/lineup.m3u8"
      )
    ).toBe("https://raw.githubusercontent.com/RW1986/IPTV/main/lineup.m3u8");

    expect(
      normalizePlaylistImportUrl(
        "https://github.com/Free-TV/IPTV/blob/master/playlist.m3u8"
      )
    ).toBe(
      "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8"
    );
  });
});
