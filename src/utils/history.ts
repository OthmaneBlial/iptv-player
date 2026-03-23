import { appStore } from "../store/appStore";
import { HistoryItem } from "../types/models";
import {
  createCollectionItemElement,
  renderEmptyCollectionState,
} from "./collections";
import { isPinned, toggleFavorite, togglePinned } from "./favorites";
import { findChannelByUrl } from "./playlist";
import { isGroupBlockedForProfile } from "./profiles";
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
  if (!appStore.getState().history.length) {
    renderEmptyCollectionState(historyList, "Your watch history will appear here.");
    return;
  }

  appStore.getState().history.forEach((item: HistoryItem) => {
    const channel = findChannelByUrl(item.url);
    if (channel && isGroupBlockedForProfile(channel.group)) {
      return;
    }
    const li = createCollectionItemElement({
      isFavorite: appStore.getState().favorites.some((favorite) => favorite.url === item.url),
      isPinned: isPinned(item.url),
      logoUrl: channel?.logo,
      onPlay: () => {
        window.dispatchEvent(
          new CustomEvent("app:play-channel", {
            detail: { name: item.name, url: item.url },
          })
        );
      },
      onRemove: () => removeHistoryItem(item.url),
      onToggleFavorite: () => toggleFavorite(item.url),
      onTogglePinned: () => togglePinned(item.url),
      timestamp: item.timestamp,
      title: item.name,
      url: item.url,
    });
    historyList.appendChild(li);
  });

  if (!historyList.childElementCount) {
    renderEmptyCollectionState(
      historyList,
      "Your watch history is empty for the active profile."
    );
  }
}

// Function to clear the history
export function clearHistory(): void {
  appStore.setHistory([]);
  setStoredHistory([]);
  displayHistory();
}

function removeHistoryItem(url: string): void {
  const nextHistory = appStore
    .getState()
    .history.filter((item) => item.url !== url);
  appStore.setHistory(nextHistory);
  setStoredHistory(nextHistory);
  displayHistory();
}
