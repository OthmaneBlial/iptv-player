import { toggleFavorite } from "./favorites";
import { playChannel } from "./playlist";

interface HistoryItem {
  name: string;
  url: string;
  timestamp: string;
}

let history: HistoryItem[] = JSON.parse(
  localStorage.getItem("history") || "[]"
);

export function addToHistory(channelName: string, url: string): void {
  history = history.filter((item) => item.url !== url);
  history.unshift({
    name: channelName,
    url: url,
    timestamp: new Date().toISOString(),
  });
  if (history.length > 20) history.pop();
  localStorage.setItem("history", JSON.stringify(history));
  displayHistory();
}

export function displayHistory(): void {
  const historyList = document.getElementById("historyList") as HTMLElement;
  historyList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    li.classList.add("history-item");
    li.innerHTML = `
      <span class="favorite" data-url="${item.url}">
        <i class="far fa-heart"></i>
      </span>
      <span class="history-time">${new Date(
        item.timestamp
      ).toLocaleString()}</span>
      <div class="channel-info">
        <span class="channel-name">${item.name}</span>
      </div>
    `;
    li.addEventListener("click", (e) => {
      if (
        (e.target as HTMLElement).classList.contains("favorite") ||
        (e.target as HTMLElement).parentElement?.classList.contains("favorite")
      )
        return;
      playChannel(item.url, item.name);
    });
    const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item.url, favoriteBtn);
    });
    historyList.appendChild(li);
  });
}

// Function to clear the history
export function clearHistory(): void {
  history = [];
  localStorage.setItem("history", JSON.stringify(history));
  displayHistory();
}
