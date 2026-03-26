import { getProxyAwareUrl, normalizePlayableUrl } from "./network";

describe("network helpers", () => {
  it("rewrites partner-specific Pluto URLs into generic web stitch URLs", () => {
    const normalized = normalizePlayableUrl(
      "http://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/5f4d878d3d19b30007d2e782/master.m3u8?deviceType=samsung-tvplus&deviceMake=samsung&deviceModel=samsung&deviceVersion=unknown&appVersion=unknown&deviceLat=0&deviceLon=0&deviceDNT=%7BTARGETOPT%7D&deviceId=%7BPSID%7D&advertisingId=%7BPSID%7D&us_privacy=1YNY&samsung_app_domain=%7BAPP_DOMAIN%7D&samsung_app_name=%7BAPP_NAME%7D&profileLimit=&profileFloor=&embedPartner=samsung-tvplus"
    );

    const normalizedUrl = new URL(normalized);
    expect(normalizedUrl.origin).toBe("https://service-stitcher.clusters.pluto.tv");
    expect(normalizedUrl.pathname).toBe(
      "/stitch/hls/channel/5f4d878d3d19b30007d2e782/master.m3u8"
    );
    expect(normalizedUrl.searchParams.get("deviceType")).toBe("web");
    expect(normalizedUrl.searchParams.get("deviceMake")).toBe("browser");
    expect(normalizedUrl.searchParams.get("deviceModel")).toBe("web");
    expect(normalizedUrl.searchParams.get("serverSideAds")).toBe("true");
  });

  it("leaves non-Pluto URLs unchanged", () => {
    const url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
    expect(normalizePlayableUrl(url)).toBe(url);
  });

  it("does not proxy an already proxied manifest URL twice", () => {
    const alreadyProxiedUrl =
      "http://localhost/api/stream?url=https%3A%2F%2Fexample.com%2Flive.m3u8";

    expect(getProxyAwareUrl(alreadyProxiedUrl)).toBe(alreadyProxiedUrl);
  });
});
