const {
  rewriteManifestForProxy,
} = require("../src/utils/hlsManifestProxy");

describe("HLS manifest proxy rewriting", () => {
  it("rewrites relative media playlists and key URIs to proxied upstream URLs", () => {
    const manifest = [
      "#EXTM3U",
      "#EXT-X-STREAM-INF:BANDWIDTH=800000",
      "variant/playlist.m3u8",
      '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",URI="audio/main.m3u8"',
      '#EXT-X-KEY:METHOD=AES-128,URI="keys/key.bin"',
    ].join("\n");

    const rewritten = rewriteManifestForProxy(
      manifest,
      "https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/test/master.m3u8",
      "http://localhost:8081",
      "/__stream_proxy__"
    );

    expect(rewritten).toContain(
      "http://localhost:8081/__stream_proxy__?url=https%3A%2F%2Fservice-stitcher.clusters.pluto.tv%2Fstitch%2Fhls%2Fchannel%2Ftest%2Fvariant%2Fplaylist.m3u8"
    );
    expect(rewritten).toContain(
      'URI="http://localhost:8081/__stream_proxy__?url=https%3A%2F%2Fservice-stitcher.clusters.pluto.tv%2Fstitch%2Fhls%2Fchannel%2Ftest%2Faudio%2Fmain.m3u8"'
    );
    expect(rewritten).toContain(
      'URI="http://localhost:8081/__stream_proxy__?url=https%3A%2F%2Fservice-stitcher.clusters.pluto.tv%2Fstitch%2Fhls%2Fchannel%2Ftest%2Fkeys%2Fkey.bin"'
    );
  });
});
