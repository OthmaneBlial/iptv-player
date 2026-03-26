import { PlaylistRecord } from "../types/models";

type PlaylistPresetMode = "text" | "url";

interface PlaylistPresetBase {
  description: string;
  id: string;
  label: string;
  mode: PlaylistPresetMode;
  sourceLabel: string;
  sourceType: PlaylistRecord["sourceType"];
}

interface TextPlaylistPreset extends PlaylistPresetBase {
  content: string;
  mode: "text";
  sourceType: "text";
}

interface UrlPlaylistPreset extends PlaylistPresetBase {
  mode: "url";
  sourceType: "url";
  url: string;
}

export type PlaylistPreset = TextPlaylistPreset | UrlPlaylistPreset;

const STREAMFLOW_DEMO_PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-id="1" tvg-name="Apple Sample" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" group-title="Demo",Apple Sample
https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8
#EXTINF:-1 tvg-id="2" tvg-name="Mux Demo" tvg-logo="https://mux.com/favicon-32x32.png" group-title="Demo",Mux Demo
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="3" tvg-name="Tears of Steel" tvg-logo="https://mango.blender.org/wp-content/themes/mango/favicon.ico" group-title="Demo",Tears of Steel
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8
#EXTINF:-1 tvg-id="4" tvg-name="Red Bull TV" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Red_Bull_TV_logo.svg/1200px-Red_Bull_TV_logo.svg.png" group-title="Live",Red Bull TV
https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8
#EXTINF:-1 tvg-id="5" tvg-name="Apple Variant Test" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" group-title="Demo",Apple Variant Test
https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/gear1/prog_index.m3u8`;

export const PLAYLIST_PRESETS: PlaylistPreset[] = [
  {
    content: STREAMFLOW_DEMO_PLAYLIST,
    description: "Built-in sample streams for app testing.",
    id: "streamflow-demo",
    label: "Streamflow Demo",
    mode: "text",
    sourceLabel: "Streamflow Demo",
    sourceType: "text",
  },
  {
    description: "Public free-TV mix with fewer dead links than giant dumps.",
    id: "free-tv",
    label: "Free TV",
    mode: "url",
    sourceLabel: "Free TV Public Playlist",
    sourceType: "url",
    url: "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
  },
  {
    description: "FAST-heavy lineup from Pluto, Plex, Samsung TV Plus, and similar.",
    id: "rw1986-fast",
    label: "FAST Lineup",
    mode: "url",
    sourceLabel: "RW1986 FAST Lineup",
    sourceType: "url",
    url: "https://raw.githubusercontent.com/RW1986/IPTV/main/lineup.m3u8",
  },
  {
    description: "Large global free-TV grab bag. Big library, mixed quality.",
    id: "world-mix",
    label: "World Mix",
    mode: "url",
    sourceLabel: "Free IPTV World Mix",
    sourceType: "url",
    url: "https://raw.githubusercontent.com/Free-IPTV/Countries/master/ZZ_PLAYLIST_ALL_TV.m3u",
  },
];

export function getPlaylistPreset(presetId: string): PlaylistPreset | undefined {
  return PLAYLIST_PRESETS.find((preset) => preset.id === presetId);
}

export function normalizePlaylistImportUrl(url: string): string {
  const trimmedUrl = url.trim();
  const githubPattern =
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/i;
  const githubMatch = trimmedUrl.match(githubPattern);

  if (!githubMatch) {
    return trimmedUrl;
  }

  const [, owner, repo, branch, path] = githubMatch;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}
