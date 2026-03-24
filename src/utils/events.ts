import {
  activatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  exportPlaylistLibrary,
  fetchPlaylist,
  filterChannels,
  getPlaylistById,
  importPlaylistLibraryBackup,
  importPlaylistFromText,
  loadPlaylistFile,
  renamePlaylist,
  renderPlaylistState,
  setQuickGroupFilter,
  setDefaultPlaylist,
  updateChannelDiscoveryFilters,
} from "./playlist";
import { loadEpgFile, loadEpgFromUrl } from "./epg";
import { displayFavorites } from "./favorites";
import { clearHistory, displayHistory } from "./history";
import {
  confirmSourceWorking,
  reportSourceIssue,
  scanActivePlaylistHealth,
} from "./sourceHealth";

export function setupEventListeners(): void {
  let searchDebounceTimer = 0;
  const importBtn = document.getElementById("importPlaylist") as HTMLElement;
  const playlistUrlInput = document.getElementById(
    "playlistUrl"
  ) as HTMLInputElement;
  const playlistFileInput = document.getElementById(
    "playlistFile"
  ) as HTMLInputElement;
  const rawPlaylistInput = document.getElementById(
    "rawPlaylistInput"
  ) as HTMLTextAreaElement;
  const loadRawPlaylistBtn = document.getElementById(
    "loadRawPlaylist"
  ) as HTMLElement;
  const epgUrlInput = document.getElementById("epgUrl") as HTMLInputElement;
  const loadEpgUrlBtn = document.getElementById("loadEpgUrl") as HTMLElement;
  const epgFileInput = document.getElementById("epgFile") as HTMLInputElement;
  const playlistDropZone = document.getElementById(
    "playlistDropZone"
  ) as HTMLElement;
  const playlistLibraryList = document.getElementById(
    "playlistLibraryList"
  ) as HTMLElement;
  const exportPlaylistLibraryBtn = document.getElementById(
    "exportPlaylistLibrary"
  ) as HTMLElement;
  const importPlaylistLibraryFile = document.getElementById(
    "importPlaylistLibraryFile"
  ) as HTMLInputElement;
  const searchChannelsInput = document.getElementById(
    "searchChannels"
  ) as HTMLInputElement;
  const channelGroupFilter = document.getElementById(
    "channelGroupFilter"
  ) as HTMLSelectElement;
  const channelCountryFilter = document.getElementById(
    "channelCountryFilter"
  ) as HTMLSelectElement;
  const channelLanguageFilter = document.getElementById(
    "channelLanguageFilter"
  ) as HTMLSelectElement;
  const channelSort = document.getElementById(
    "channelSort"
  ) as HTMLSelectElement;
  const channelGroupChips = document.getElementById(
    "channelGroupChips"
  ) as HTMLElement;
  const scanSourceHealthBtn = document.getElementById(
    "scanSourceHealth"
  ) as HTMLElement;
  const sourceHealthList = document.getElementById(
    "sourceHealthList"
  ) as HTMLElement;
  const clearHistoryBtn = document.getElementById(
    "clearHistory"
  ) as HTMLElement; // Get the Clear History button

  importBtn.addEventListener("click", () => {
    const url = playlistUrlInput.value.trim();
    if (url) {
      fetchPlaylist(url);
    } else {
      alert("Please enter a valid M3U/M3U8 URL.");
    }
  });

  searchChannelsInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => {
      filterChannels(query);
    }, 120);
  });

  channelGroupFilter.addEventListener("change", (event) => {
    updateChannelDiscoveryFilters({
      group: (event.target as HTMLSelectElement).value,
    });
  });

  channelCountryFilter.addEventListener("change", (event) => {
    updateChannelDiscoveryFilters({
      country: (event.target as HTMLSelectElement).value,
    });
  });

  channelLanguageFilter.addEventListener("change", (event) => {
    updateChannelDiscoveryFilters({
      language: (event.target as HTMLSelectElement).value,
    });
  });

  channelSort.addEventListener("change", (event) => {
    updateChannelDiscoveryFilters({
      sort: (event.target as HTMLSelectElement).value as
        | "favorites"
        | "group"
        | "health"
        | "name"
        | "recent",
    });
  });

  channelGroupChips.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const group = target.getAttribute("data-group-chip");
    if (!group) {
      return;
    }

    setQuickGroupFilter(group);
  });

  playlistUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      importBtn.click();
    }
  });

  playlistFileInput.addEventListener("change", async () => {
    const [file] = playlistFileInput.files || [];
    if (!file) {
      return;
    }

    await loadPlaylistFile(file);
    playlistFileInput.value = "";
  });

  loadRawPlaylistBtn.addEventListener("click", () => {
    const text = rawPlaylistInput.value.trim();
    if (!text) {
      alert("Paste playlist content before loading raw text.");
      return;
    }

    try {
      void importPlaylistFromText(text, {
        sourceLabel: "pasted playlist",
        sourceType: "text",
        url: "pasted-playlist",
      });
    } catch (error) {
      console.error(error);
    }
  });

  loadEpgUrlBtn.addEventListener("click", async () => {
    const url = epgUrlInput.value.trim();
    if (!url) {
      alert("Enter an XMLTV URL before loading the EPG.");
      return;
    }

    try {
      await loadEpgFromUrl(url);
    } catch (error) {
      console.error(error);
    }
  });

  epgFileInput.addEventListener("change", async () => {
    const [file] = epgFileInput.files || [];
    if (!file) {
      return;
    }

    try {
      await loadEpgFile(file);
      epgFileInput.value = "";
    } catch (error) {
      alert("Could not import the EPG file.");
      console.error(error);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    playlistDropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      playlistDropZone.classList.add("is-active");
    });
  });

  ["dragleave", "dragend"].forEach((eventName) => {
    playlistDropZone.addEventListener(eventName, () => {
      playlistDropZone.classList.remove("is-active");
    });
  });

  playlistDropZone.addEventListener("click", () => {
    playlistFileInput.click();
  });

  playlistDropZone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    playlistFileInput.click();
  });

  playlistDropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    playlistDropZone.classList.remove("is-active");
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    await loadPlaylistFile(file);
  });

  playlistLibraryList.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target
      .closest("[data-library-action]")
      ?.getAttribute("data-library-action");
    const playlistItem = target.closest("[data-playlist-id]");
    const playlistId = playlistItem?.getAttribute("data-playlist-id");

    if (!playlistId) {
      return;
    }

    switch (action) {
      case "rename": {
        const playlist = getPlaylistById(playlistId);
        const nextName = prompt("Rename playlist", playlist?.name || "");
        if (nextName) {
          renamePlaylist(playlistId, nextName);
        }
        break;
      }
      case "duplicate":
        duplicatePlaylist(playlistId);
        break;
      case "default":
        setDefaultPlaylist(playlistId);
        break;
      case "delete":
        if (confirm("Delete this playlist from your library?")) {
          deletePlaylist(playlistId);
        }
        break;
      case "activate":
      default:
        activatePlaylist(playlistId);
        break;
    }
  });

  exportPlaylistLibraryBtn.addEventListener("click", () => {
    exportPlaylistLibrary();
  });

  scanSourceHealthBtn?.addEventListener("click", () => {
    void scanActivePlaylistHealth().catch((error) => {
      console.error(error);
    });
  });

  sourceHealthList?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target
      .closest("[data-source-health-action]")
      ?.getAttribute("data-source-health-action");
    const sourceHealthItem = target.closest("[data-source-health-url]");
    const url = sourceHealthItem?.getAttribute("data-source-health-url") || "";
    const name =
      sourceHealthItem?.getAttribute("data-source-health-name") || "Unknown channel";

    if (!action || !url) {
      return;
    }

    if (action === "confirm") {
      confirmSourceWorking(url, name);
      return;
    }

    if (action === "report") {
      reportSourceIssue(url, name);
    }
  });

  importPlaylistLibraryFile.addEventListener("change", async () => {
    const [file] = importPlaylistLibraryFile.files || [];
    if (!file) {
      return;
    }

    try {
      await importPlaylistLibraryBackup(file);
      importPlaylistLibraryFile.value = "";
    } catch (error) {
      alert("Could not import playlist backup.");
      console.error(error);
    }
  });

  // Event listener for Clear History button
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your history?")) {
      clearHistory();
    }
  });

  window.addEventListener("app:source-health-updated", () => {
    renderPlaylistState();
  });

  window.addEventListener("app:profile-updated", () => {
    renderPlaylistState();
    displayFavorites();
    displayHistory();
  });

  window.addEventListener("app:set-group-filter", (event: Event) => {
    const detail = (event as CustomEvent<{ group: string }>).detail;
    if (!detail?.group) {
      return;
    }

    setQuickGroupFilter(detail.group);
  });
}
