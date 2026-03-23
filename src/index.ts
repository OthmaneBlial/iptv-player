import "./styles/main.scss";
import { Header } from "./components/Header";
import { Player } from "./components/Player";
import { Sidebar } from "./components/Sidebar";
import { bootstrapAppState } from "./services/bootstrap";
import { initializeHeaderSummary } from "./services/headerService";
import { initializePlayerService } from "./services/playerService";
import { initializeKeyboardShortcuts } from "./services/shortcutService";
import { setupEventListeners } from "./utils/events";
import { initializeEpg } from "./utils/epg";
import { displayFavorites } from "./utils/favorites";
import { displayHistory } from "./utils/history";
import { renderPlaylistState } from "./utils/playlist";
import { initializeTheme } from "./utils/theme";

document.addEventListener("DOMContentLoaded", () => {
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

  bootstrapAppState();
  setupEventListeners();
  initializeTheme();
  initializeHeaderSummary();
  initializePlayerService();
  initializeKeyboardShortcuts();
  initializeEpg();
  renderPlaylistState();
  displayFavorites();
  displayHistory();
});
