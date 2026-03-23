import { appStore } from "../store/appStore";
import { FavoriteRecord } from "../types/models";
import {
  createCollectionItemElement,
  renderEmptyCollectionState,
} from "./collections";
import { findChannelByUrl, renderPlaylistState } from "./playlist";
import { isGroupBlockedForProfile } from "./profiles";
import { setStoredFavorites } from "./storage";

export function toggleFavorite(channelUrl: string): void {
  const favorites = appStore.getState().favorites;
  const nextFavorites = favorites.some((favorite) => favorite.url === channelUrl)
    ? favorites.filter((favorite) => favorite.url !== channelUrl)
    : [
        ...favorites,
        {
          addedAt: new Date().toISOString(),
          pinned: false,
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

export function togglePinned(channelUrl: string): void {
  const favorites = appStore.getState().favorites;
  const existingFavorite = favorites.find((favorite) => favorite.url === channelUrl);
  const nextFavorites = existingFavorite
    ? favorites.map((favorite) =>
        favorite.url === channelUrl
          ? {
              ...favorite,
              pinned: !favorite.pinned,
            }
          : favorite
      )
    : [
        ...favorites,
        {
          addedAt: new Date().toISOString(),
          pinned: true,
          url: channelUrl,
        },
      ];

  appStore.setFavorites(nextFavorites);
  setStoredFavorites(nextFavorites);
  displayFavorites();
  renderPlaylistState();
}

export function isPinned(channelUrl: string): boolean {
  return appStore
    .getState()
    .favorites.some((favorite) => favorite.url === channelUrl && favorite.pinned);
}

export function displayFavorites(): void {
  displayPinnedFavorites();

  const favoritesList = document.getElementById("favoritesList") as HTMLElement;
  if (!favoritesList) {
    return;
  }

  favoritesList.innerHTML = "";
  const visibleFavorites = appStore
    .getState()
    .favorites.filter((favorite) => !favorite.pinned);

  if (!visibleFavorites.length) {
    renderEmptyCollectionState(favoritesList, "No favorite channels yet.");
    return;
  }

  visibleFavorites.forEach((favorite: FavoriteRecord) => {
    const channel = findChannelByUrl(favorite.url);
    if (channel && !isGroupBlockedForProfile(channel.group)) {
      const li = createCollectionItemElement({
        isFavorite: true,
        isPinned: favorite.pinned,
        logoUrl: channel.logo,
        meta: channel.group,
        onPlay: () => {
          window.dispatchEvent(
            new CustomEvent("app:play-channel", {
              detail: { name: channel.displayName, url: channel.url },
            })
          );
        },
        onToggleFavorite: () => toggleFavorite(channel.url),
        onTogglePinned: () => togglePinned(channel.url),
        title: channel.displayName,
        url: channel.url,
      });
      favoritesList.appendChild(li);
    }
  });

  if (!favoritesList.childElementCount) {
    renderEmptyCollectionState(
      favoritesList,
      "No favorite channels are available for the active profile."
    );
  }
}

function displayPinnedFavorites(): void {
  const pinnedList = document.getElementById("pinnedList") as HTMLElement;
  if (!pinnedList) {
    return;
  }

  pinnedList.innerHTML = "";
  const pinnedFavorites = appStore
    .getState()
    .favorites.filter((favorite) => favorite.pinned);

  if (!pinnedFavorites.length) {
    renderEmptyCollectionState(pinnedList, "Pin channels for quick access.");
    return;
  }

  pinnedFavorites.forEach((favorite) => {
    const channel = findChannelByUrl(favorite.url);
    if (!channel || isGroupBlockedForProfile(channel.group)) {
      return;
    }

    const li = createCollectionItemElement({
      isFavorite: true,
      isPinned: true,
      logoUrl: channel.logo,
      meta: channel.group,
      onPlay: () => {
        window.dispatchEvent(
          new CustomEvent("app:play-channel", {
            detail: { name: channel.displayName, url: channel.url },
          })
        );
      },
      onToggleFavorite: () => toggleFavorite(channel.url),
      onTogglePinned: () => togglePinned(channel.url),
      title: channel.displayName,
      url: channel.url,
    });
    pinnedList.appendChild(li);
  });

  if (!pinnedList.childElementCount) {
    renderEmptyCollectionState(
      pinnedList,
      "Pinned channels are hidden or empty for this profile."
    );
  }
}
