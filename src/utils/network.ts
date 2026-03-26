declare const __ENABLE_STREAM_PROXY__: boolean | undefined;

const DEV_STREAM_PROXY_PATH = "/__stream_proxy__";
const PROD_STREAM_PROXY_PATH = "/api/stream";
const PLUTO_CHANNEL_PATH_PATTERN = /\/channel\/([a-z0-9]+)\/master\.m3u8$/i;

function createSessionIdentifier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isPlutoStreamUrl(url: URL): boolean {
  return (
    /(^|\.)pluto\.tv$/i.test(url.hostname) &&
    PLUTO_CHANNEL_PATH_PATTERN.test(url.pathname)
  );
}

function createPlutoPlaybackUrl(channelId: string): string {
  const streamUrl = new URL(
    `https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/${channelId}/master.m3u8`
  );

  streamUrl.searchParams.set("appName", "web");
  streamUrl.searchParams.set("appVersion", "unknown");
  streamUrl.searchParams.set("deviceVersion", "unknown");
  streamUrl.searchParams.set("deviceType", "web");
  streamUrl.searchParams.set("deviceMake", "browser");
  streamUrl.searchParams.set("deviceModel", "web");
  streamUrl.searchParams.set("deviceId", createSessionIdentifier());
  streamUrl.searchParams.set("sid", createSessionIdentifier());
  streamUrl.searchParams.set("deviceDNT", "0");
  streamUrl.searchParams.set("deviceLat", "0");
  streamUrl.searchParams.set("deviceLon", "0");
  streamUrl.searchParams.set("advertisingId", createSessionIdentifier());
  streamUrl.searchParams.set("includeExtendedEvents", "false");
  streamUrl.searchParams.set("serverSideAds", "true");

  return streamUrl.toString();
}

export function normalizePlayableUrl(url: string): string {
  if (!isHttpUrl(url)) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    const channelMatch = parsedUrl.pathname.match(PLUTO_CHANNEL_PATH_PATTERN);
    if (!channelMatch || !isPlutoStreamUrl(parsedUrl)) {
      return url;
    }

    return createPlutoPlaybackUrl(channelMatch[1]);
  } catch {
    return url;
  }
}

export function isStreamProxyEnabled(): boolean {
  return typeof window !== "undefined";
}

export function getProxyAwareUrl(url: string): string {
  const normalizedUrl = normalizePlayableUrl(url);
  if (!isHttpUrl(normalizedUrl) || typeof window === "undefined") {
    return normalizedUrl;
  }

  // In development, use webpack proxy; in production, use service worker
  const proxyPath =
    typeof __ENABLE_STREAM_PROXY__ !== "undefined" && __ENABLE_STREAM_PROXY__ === true
      ? DEV_STREAM_PROXY_PATH
      : PROD_STREAM_PROXY_PATH;

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (
      parsedUrl.origin === window.location.origin &&
      parsedUrl.pathname === proxyPath &&
      parsedUrl.searchParams.has("url")
    ) {
      return normalizedUrl;
    }
  } catch {
    return normalizedUrl;
  }

  const proxiedUrl = new URL(proxyPath, window.location.origin);
  proxiedUrl.searchParams.set("url", normalizedUrl);
  return proxiedUrl.toString();
}

export function isIgnorablePlaybackError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeNamedError = error as { name?: string };
  return (
    maybeNamedError.name === "AbortError" ||
    maybeNamedError.name === "NotAllowedError"
  );
}
