import "./styles/main.scss";
import { Header } from "./components/Header";
import { Player } from "./components/Player";
import { Sidebar } from "./components/Sidebar";
import { setupEventListeners } from "./utils/events";
import { restoreStoredPlaylist } from "./utils/playlist";
import { initializeTheme } from "./utils/theme";

document.addEventListener("DOMContentLoaded", () => {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw new Error("App root element not found.");
  }

  const header = Header();
  appRoot.appendChild(header);

  initializeTheme();

  const main = document.createElement("main");
  main.classList.add("main-container");

  const sidebar = Sidebar();
  main.appendChild(sidebar);

  const player = Player();
  main.appendChild(player);

  appRoot.appendChild(main);

  setupEventListeners();
  restoreStoredPlaylist();
});
