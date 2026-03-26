import { appStore } from "../store/appStore";
import {
  Channel,
  PlaylistLibrarySnapshot,
  PlaylistRecord,
} from "../types/models";
import {
  createCollectionItemElement,
  renderEmptyCollectionState,
} from "./collections";
import { getGuideSearchText } from "./epg";
import {
  getFavorites,
  isPinned,
  toggleFavorite,
  togglePinned,
} from "./favorites";
import { logDiagnostic } from "./diagnostics";
import { getProxyAwareUrl } from "./network";
import { normalizePlaylistImportUrl } from "./playlistPresets";
import { isGroupBlockedForProfile } from "./profiles";
import {
  getSourceHealthLabel,
  getSourceHealthRank,
} from "./sourceHealth";
import {
  setStoredPlaylistLibrary,
} from "./storage";
import { initWasm, parsePlaylistSync, fuzzyScoreSync } from "./api";

// Initialize WASM module on load
initWasm().catch(console.error);

let loadedChannels = 0;
const CHANNELS_PER_LOAD = 50;
let observer: IntersectionObserver | null = null;
let filteredChannelsCache: Channel[] = [];
let filteredChannelsCacheKey = "";

async function parseM3UAsync(data: string, baseUrl = ""): Promise<Channel[]> {
  // Use WASM parser for better performance
  const { iptvApi } = await import("./api");
  return await iptvApi.parsePlaylist(data, baseUrl);
}

export async function fetchPlaylist(
  url: string,
  options: {
    sourceLabel?: string;
  } = {}
): Promise<void> {
  const requestUrl = normalizePlaylistImportUrl(url);
  const loadingLabel = options.sourceLabel || requestUrl;

  try {
    setPlaylistFeedback(`Loading ${loadingLabel}...`, "neutral");
    const response = await fetch(getProxyAwareUrl(requestUrl));
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.text();
    const resolvedUrl = response.url || requestUrl;
    await importPlaylistFromText(data, {
      sourceLabel: options.sourceLabel || resolvedUrl,
      sourceType: "url",
      url: resolvedUrl,
    });
  } catch (error) {
    logDiagnostic("error", "Remote playlist import failed.", requestUrl);
    setPlaylistFeedback(
      `Failed to load ${loadingLabel}. Check the URL and try again.`,
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
    await importPlaylistFromText(text, {
      sourceLabel: file.name,
      sourceType: "file",
      url: file.name,
    });
  } catch (error) {
    logDiagnostic("error", "Playlist file import failed.", file.name);
    setPlaylistFeedback("Failed to read the selected file.", "error");
    console.error(error);
  }
}

export async function importPlaylistFromText(
  data: string,
  options: {
    sourceLabel: string;
    sourceType: PlaylistRecord["sourceType"];
    url: string;
  }
): Promise<void> {
  const channels = await parseM3UAsync(data, options.url);
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
  renderPlaylistState();
  try {
    await persistPlaylistLibrary();
    setPlaylistFeedback(
      `Imported ${channels.length} channels from ${options.sourceLabel}.`,
      "success"
    );
  } catch (error) {
    logDiagnostic("warn", "Playlist imported but local save failed.", options.sourceLabel);
    setPlaylistFeedback(
      `Imported ${channels.length} channels, but local save failed. The current session still works.`,
      "error"
    );
    console.error(error);
  }
  logDiagnostic(
    "info",
    `Imported playlist with ${channels.length} channels.`,
    options.sourceLabel
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
        country: currentChannel.country || "",
        displayName: currentChannel.displayName || currentChannel.name || "Unknown",
        group: currentChannel.group || "Ungrouped",
        id: currentChannel.id || "",
        language: currentChannel.language || "",
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
    country: attributes["tvg-country"] || "",
    displayName: title.trim() || attributes["tvg-name"] || "Unknown",
    group: attributes["group-title"] || "Ungrouped",
    id: attributes["tvg-id"] || "",
    language: attributes["tvg-language"] || "",
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
  if (!filteredChannels.length) {
    renderEmptyCollectionState(channelsList, "No channels match the current filters.");
    updateChannelCount();
    return;
  }

  const fragment = document.createDocumentFragment();
  const end = Math.min(
    loadedChannels + CHANNELS_PER_LOAD,
    filteredChannels.length
  );
  for (let i = loadedChannels; i < end; i++) {
    const channel = filteredChannels[i];
    const li = createCollectionItemElement({
      isFavorite: getFavorites().includes(channel.url),
      isPinned: isPinned(channel.url),
      logoUrl: channel.logo,
      meta: createChannelMeta(channel),
      onPlay: () => {
        window.dispatchEvent(
          new CustomEvent("app:play-channel", {
            detail: { name: channel.displayName, url: channel.url },
          })
        );
      },
      onToggleFavorite: () => toggleFavorite(channel.url),
      onTogglePinned: () => togglePinned(channel.url),
      title: channel.displayName,
      url: channel.url,
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
  renderPlaylistState();
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

export function updateChannelDiscoveryFilters(
  filters: Partial<{
    country: string;
    group: string;
    language: string;
    sort: "favorites" | "group" | "health" | "name" | "recent";
  }>
): void {
  appStore.setFilters(filters);
  renderPlaylistState();
}

export function setQuickGroupFilter(group: string): void {
  appStore.setFilters({ group });
  renderPlaylistState();
}

export function getPlaylistById(playlistId: string): PlaylistRecord | undefined {
  return appStore
    .getState()
    .playlists.find((playlist) => playlist.id === playlistId);
}

export function playAdjacentChannel(direction: -1 | 1): void {
  const channels = getFilteredChannels();
  if (!channels.length) {
    return;
  }

  const currentUrl = appStore.getState().player.currentChannel?.url;
  const currentIndex = channels.findIndex((channel) => channel.url === currentUrl);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + direction + channels.length) % channels.length;
  const nextChannel = channels[nextIndex];

  window.dispatchEvent(
    new CustomEvent("app:play-channel", {
      detail: { name: nextChannel.displayName, url: nextChannel.url },
    })
  );
}

function getFilteredChannels(): Channel[] {
  const { filters } = appStore.getState();
  const channels = getActivePlaylist()?.channels || [];
  const cacheKey = JSON.stringify({
    activePlaylistId: getActivePlaylist()?.id || "none",
    epgLoadedAt: appStore.getState().epg.loadedAt,
    favorites: appStore.getState().favorites
      .map((favorite) => `${favorite.url}:${favorite.pinned}`)
      .join("|"),
    filters,
    history: appStore.getState().history.map((item) => item.url).join("|"),
    activeProfileId: appStore.getState().activeProfileId,
    profileAccessUnlocked: appStore.getState().profileAccessUnlocked,
    sourceHealth: appStore.getState().sourceHealth
      .map((entry) => `${entry.url}:${entry.status}:${entry.positiveReports}:${entry.negativeReports}:${entry.failures}`)
      .join("|"),
  });
  if (cacheKey === filteredChannelsCacheKey) {
    return filteredChannelsCache;
  }

  const normalizedQuery = filters.query.toLowerCase();

  const filtered = channels.filter((channel) => {
    if (isGroupBlockedForProfile(channel.group)) {
      return false;
    }
    if (filters.group !== "all" && channel.group !== filters.group) {
      return false;
    }
    if (filters.country !== "all" && channel.country !== filters.country) {
      return false;
    }
    if (filters.language !== "all" && channel.language !== filters.language) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return (
      getFuzzyScore(channel.displayName, normalizedQuery) >= 0 ||
      getFuzzyScore(channel.group, normalizedQuery) >= 0 ||
      getFuzzyScore(channel.country, normalizedQuery) >= 0 ||
      getFuzzyScore(channel.language, normalizedQuery) >= 0 ||
      getFuzzyScore(getGuideSearchText(channel.url), normalizedQuery) >= 0
    );
  });

  const sorted = sortChannels(filtered);
  if (!normalizedQuery) {
    filteredChannelsCache = sorted;
    filteredChannelsCacheKey = cacheKey;
    return filteredChannelsCache;
  }

  filteredChannelsCache = sorted.sort((left, right) => {
    const leftScore = Math.max(
      getFuzzyScore(left.displayName, normalizedQuery),
      getFuzzyScore(left.group, normalizedQuery),
      getFuzzyScore(left.country, normalizedQuery),
      getFuzzyScore(left.language, normalizedQuery),
      getFuzzyScore(getGuideSearchText(left.url), normalizedQuery)
    );
    const rightScore = Math.max(
      getFuzzyScore(right.displayName, normalizedQuery),
      getFuzzyScore(right.group, normalizedQuery),
      getFuzzyScore(right.country, normalizedQuery),
      getFuzzyScore(right.language, normalizedQuery),
      getFuzzyScore(getGuideSearchText(right.url), normalizedQuery)
    );
    return rightScore - leftScore;
  });
  filteredChannelsCacheKey = cacheKey;
  return filteredChannelsCache;
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
  renderDiscoveryControls();
  filteredChannelsCache = [];
  filteredChannelsCacheKey = "";
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

function getDiscoveryOptions(): {
  countries: string[];
  groups: string[];
  languages: string[];
} {
  const activePlaylist = getActivePlaylist();
  const channels = activePlaylist?.channels || [];

  return {
    countries: getUniqueSortedValues(channels.map((channel) => channel.country)),
    groups: getUniqueSortedValues(channels.map((channel) => channel.group)),
    languages: getUniqueSortedValues(channels.map((channel) => channel.language)),
  };
}

function getUniqueSortedValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function getRecentChannelOrder(): string[] {
  return appStore.getState().history.map((item) => item.url);
}

function getFuzzyScore(value: string, query: string): number {
  if (!query) {
    return 0;
  }

  // Use WASM fuzzy score for better performance
  return fuzzyScoreSync(value, query);
}

function sortChannels(channels: Channel[]): Channel[] {
  const { sort } = appStore.getState().filters;
  const favorites = new Set(getFavorites());
  const recentOrder = getRecentChannelOrder();

  return [...channels].sort((left, right) => {
    if (sort === "health") {
      const healthDelta = getSourceHealthRank(right.url) - getSourceHealthRank(left.url);
      if (healthDelta !== 0) {
        return healthDelta;
      }
    }

    if (sort === "favorites") {
      const favoriteDelta =
        Number(favorites.has(right.url)) - Number(favorites.has(left.url));
      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }
    }

    if (sort === "recent") {
      const leftIndex = recentOrder.indexOf(left.url);
      const rightIndex = recentOrder.indexOf(right.url);
      if (leftIndex !== rightIndex) {
        if (leftIndex === -1) {
          return 1;
        }
        if (rightIndex === -1) {
          return -1;
        }
        return leftIndex - rightIndex;
      }
    }

    if (sort === "group") {
      const groupCompare = left.group.localeCompare(right.group);
      if (groupCompare !== 0) {
        return groupCompare;
      }
    }

    const healthDelta = getSourceHealthRank(right.url) - getSourceHealthRank(left.url);
    if (healthDelta !== 0) {
      return healthDelta;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

function renderDiscoveryControls(): void {
  const groupFilter = document.getElementById(
    "channelGroupFilter"
  ) as HTMLSelectElement | null;
  const countryFilter = document.getElementById(
    "channelCountryFilter"
  ) as HTMLSelectElement | null;
  const languageFilter = document.getElementById(
    "channelLanguageFilter"
  ) as HTMLSelectElement | null;
  const sortFilter = document.getElementById(
    "channelSort"
  ) as HTMLSelectElement | null;
  const groupChips = document.getElementById("channelGroupChips");

  const { countries, groups, languages } = getDiscoveryOptions();
  const filters = appStore.getState().filters;

  if (groupFilter) {
    groupFilter.innerHTML = `<option value="all">All Categories</option>${groups
      .map((group) => `<option value="${group}">${group}</option>`)
      .join("")}`;
    groupFilter.value = filters.group;
  }

  if (countryFilter) {
    countryFilter.innerHTML = `<option value="all">All Countries</option>${countries
      .map((country) => `<option value="${country}">${country}</option>`)
      .join("")}`;
    countryFilter.value = filters.country;
  }

  if (languageFilter) {
    languageFilter.innerHTML = `<option value="all">All Languages</option>${languages
      .map((language) => `<option value="${language}">${language}</option>`)
      .join("")}`;
    languageFilter.value = filters.language;
  }

  if (sortFilter) {
    sortFilter.value = filters.sort;
  }

  if (groupChips) {
    const featuredGroups = groups.slice(0, 8);
    groupChips.innerHTML = `
      <button class="channel-chip${
        filters.group === "all" ? " is-active" : ""
      }" data-group-chip="all">All</button>
      ${featuredGroups
        .map(
          (group) => `<button class="channel-chip${
            filters.group === group ? " is-active" : ""
          }" data-group-chip="${group}">${group}</button>`
        )
        .join("")}
    `;
  }
}

function createChannelMeta(channel: Channel): string {
  const healthLabel = getSourceHealthLabel(channel.url);

  return [healthLabel, channel.group, channel.country, channel.language]
    .filter(Boolean)
    .join(" • ");
}

function createChannelLogoMarkup(channel: Channel): string {
  if (channel.logo) {
    return `<img class="channel-logo" src="${channel.logo}" alt="${channel.displayName} logo" loading="lazy" />`;
  }

  return `<span class="channel-logo-placeholder">${channel.displayName
    .slice(0, 1)
    .toUpperCase()}</span>`;
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

async function persistPlaylistLibrary(): Promise<void> {
  const snapshot: PlaylistLibrarySnapshot = {
    activePlaylistId: appStore.getState().activePlaylistId,
    defaultPlaylistId: appStore.getState().defaultPlaylistId,
    playlists: appStore.getState().playlists,
  };

  await setStoredPlaylistLibrary(snapshot);
}

function persistPlaylistLibraryInBackground(context: string): void {
  void persistPlaylistLibrary().catch((error) => {
    logDiagnostic("warn", "Playlist changes were not saved locally.", context);
    setPlaylistFeedback(
      "The current session updated, but local save failed. Keep this tab open or export a backup.",
      "error"
    );
    console.error(error);
  });
}

export function activatePlaylist(playlistId: string): void {
  appStore.setActivePlaylistId(playlistId);
  persistPlaylistLibraryInBackground(playlistId);
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
  persistPlaylistLibraryInBackground(playlistId);
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
  persistPlaylistLibraryInBackground(playlistId);
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
  persistPlaylistLibraryInBackground(playlistId);
  renderPlaylistState();
}

export function setDefaultPlaylist(playlistId: string): void {
  appStore.setDefaultPlaylistId(playlistId);
  persistPlaylistLibraryInBackground(playlistId);
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
  renderPlaylistState();
  try {
    await persistPlaylistLibrary();
    setPlaylistFeedback(`Imported ${playlists.length} saved playlists.`, "success");
  } catch (error) {
    setPlaylistFeedback(
      "Imported the backup for this session, but local save failed afterward.",
      "error"
    );
    console.error(error);
  }
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
