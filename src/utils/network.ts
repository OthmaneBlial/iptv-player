declare const __ENABLE_STREAM_PROXY__: boolean | undefined;

const STREAM_PROXY_PATH = "/__stream_proxy__";

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isStreamProxyEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof __ENABLE_STREAM_PROXY__ !== "undefined" &&
    __ENABLE_STREAM_PROXY__ === true
  );
}

export function getProxyAwareUrl(url: string): string {
  if (!isStreamProxyEnabled() || !isHttpUrl(url) || typeof window === "undefined") {
    return url;
  }

  const proxiedUrl = new URL(STREAM_PROXY_PATH, window.location.origin);
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
