import {
  activatePlaylist,
  deletePlaylist,
  duplicatePlaylist,
  exportPlaylistLibrary,
  fetchPlaylist,
  filterChannels,
  importPlaylistLibraryBackup,
  importPlaylistFromText,
  loadPlaylistFile,
  renamePlaylist,
  setDefaultPlaylist,
} from "./playlist";
import { clearHistory } from "./history"; // Import the clearHistory function

export function setupEventListeners(): void {
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
    filterChannels(query);
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
      importPlaylistFromText(text, {
        sourceLabel: "pasted playlist",
        sourceType: "text",
        url: "pasted-playlist",
      });
    } catch (error) {
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
        const nextName = prompt("Rename playlist", "");
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

  // Collapsible Sections with Accordion Behavior
  const listTitles = document.querySelectorAll(
    ".list-title"
  ) as NodeListOf<HTMLElement>;

  listTitles.forEach((title) => {
    title.addEventListener("click", () => {
      const targetId = title.getAttribute("data-target") || "";
      const targetList = document.getElementById(targetId) as HTMLElement;
      const icon = title.querySelector("i") as HTMLElement;

      const isCollapsed = targetList.classList.contains("collapsed");

      // Collapse all sections
      listTitles.forEach((t) => {
        const tId = t.getAttribute("data-target") || "";
        const tList = document.getElementById(tId) as HTMLElement;
        const tIcon = t.querySelector("i") as HTMLElement;

        tList.classList.add("collapsed");
        tIcon.classList.remove("fa-chevron-up");
        tIcon.classList.add("fa-chevron-down");
      });

      // Toggle current section
      if (isCollapsed) {
        targetList.classList.remove("collapsed");
        icon.classList.remove("fa-chevron-down");
        icon.classList.add("fa-chevron-up");
      } else {
        targetList.classList.add("collapsed");
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
    });
  });
}
