declare const __ENABLE_STREAM_PROXY__: boolean | undefined;

const DEV_STREAM_PROXY_PATH = "/__stream_proxy__";
const PROD_STREAM_PROXY_PATH = "/api/stream";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isStreamProxyEnabled(): boolean {
  return typeof window !== "undefined";
}

export function getProxyAwareUrl(url: string): string {
  if (!isHttpUrl(url) || typeof window === "undefined") {
    return url;
  }

  // In development, use webpack proxy; in production, use service worker
  const proxyPath =
    typeof __ENABLE_STREAM_PROXY__ !== "undefined" && __ENABLE_STREAM_PROXY__ === true
      ? DEV_STREAM_PROXY_PATH
      : PROD_STREAM_PROXY_PATH;

  const proxiedUrl = new URL(proxyPath, window.location.origin);
  proxiedUrl.searchParams.set("url", url);
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
