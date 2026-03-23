import { appStore } from "../store/appStore";

function renderHeaderSummary(): void {
  const playlistName = document.getElementById("headerPlaylistName");
  const channelCount = document.getElementById("headerChannelCountValue");
  const guideStatus = document.getElementById("headerGuideStatus");
  const profileStatus = document.getElementById("headerProfileStatus");
  const state = appStore.getState();
  const activePlaylist =
    state.playlists.find((playlist) => playlist.id === state.activePlaylistId) ||
    state.playlists[0];
  const activeProfile =
    state.profiles.find((profile) => profile.id === state.activeProfileId) ||
    state.profiles[0];

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

  if (profileStatus) {
    if (!activeProfile) {
      profileStatus.textContent = "No profile";
      return;
    }

    profileStatus.textContent = activeProfile.blockedGroups.length
      ? state.profileAccessUnlocked
        ? `${activeProfile.name} • Unlocked`
        : `${activeProfile.name} • Filtered`
      : `${activeProfile.name} • Open`;
  }
}

export function initializeHeaderSummary(): void {
  renderHeaderSummary();
  appStore.subscribe(() => {
    renderHeaderSummary();
  });
}
