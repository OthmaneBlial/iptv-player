import { appStore } from "../store/appStore";
import { toggleFavorite } from "../utils/favorites";
import { playAdjacentChannel } from "../utils/playlist";

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function initializeKeyboardShortcuts(): void {
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      document.getElementById("searchChannels")?.focus();
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "m") {
      event.preventDefault();
      document.getElementById("muteButton")?.click();
      return;
    }

    if (event.key === "f") {
      event.preventDefault();
      document.getElementById("fullscreenButton")?.click();
      return;
    }

    if (event.key === "j") {
      event.preventDefault();
      playAdjacentChannel(1);
      return;
    }

    if (event.key === "k") {
      event.preventDefault();
      playAdjacentChannel(-1);
      return;
    }

    if (event.key === "l") {
      const currentChannel = appStore.getState().player.currentChannel;
      if (!currentChannel) {
        return;
      }

      event.preventDefault();
      toggleFavorite(currentChannel.url);
    }
  });
}
