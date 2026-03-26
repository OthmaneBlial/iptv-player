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
import { getPlaylistPreset } from "./playlistPresets";
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

  // Main sidebar elements (always present)
  const importBtn = document.getElementById("importPlaylist") as HTMLElement;
  const playlistUrlInput = document.getElementById(
    "playlistUrl"
  ) as HTMLInputElement;
  const playlistPresetSelect = document.getElementById(
    "playlistPreset"
  ) as HTMLSelectElement;
  const loadPlaylistPresetBtn = document.getElementById(
    "loadPlaylistPreset"
  ) as HTMLButtonElement;
  const searchChannelsInput = document.getElementById(
    "searchChannels"
  ) as HTMLInputElement;
  const channelGroupChips = document.getElementById(
    "channelGroupChips"
  ) as HTMLElement;

  // Only add listeners if elements exist
  importBtn?.addEventListener("click", () => {
    const url = playlistUrlInput?.value.trim();
    if (url) {
      fetchPlaylist(url);
    } else {
      alert("Please enter a valid M3U/M3U8 URL.");
    }
  });

  const loadSelectedPreset = (): void => {
    const presetId = playlistPresetSelect?.value;
    if (!presetId) {
      return;
    }

    const preset = getPlaylistPreset(presetId);
    if (!preset) {
      return;
    }

    if (preset.mode === "text") {
      playlistUrlInput.value = "";
      void importPlaylistFromText(preset.content, {
        sourceLabel: preset.sourceLabel,
        sourceType: preset.sourceType,
        url: preset.id,
      });
      return;
    }

    playlistUrlInput.value = preset.url;
    void fetchPlaylist(preset.url, {
      sourceLabel: preset.sourceLabel,
    });
  };

  loadPlaylistPresetBtn?.addEventListener("click", loadSelectedPreset);

  playlistPresetSelect?.addEventListener("change", () => {
    const preset = getPlaylistPreset(playlistPresetSelect.value);
    if (!preset) {
      return;
    }

    playlistUrlInput.value = preset.mode === "url" ? preset.url : "";
  });

  searchChannelsInput?.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => {
      filterChannels(query);
    }, 120);
  });

  channelGroupChips?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const group = target.getAttribute("data-group-chip");
    if (!group) {
      return;
    }
    setQuickGroupFilter(group);
  });

  playlistUrlInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && importBtn) {
      importBtn.click();
    }
  });

  // Settings panel elements (might not exist yet - hidden in modal)
  const setupSettingsListeners = () => {
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
    const playlistLibraryList = document.getElementById(
      "playlistLibraryList"
    ) as HTMLElement;
    const exportPlaylistLibraryBtn = document.getElementById(
      "exportPlaylistLibrary"
    ) as HTMLElement;
    const importPlaylistLibraryFile = document.getElementById(
      "importPlaylistLibraryFile"
    ) as HTMLInputElement;
    const channelGroupFilter = document.getElementById(
      "channelGroupFilter"
    ) as HTMLSelectElement;
    const channelCountryFilter = document.getElementById(
      "channelCountryFilter"
    ) as HTMLSelectElement;
    const channelSort = document.getElementById(
      "channelSort"
    ) as HTMLSelectElement;
    const scanSourceHealthBtn = document.getElementById(
      "scanSourceHealth"
    ) as HTMLElement;
    const sourceHealthList = document.getElementById(
      "sourceHealthList"
    ) as HTMLElement;
    const clearHistoryBtn = document.getElementById(
      "clearHistory"
    ) as HTMLElement;
    const syncToken = document.getElementById("syncToken") as HTMLInputElement;
    const syncGistId = document.getElementById("syncGistId") as HTMLInputElement;
    const pushCloudSyncBtn = document.getElementById("pushCloudSync") as HTMLElement;
    const pullCloudSyncBtn = document.getElementById("pullCloudSync") as HTMLElement;
    const exportDiagnosticsBtn = document.getElementById("exportDiagnostics") as HTMLElement;
    const syncFeedback = document.getElementById("syncFeedback") as HTMLElement;

    // Filter controls
    channelGroupFilter?.addEventListener("change", (event) => {
      updateChannelDiscoveryFilters({
        group: (event.target as HTMLSelectElement).value,
      });
    });

    channelCountryFilter?.addEventListener("change", (event) => {
      updateChannelDiscoveryFilters({
        country: (event.target as HTMLSelectElement).value,
      });
    });

    channelSort?.addEventListener("change", (event) => {
      updateChannelDiscoveryFilters({
        sort: (event.target as HTMLSelectElement).value as
          | "favorites"
          | "group"
          | "health"
          | "name"
          | "recent",
      });
    });

    // Playlist file import
    playlistFileInput?.addEventListener("change", async () => {
      const [file] = playlistFileInput.files || [];
      if (!file) {
        return;
      }
      await loadPlaylistFile(file);
      playlistFileInput.value = "";
    });

    // Raw playlist import
    loadRawPlaylistBtn?.addEventListener("click", () => {
      const text = rawPlaylistInput?.value.trim();
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

    // EPG URL
    loadEpgUrlBtn?.addEventListener("click", async () => {
      const url = epgUrlInput?.value.trim();
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

    // EPG file
    epgFileInput?.addEventListener("change", async () => {
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

    // Playlist library
    playlistLibraryList?.addEventListener("click", (event) => {
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

    exportPlaylistLibraryBtn?.addEventListener("click", () => {
      exportPlaylistLibrary();
    });

    // Import playlist library backup
    importPlaylistLibraryFile?.addEventListener("change", async () => {
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

    // Source health scan
    scanSourceHealthBtn?.addEventListener("click", () => {
      void scanActivePlaylistHealth().catch((error) => {
        console.error(error);
      });
    });

    // Source health list
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

    // Clear history
    clearHistoryBtn?.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your history?")) {
        clearHistory();
      }
    });

    // Cloud sync
    pushCloudSyncBtn?.addEventListener("click", async () => {
      const token = syncToken?.value;
      const gistId = syncGistId?.value;
      // Trigger cloud sync push (implementation in sync.ts)
      if (syncFeedback) {
        syncFeedback.textContent = "Push sync started...";
        syncFeedback.setAttribute("data-tone", "neutral");
      }
      // Actual sync implementation would go here
    });

    pullCloudSyncBtn?.addEventListener("click", async () => {
      const token = syncToken?.value;
      const gistId = syncGistId?.value;
      // Trigger cloud sync pull
      if (syncFeedback) {
        syncFeedback.textContent = "Pull sync started...";
        syncFeedback.setAttribute("data-tone", "neutral");
      }
      // Actual sync implementation would go here
    });

    // Export diagnostics
    exportDiagnosticsBtn?.addEventListener("click", () => {
      // Export diagnostics implementation
      console.log("Export diagnostics clicked");
    });
  };

  // Set up listeners immediately for visible elements
  setupSettingsListeners();

  // Re-setup listeners when settings panel opens
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");

  settingsBtn?.addEventListener("click", () => {
    if (settingsPanel) {
      settingsPanel.hidden = false;
      // Re-setup listeners after panel is shown
      setTimeout(setupSettingsListeners, 0);
    }
  });

  // Tab Navigation
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      if (!tabId) return; // Skip settings button

      // Update button states
      tabButtons.forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");

      // Update content visibility
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      const targetContent = document.getElementById(`${tabId}Tab`);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });

  // Settings Panel close
  const closeSettingsBtn = document.getElementById("closeSettings");
  const settingsBackdrop = document.getElementById("settingsBackdrop");

  const closeSettings = () => {
    if (settingsPanel) settingsPanel.hidden = true;
  };

  closeSettingsBtn?.addEventListener("click", closeSettings);
  settingsBackdrop?.addEventListener("click", closeSettings);

  // Close settings on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsPanel && !settingsPanel.hidden) {
      closeSettings();
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
