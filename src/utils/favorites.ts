import { playChannel } from "./playlist";

interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  displayName: string;
  url: string;
}

let favorites: string[] = JSON.parse(localStorage.getItem("favorites") || "[]");

export function toggleFavorite(channelUrl: string, btn: HTMLElement): void {
  if (favorites.includes(channelUrl)) {
    favorites = favorites.filter((url) => url !== channelUrl);
    btn.innerHTML = '<i class="far fa-heart"></i>';
    btn.classList.remove("active");
  } else {
    favorites.push(channelUrl);
    btn.innerHTML = '<i class="fas fa-heart"></i>';
    btn.classList.add("active");
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
  displayFavorites();
}

export function getFavorites(): string[] {
  return favorites;
}

export function loadFavorites(): void {
  favorites.forEach((url) => {
    const btn = document.querySelector(
      `.favorite[data-url="${url}"] i`
    ) as HTMLElement;
    if (btn && !btn.classList.contains("fas")) {
      btn.classList.add("fas");
      btn.classList.remove("far");
    }
  });
}

export function displayFavorites(): void {
  const favoritesList = document.getElementById("favoritesList") as HTMLElement;
  favoritesList.innerHTML = "";
  favorites.forEach((url) => {
    const channel = getChannelByUrl(url);
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
        playChannel(channel.url, channel.displayName);
      });
      const favoriteBtn = li.querySelector(".favorite") as HTMLElement;
      favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(channel.url, favoriteBtn);
      });
      favoritesList.appendChild(li);
    }
  });
}

function getChannelByUrl(url: string): Channel | undefined {
  const playlist = JSON.parse(localStorage.getItem("playlist") || "{}");
  const channels: Channel[] = playlist.channels || [];
  return channels.find((ch) => ch.url === url);
}
