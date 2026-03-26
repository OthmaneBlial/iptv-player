(function (globalScope, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  globalScope.hlsManifestProxy = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const HLS_CONTENT_TYPE_MARKERS = [
    "application/vnd.apple.mpegurl",
    "application/x-mpegurl",
    "audio/mpegurl",
    "audio/x-mpegurl",
  ];

  function isLikelyHlsManifest(targetUrl, contentType) {
    const normalizedContentType = (contentType || "").toLowerCase();

    if (
      HLS_CONTENT_TYPE_MARKERS.some((marker) => normalizedContentType.includes(marker))
    ) {
      return true;
    }

    try {
      const parsedUrl = new URL(targetUrl);
      return parsedUrl.pathname.toLowerCase().endsWith(".m3u8");
    } catch {
      return false;
    }
  }

  function shouldSkipManifestResource(value) {
    const trimmedValue = value.trim();
    return (
      trimmedValue.length === 0 ||
      trimmedValue.startsWith("#") ||
      /^(data|blob|javascript|mailto):/i.test(trimmedValue)
    );
  }

  function createProxyUrl(proxyOrigin, proxyPath, targetUrl) {
    const proxiedUrl = new URL(proxyPath, proxyOrigin);
    proxiedUrl.searchParams.set("url", targetUrl);
    return proxiedUrl.toString();
  }

  function isAlreadyProxied(targetUrl, proxyOrigin, proxyPath) {
    try {
      const parsedTargetUrl = new URL(targetUrl);
      const parsedProxyUrl = new URL(proxyPath, proxyOrigin);
      return (
        parsedTargetUrl.origin === parsedProxyUrl.origin &&
        parsedTargetUrl.pathname === parsedProxyUrl.pathname &&
        parsedTargetUrl.searchParams.has("url")
      );
    } catch {
      return false;
    }
  }

  function rewriteManifestResource(value, manifestUrl, proxyOrigin, proxyPath) {
    if (shouldSkipManifestResource(value)) {
      return value;
    }

    try {
      const absoluteResourceUrl = new URL(value, manifestUrl).toString();

      if (isAlreadyProxied(absoluteResourceUrl, proxyOrigin, proxyPath)) {
        return absoluteResourceUrl;
      }

      return createProxyUrl(proxyOrigin, proxyPath, absoluteResourceUrl);
    } catch {
      return value;
    }
  }

  function rewriteTagLine(line, manifestUrl, proxyOrigin, proxyPath) {
    return line.replace(/URI=(["'])(.*?)\1/g, (match, quote, resourceUrl) => {
      const rewrittenUrl = rewriteManifestResource(
        resourceUrl,
        manifestUrl,
        proxyOrigin,
        proxyPath
      );
      return `URI=${quote}${rewrittenUrl}${quote}`;
    });
  }

  function rewriteManifestForProxy(manifestText, manifestUrl, proxyOrigin, proxyPath) {
    return manifestText
      .split(/\r?\n/)
      .map((line) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return line;
        }

        if (trimmedLine.startsWith("#")) {
          return rewriteTagLine(line, manifestUrl, proxyOrigin, proxyPath);
        }

        return rewriteManifestResource(trimmedLine, manifestUrl, proxyOrigin, proxyPath);
      })
      .join("\n");
  }

  return {
    createProxyUrl,
    isLikelyHlsManifest,
    rewriteManifestForProxy,
  };
});
