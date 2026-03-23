import { appStore } from "../store/appStore";
import { FavoriteRecord } from "../types/models";
import { findChannelByUrl, renderPlaylistState } from "./playlist";
import { setStoredFavorites } from "./storage";

export function toggleFavorite(channelUrl: string): void {
  const favorites = appStore.getState().favorites;
  const nextFavorites = favorites.some((favorite) => favorite.url === channelUrl)
    ? favorites.filter((favorite) => favorite.url !== channelUrl)
    : [
        ...favorites,
        {
          addedAt: new Date().toISOString(),
          url: channelUrl,
        },
      ];

  appStore.setFavorites(nextFavorites);
  setStoredFavorites(nextFavorites);
  displayFavorites();
  renderPlaylistState();
}

export function getFavorites(): string[] {
  return appStore.getState().favorites.map((favorite) => favorite.url);
}

export function displayFavorites(): void {
  const favoritesList = document.getElementById("favoritesList") as HTMLElement;
  if (!favoritesList) {
    return;
  }

  favoritesList.innerHTML = "";
  appStore.getState().favorites.forEach((favorite: FavoriteRecord) => {
    const channel = findChannelByUrl(favorite.url);
    if (channel) {
      const li = document.createElement("li");
      li.classList.add("favorites-item");
      li.innerHTML = `
        <span class="favorite" data-url="${channel.url}">
          <i class="fas fa-heart"></i>
        </span>
        <div class="channel-info">
          <span class="channel-name">${channel.displayName}</span>
        </div>
      `;
      li.addEventListener("click", (e) => {
        if (
          (e.target as HTMLElement).classList.contains("favorite") ||
          (e.target as HTMLElement).parentElement?.classList.contains(
            "favorite"
          )
        )
          return;
        window.dispatchEvent(
          new CustomEvent("app:play-channel", {
            detail: { name: channel.displayName, url: channel.url },
          })
        );
      });
      const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
      favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(channel.url);
      });
      favoritesList.appendChild(li);
    }
  });
}
