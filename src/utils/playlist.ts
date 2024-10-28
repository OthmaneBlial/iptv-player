import Hls from "hls.js";
import { addToHistory } from "./history";
import { getFavorites, loadFavorites, toggleFavorite } from "./favorites";

interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  displayName: string;
  url: string;
}

let channels: Channel[] = [];
let filteredChannels: Channel[] = [];
let loadedChannels = 0;
const CHANNELS_PER_LOAD = 50;

export async function fetchPlaylist(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.text();
    parseM3U(data);
    localStorage.setItem("playlist", JSON.stringify({ url, channels }));
  } catch (error) {
    alert("Failed to load playlist. Please check the URL.");
    console.error(error);
  }
}

export function parseM3U(data: string): void {
  const lines = data.split("\n");
  channels = [];
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

  filteredChannels = channels;
  loadedChannels = 0;
  displayChannels();
  updateChannelCount(); // Update the channel count after parsing
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
      playChannel(channel.url, channel.displayName);
    });

    // Event listener for favorite button
    const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the channel play
      toggleFavorite(channel.url, favoriteBtn);
    });

    fragment.appendChild(li);
  }
  channelsList.appendChild(fragment);
  loadedChannels = end;
  loadFavorites();
  observeScroll();
  updateChannelCount(); // Update the channel count after displaying channels
}

function observeScroll(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        loadedChannels < filteredChannels.length
      ) {
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
  filteredChannels = channels.filter((channel) =>
    channel.displayName.toLowerCase().includes(query)
  );
  loadedChannels = 0;
  const channelsList = document.getElementById("channelsList") as HTMLElement;
  channelsList.innerHTML = "";
  displayChannels();
  updateChannelCount(); // Update the channel count after filtering
}

export function playChannel(url: string, channelName: string): void {
  const video = document.getElementById("videoPlayer") as HTMLVideoElement;

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url); // Use the absolute URL directly
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play();
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url; // Use the absolute URL directly
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
  } else {
    alert("Your browser does not support HLS playback.");
  }
  addToHistory(channelName, url);
}

// Function to update the channel count in the sidebar
function updateChannelCount(): void {
  const channelCountSpan = document.getElementById(
    "channelCount"
  ) as HTMLElement;
  if (channelCountSpan) {
    channelCountSpan.textContent = filteredChannels.length.toString();
  }
}
