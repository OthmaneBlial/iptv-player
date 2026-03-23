import { appStore } from "../store/appStore";

function renderHeaderSummary(): void {
  const playlistName = document.getElementById("headerPlaylistName");
  const channelCount = document.getElementById("headerChannelCountValue");
  const guideStatus = document.getElementById("headerGuideStatus");
  const state = appStore.getState();
  const activePlaylist =
    state.playlists.find((playlist) => playlist.id === state.activePlaylistId) ||
    state.playlists[0];

  if (playlistName) {
    playlistName.textContent = activePlaylist?.name || "No playlist";
  }

  if (channelCount) {
    channelCount.textContent = activePlaylist
      ? activePlaylist.channels.length.toString()
      : "0";
  }

  if (guideStatus) {
    guideStatus.textContent = state.epg.loadedAt ? "Guide loaded" : "Not loaded";
  }
}

export function initializeHeaderSummary(): void {
  renderHeaderSummary();
  appStore.subscribe(() => {
    renderHeaderSummary();
  });
}
