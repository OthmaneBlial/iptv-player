self.onmessage = (event) => {
  const { baseUrl = "", data = "" } = event.data || {};
  const lines = data.split("\n");
  const channels = [];
  let currentChannel = {};

  const parseAttributes = (metadata) => {
    const attributes = {};
    const attributePattern = /([\w-]+)="([^"]*)"/g;
    let match = attributePattern.exec(metadata);

    while (match) {
      attributes[match[1]] = match[2];
      match = attributePattern.exec(metadata);
    }

    return attributes;
  };

  const resolveChannelUrl = (url) => {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      return url;
    }

    try {
      return new URL(url, baseUrl).toString();
    } catch (error) {
      return null;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("#EXTINF")) {
      const separatorIndex = line.indexOf(",");
      const metadata =
        separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
      const title =
        separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "Unknown";
      const attributes = parseAttributes(metadata);

      currentChannel = {
        country: attributes["tvg-country"] || "",
        displayName: title.trim() || attributes["tvg-name"] || "Unknown",
        group: attributes["group-title"] || "Ungrouped",
        id: attributes["tvg-id"] || "",
        language: attributes["tvg-language"] || "",
        logo: attributes["tvg-logo"] || "",
        name: attributes["tvg-name"] || title.trim() || "Unknown",
      };
      return;
    }

    if (!line || line.startsWith("#")) {
      return;
    }

    const resolvedUrl = resolveChannelUrl(line);
    if (!resolvedUrl) {
      return;
    }

    channels.push({
      country: currentChannel.country || "",
      displayName: currentChannel.displayName || currentChannel.name || "Unknown",
      group: currentChannel.group || "Ungrouped",
      id: currentChannel.id || "",
      language: currentChannel.language || "",
      logo: currentChannel.logo || "",
      name: currentChannel.name || currentChannel.displayName || "Unknown",
      url: resolvedUrl,
    });
    currentChannel = {};
  });

  self.postMessage({ channels });
};
