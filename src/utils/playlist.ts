import { appStore } from "../store/appStore";
import { Channel, PlaylistRecord } from "../types/models";
import { getFavorites, toggleFavorite } from "./favorites";
import { setStoredPlaylist } from "./storage";

let loadedChannels = 0;
const CHANNELS_PER_LOAD = 50;
let observer: IntersectionObserver | null = null;

export async function fetchPlaylist(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.text();
    const channels = parseM3U(data);
    const playlist = createPlaylistRecord(url, channels);
    appStore.setPlaylist(playlist);
    setStoredPlaylist(playlist);
    renderPlaylistState();
  } catch (error) {
    alert("Failed to load playlist. Please check the URL.");
    console.error(error);
  }
}

export function parseM3U(data: string): Channel[] {
  const lines = data.split("\n");
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith("#EXTINF")) {
      const info = parseEXTINF(line);
      currentChannel = { ...info };
    } else if (line && !line.startsWith("#")) {
      currentChannel.url = line;
      channels.push(currentChannel as Channel);
    }
  });

  return channels;
}

function parseEXTINF(line: string): Partial<Channel> {
  const regex =
    /#EXTINF:-?\d+ tvg-id="([^"]*)" tvg-name="([^"]*)" tvg-logo="([^"]*)" group-title="([^"]*)",(.*)/;
  const match = line.match(regex);
  if (match) {
    return {
      id: match[1],
      name: match[2],
      logo: match[3],
      group: match[4],
      displayName: match[5],
    };
  } else {
    const parts = line.split(",");
    return {
      displayName: parts[1] || "Unknown",
    };
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
  url: string,
  channels: Channel[]
): PlaylistRecord {
  const label = url.split("/").pop() || "Imported playlist";
  return {
    channels,
    id: "default-playlist",
    lastLoadedAt: new Date().toISOString(),
    name: label.replace(/\.m3u8?$/i, "") || "Imported playlist",
    url,
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
    playlistUrlInput.value = activePlaylist.url;
  }
}

export function findChannelByUrl(url: string): Channel | undefined {
  return appStore
    .getState()
    .playlist?.channels.find((channel) => channel.url === url);
}
