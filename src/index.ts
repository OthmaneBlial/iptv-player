import "./styles/main.scss";
import { Header } from "./components/Header";
import { Player } from "./components/Player";
import { Sidebar } from "./components/Sidebar";
import { bootstrapAppState } from "./services/bootstrap";
import { initializeHeaderSummary } from "./services/headerService";
import { initializeMultiviewService } from "./services/multiviewService";
import { initializePlayerService } from "./services/playerService";
import { initializePwa } from "./services/pwaService";
import { initializeKeyboardShortcuts } from "./services/shortcutService";
import { setupEventListeners } from "./utils/events";
import { initializeCloudSync } from "./utils/sync";
import { initializeDiagnostics } from "./utils/diagnostics";
import { initializeEpg } from "./utils/epg";
import { displayFavorites } from "./utils/favorites";
import { displayHistory } from "./utils/history";
import { renderPlaylistState } from "./utils/playlist";
import { initializeProfiles } from "./utils/profiles";
import { initializeSourceHealth } from "./utils/sourceHealth";
import { initializeTheme } from "./utils/theme";

document.addEventListener("DOMContentLoaded", async () => {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw new Error("App root element not found.");
  }

  const header = Header();
  appRoot.appendChild(header);

  const main = document.createElement("main");
  main.classList.add("main-container");

  const sidebar = Sidebar();
  main.appendChild(sidebar);

  const player = Player();
  main.appendChild(player);

  appRoot.appendChild(main);

  await bootstrapAppState();
  setupEventListeners();
  initializeTheme();
  initializeHeaderSummary();
  initializePlayerService();
  initializeMultiviewService();
  initializeKeyboardShortcuts();
  initializeDiagnostics();
  initializeCloudSync();
  initializePwa();
  initializeEpg();
  initializeProfiles();
  initializeSourceHealth();
  renderPlaylistState();
  displayFavorites();
  displayHistory();
});
