import { fetchPlaylist, filterChannels } from "./playlist";
import { clearHistory } from "./history"; // Import the clearHistory function

export function setupEventListeners(): void {
  const importBtn = document.getElementById("importPlaylist") as HTMLElement;
  const playlistUrlInput = document.getElementById(
    "playlistUrl"
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
