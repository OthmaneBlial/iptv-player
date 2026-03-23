import { appStore } from "../store/appStore";
import { HistoryItem } from "../types/models";
import { toggleFavorite } from "./favorites";
import { setStoredHistory } from "./storage";

export function addToHistory(channelName: string, url: string): void {
  const nextHistory = appStore
    .getState()
    .history.filter((item) => item.url !== url);

  nextHistory.unshift({
    name: channelName,
    url,
    timestamp: new Date().toISOString(),
  });
  if (nextHistory.length > 20) {
    nextHistory.pop();
  }

  appStore.setHistory(nextHistory);
  setStoredHistory(nextHistory);
  displayHistory();
}

export function displayHistory(): void {
  const historyList = document.getElementById("historyList") as HTMLElement;
  if (!historyList) {
    return;
  }

  historyList.innerHTML = "";
  appStore.getState().history.forEach((item: HistoryItem) => {
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
      window.dispatchEvent(
        new CustomEvent("app:play-channel", {
          detail: { name: item.name, url: item.url },
        })
      );
    });
    const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(item.url);
    });
    historyList.appendChild(li);
  });
}

// Function to clear the history
export function clearHistory(): void {
  appStore.setHistory([]);
  setStoredHistory([]);
  displayHistory();
}
