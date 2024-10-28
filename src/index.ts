import "./styles/main.scss";
import { Header } from "./components/Header";
import { Player } from "./components/Player";
import { Sidebar } from "./components/Sidebar";
import { setupEventListeners } from "./utils/events";
import { displayChannels, fetchPlaylist } from "./utils/playlist";
import { initializeTheme } from "./utils/theme";

// Create and append Header
const header = Header();
document.body.appendChild(header);

// Initialize Theme
initializeTheme();

// Create main container
const main = document.createElement("main");
main.classList.add("main-container");

// Create and append Sidebar
const sidebar = Sidebar();
main.appendChild(sidebar);

// Create and append Player
const player = Player();
main.appendChild(player);

// Append main to body
document.body.appendChild(main);

// Initialize Playlist if saved
document.addEventListener("DOMContentLoaded", () => {
  const savedPlaylist = JSON.parse(localStorage.getItem("playlist") || "{}");
  if (savedPlaylist.url && savedPlaylist.data) {
    fetchPlaylist(savedPlaylist.url);
  }
  displayChannels();
  setupEventListeners();
});
