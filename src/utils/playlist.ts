import { appStore } from "../store/appStore";
import { Channel, PlaylistRecord } from "../types/models";
import { getFavorites, toggleFavorite } from "./favorites";
import { setStoredPlaylist } from "./storage";

let loadedChannels = 0;
const CHANNELS_PER_LOAD = 50;
let observer: IntersectionObserver | null = null;

export async function fetchPlaylist(url: string): Promise<void> {
  try {
    setPlaylistFeedback("Loading playlist from remote URL...", "neutral");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.text();
    importPlaylistFromText(data, {
      sourceLabel: url,
      sourceType: "url",
      url,
    });
  } catch (error) {
    setPlaylistFeedback(
      "Failed to load playlist. Check the URL and try again.",
      "error"
    );
    alert("Failed to load playlist. Please check the URL.");
    console.error(error);
  }
}

export async function loadPlaylistFile(file: File): Promise<void> {
  try {
    setPlaylistFeedback(`Loading ${file.name}...`, "neutral");
    const text = await file.text();
    importPlaylistFromText(text, {
      sourceLabel: file.name,
      sourceType: "file",
      url: file.name,
    });
  } catch (error) {
    setPlaylistFeedback("Failed to read the selected file.", "error");
    console.error(error);
  }
}

export function importPlaylistFromText(
  data: string,
  options: {
    sourceLabel: string;
    sourceType: PlaylistRecord["sourceType"];
    url: string;
  }
): void {
  const channels = parseM3U(data, options.url);
  if (!channels.length) {
    setPlaylistFeedback(
      "No playable channels were found in the playlist content.",
      "error"
    );
    throw new Error("Playlist contained no playable channels.");
  }

  const playlist = createPlaylistRecord(options, channels);
  appStore.setPlaylist(playlist);
  setStoredPlaylist(playlist);
  renderPlaylistState();
  setPlaylistFeedback(
    `Imported ${channels.length} channels from ${options.sourceLabel}.`,
    "success"
  );
}

export function parseM3U(data: string, baseUrl = ""): Channel[] {
  const lines = data.split("\n");
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith("#EXTINF")) {
      const info = parseEXTINF(line);
      currentChannel = { ...info };
    } else if (line && !line.startsWith("#")) {
      const resolvedUrl = resolveChannelUrl(line, baseUrl);
      if (!resolvedUrl) {
        return;
      }

      currentChannel.url = resolvedUrl;
      channels.push({
        displayName: currentChannel.displayName || currentChannel.name || "Unknown",
        group: currentChannel.group || "Ungrouped",
        id: currentChannel.id || "",
        logo: currentChannel.logo || "",
        name:
          currentChannel.name ||
          currentChannel.displayName ||
          "Unknown",
        url: resolvedUrl,
      });
      currentChannel = {};
    }
  });

  return channels;
}

function parseEXTINF(line: string): Partial<Channel> {
  const separatorIndex = line.indexOf(",");
  const metadata =
    separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
  const title =
    separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "Unknown";
  const attributes = parseAttributes(metadata);

  return {
    displayName: title.trim() || attributes["tvg-name"] || "Unknown",
    group: attributes["group-title"] || "Ungrouped",
    id: attributes["tvg-id"] || "",
    logo: attributes["tvg-logo"] || "",
    name: attributes["tvg-name"] || title.trim() || "Unknown",
  };
}

function parseAttributes(metadata: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([\w-]+)="([^"]*)"/g;
  let match = attributePattern.exec(metadata);

  while (match) {
    attributes[match[1]] = match[2];
    match = attributePattern.exec(metadata);
  }

  return attributes;
}

function resolveChannelUrl(url: string, baseUrl: string): string | null {
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
    console.warn("Could not resolve relative channel URL.", error);
    return null;
  }
}

export function displayChannels(): void {
  const channelsList = document.getElementById("channelsList") as HTMLElement;
  if (!channelsList) {
    return;
  }

  const filteredChannels = getFilteredChannels();
  const fragment = document.createDocumentFragment();
  const end = Math.min(
    loadedChannels + CHANNELS_PER_LOAD,
    filteredChannels.length
  );
  for (let i = loadedChannels; i < end; i++) {
    const channel = filteredChannels[i];
    const li = document.createElement("li");
    li.classList.add("channel-item");
    li.innerHTML = `
      <span class="favorite" data-url="${channel.url}">
        <i class="${
          getFavorites().includes(channel.url) ? "fas fa-heart" : "far fa-heart"
        }"></i>
      </span>
      <div class="channel-info">
        <span class="channel-name">${channel.displayName}</span>
      </div>
    `;

    // Event listener for playing the channel
    li.addEventListener("click", (e) => {
      if (
        (e.target as HTMLElement).classList.contains("favorite") ||
        (e.target as HTMLElement).parentElement?.classList.contains("favorite")
      )
        return;
      window.dispatchEvent(
        new CustomEvent("app:play-channel", {
          detail: { name: channel.displayName, url: channel.url },
        })
      );
    });

    // Event listener for favorite button
    const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the channel play
      toggleFavorite(channel.url);
    });

    fragment.appendChild(li);
  }
  channelsList.appendChild(fragment);
  loadedChannels = end;
  observeScroll();
  updateChannelCount(); // Update the channel count after displaying channels
}

function observeScroll(): void {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && loadedChannels < getFilteredChannels().length) {
        displayChannels();
      }
    },
    { threshold: 1 }
  );
  const lastItem = document.getElementById("channelsList")?.lastElementChild;
  if (lastItem) {
    observer.observe(lastItem);
  }
}

export function filterChannels(query: string): void {
  appStore.setFilters({ query });
  loadedChannels = 0;
  clearChannels();
  displayChannels();
  updateChannelCount(); // Update the channel count after filtering
}

// Function to update the channel count in the sidebar
function updateChannelCount(): void {
  const channelCountSpan = document.getElementById(
    "channelCount"
  ) as HTMLElement;
  if (channelCountSpan) {
    channelCountSpan.textContent = getFilteredChannels().length.toString();
  }
}

function clearChannels(): void {
  const channelsList = document.getElementById("channelsList") as HTMLElement;
  if (channelsList) {
    channelsList.innerHTML = "";
  }
}

function getFilteredChannels(): Channel[] {
  const { playlist, filters } = appStore.getState();
  const channels = playlist?.channels || [];
  const normalizedQuery = filters.query.toLowerCase();

  if (!normalizedQuery) {
    return channels;
  }

  return channels.filter((channel) =>
    channel.displayName.toLowerCase().includes(normalizedQuery)
  );
}

function createPlaylistRecord(
  options: {
    sourceLabel: string;
    sourceType: PlaylistRecord["sourceType"];
    url: string;
  },
  channels: Channel[]
): PlaylistRecord {
  const label = options.sourceLabel.split("/").pop() || "Imported playlist";
  return {
    channels,
    id: "default-playlist",
    lastLoadedAt: new Date().toISOString(),
    name: label.replace(/\.m3u8?$/i, "") || "Imported playlist",
    sourceLabel: options.sourceLabel,
    sourceType: options.sourceType,
    url: options.url,
  };
}

export function renderPlaylistState(): void {
  loadedChannels = 0;
  clearChannels();
  displayChannels();
  updateChannelCount();

  const activePlaylist = appStore.getState().playlist;
  const playlistUrlInput = document.getElementById(
    "playlistUrl"
  ) as HTMLInputElement | null;
  if (playlistUrlInput && activePlaylist) {
    playlistUrlInput.value = activePlaylist.sourceType === "url" ? activePlaylist.url : "";
  }
}

export function findChannelByUrl(url: string): Channel | undefined {
  return appStore
    .getState()
    .playlist?.channels.find((channel) => channel.url === url);
}

function setPlaylistFeedback(
  message: string,
  tone: "error" | "neutral" | "success"
): void {
  const feedback = document.getElementById("playlistFeedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.setAttribute("data-tone", tone);
}
