import { appStore } from "../store/appStore";
import {
  Channel,
  PlaylistLibrarySnapshot,
  PlaylistRecord,
} from "../types/models";
import { getFavorites, toggleFavorite } from "./favorites";
import {
  setStoredPlaylist,
  setStoredPlaylistLibrary,
} from "./storage";

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
  const { playlists } = appStore.getState();
  const nextPlaylists = [playlist, ...playlists];
  appStore.setPlaylists(nextPlaylists);
  appStore.setActivePlaylistId(playlist.id);
  if (!appStore.getState().defaultPlaylistId) {
    appStore.setDefaultPlaylistId(playlist.id);
  }
  setStoredPlaylist(playlist);
  persistPlaylistLibrary();
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
  const { filters } = appStore.getState();
  const channels = getActivePlaylist()?.channels || [];
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
    id: createPlaylistId(),
    lastLoadedAt: new Date().toISOString(),
    name: label.replace(/\.m3u8?$/i, "") || "Imported playlist",
    sourceLabel: options.sourceLabel,
    sourceType: options.sourceType,
    url: options.url,
  };
}

export function renderPlaylistState(): void {
  renderPlaylistLibrary();
  loadedChannels = 0;
  clearChannels();
  displayChannels();
  updateChannelCount();

  const activePlaylist = getActivePlaylist();
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
    .playlists.flatMap((playlist) => playlist.channels)
    .find((channel) => channel.url === url);
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

function createPlaylistId(): string {
  return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActivePlaylist(): PlaylistRecord | null {
  const { activePlaylistId, defaultPlaylistId, playlists } = appStore.getState();
  return (
    playlists.find((playlist) => playlist.id === activePlaylistId) ||
    playlists.find((playlist) => playlist.id === defaultPlaylistId) ||
    playlists[0] ||
    null
  );
}

function persistPlaylistLibrary(): void {
  const snapshot: PlaylistLibrarySnapshot = {
    activePlaylistId: appStore.getState().activePlaylistId,
    defaultPlaylistId: appStore.getState().defaultPlaylistId,
    playlists: appStore.getState().playlists,
  };

  setStoredPlaylistLibrary(snapshot);

  const activePlaylist = getActivePlaylist();
  if (activePlaylist) {
    setStoredPlaylist(activePlaylist);
  }
}

export function activatePlaylist(playlistId: string): void {
  appStore.setActivePlaylistId(playlistId);
  persistPlaylistLibrary();
  renderPlaylistState();
}

export function renamePlaylist(playlistId: string, nextName: string): void {
  const trimmedName = nextName.trim();
  if (!trimmedName) {
    return;
  }

  appStore.setPlaylists(
    appStore.getState().playlists.map((playlist) =>
      playlist.id === playlistId
        ? {
            ...playlist,
            name: trimmedName,
          }
        : playlist
    )
  );
  persistPlaylistLibrary();
  renderPlaylistState();
}

export function duplicatePlaylist(playlistId: string): void {
  const playlist = appStore
    .getState()
    .playlists.find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }

  const duplicate: PlaylistRecord = {
    ...playlist,
    id: createPlaylistId(),
    lastLoadedAt: new Date().toISOString(),
    name: `${playlist.name} Copy`,
  };

  appStore.setPlaylists([duplicate, ...appStore.getState().playlists]);
  appStore.setActivePlaylistId(duplicate.id);
  persistPlaylistLibrary();
  renderPlaylistState();
}

export function deletePlaylist(playlistId: string): void {
  const remainingPlaylists = appStore
    .getState()
    .playlists.filter((playlist) => playlist.id !== playlistId);
  const nextActivePlaylistId =
    appStore.getState().activePlaylistId === playlistId
      ? remainingPlaylists[0]?.id || null
      : appStore.getState().activePlaylistId;
  const nextDefaultPlaylistId =
    appStore.getState().defaultPlaylistId === playlistId
      ? remainingPlaylists[0]?.id || null
      : appStore.getState().defaultPlaylistId;

  appStore.setPlaylists(remainingPlaylists);
  appStore.setActivePlaylistId(nextActivePlaylistId);
  appStore.setDefaultPlaylistId(nextDefaultPlaylistId);
  persistPlaylistLibrary();
  renderPlaylistState();
}

export function setDefaultPlaylist(playlistId: string): void {
  appStore.setDefaultPlaylistId(playlistId);
  persistPlaylistLibrary();
  renderPlaylistState();
}

export function exportPlaylistLibrary(): void {
  const snapshot: PlaylistLibrarySnapshot = {
    activePlaylistId: appStore.getState().activePlaylistId,
    defaultPlaylistId: appStore.getState().defaultPlaylistId,
    playlists: appStore.getState().playlists,
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "iptv-playlist-library.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function importPlaylistLibraryBackup(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as PlaylistLibrarySnapshot;
  const playlists = Array.isArray(parsed.playlists) ? parsed.playlists : [];
  appStore.setPlaylists(playlists);
  appStore.setActivePlaylistId(parsed.activePlaylistId || playlists[0]?.id || null);
  appStore.setDefaultPlaylistId(
    parsed.defaultPlaylistId || parsed.activePlaylistId || playlists[0]?.id || null
  );
  persistPlaylistLibrary();
  renderPlaylistState();
  setPlaylistFeedback(`Imported ${playlists.length} saved playlists.`, "success");
}

export function renderPlaylistLibrary(): void {
  const playlistLibraryList = document.getElementById("playlistLibraryList");
  if (!playlistLibraryList) {
    return;
  }

  const { activePlaylistId, defaultPlaylistId, playlists } = appStore.getState();
  if (!playlists.length) {
    playlistLibraryList.innerHTML =
      '<li class="playlist-library-empty">No saved playlists yet. Import one to get started.</li>';
    return;
  }

  playlistLibraryList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  playlists.forEach((playlist) => {
    const item = document.createElement("li");
    item.className = `playlist-library-item${
      playlist.id === activePlaylistId ? " is-active" : ""
    }`;
    item.setAttribute("data-playlist-id", playlist.id);
    item.innerHTML = `
      <button class="playlist-library-main" data-library-action="activate">
        <div>
          <p class="playlist-library-name">${playlist.name}</p>
          <div class="playlist-library-meta">
            <span>${playlist.channels.length} channels</span>
            <span>${playlist.sourceType}</span>
            <span>${new Date(playlist.lastLoadedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="playlist-library-badges">
          ${
            playlist.id === activePlaylistId
              ? '<span class="playlist-badge playlist-badge--active">Active</span>'
              : ""
          }
          ${
            playlist.id === defaultPlaylistId
              ? '<span class="playlist-badge">Default</span>'
              : ""
          }
        </div>
      </button>
      <div class="playlist-library-actions">
        <button class="playlist-action-button" data-library-action="rename">Rename</button>
        <button class="playlist-action-button" data-library-action="duplicate">Duplicate</button>
        <button class="playlist-action-button" data-library-action="default">Set Default</button>
        <button class="playlist-action-button" data-library-action="delete">Delete</button>
      </div>
    `;
    fragment.appendChild(item);
  });

  playlistLibraryList.appendChild(fragment);
}
