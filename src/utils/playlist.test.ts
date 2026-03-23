import { parseM3U } from "./playlist";

describe("parseM3U", () => {
  it("parses metadata-rich channel rows", () => {
    const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="bbc" tvg-name="BBC World" tvg-logo="https://logo.png" group-title="News",BBC World
https://example.com/live.m3u8`;

    const channels = parseM3U(playlist);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      displayName: "BBC World",
      group: "News",
      id: "bbc",
      logo: "https://logo.png",
      url: "https://example.com/live.m3u8",
    });
  });

  it("resolves relative stream urls against a base url", () => {
    const playlist = `#EXTM3U
#EXTINF:-1,Relative Channel
streams/main.m3u8`;

    const channels = parseM3U(playlist, "https://example.com/root/master.m3u8");

    expect(channels[0].url).toBe("https://example.com/root/streams/main.m3u8");
  });
});
