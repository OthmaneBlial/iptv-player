import { appStore } from "../store/appStore";
import { Channel, ProfileSnapshot, UserProfile } from "../types/models";
import { createDefaultProfiles } from "./profileDefaults";
import { setStoredProfiles } from "./storage";

function getProfileSnapshot(): ProfileSnapshot {
  return {
    activeProfileId: appStore.getState().activeProfileId,
    profileAccessUnlocked: appStore.getState().profileAccessUnlocked,
    profiles: appStore.getState().profiles,
  };
}

function persistProfiles(): void {
  setStoredProfiles(getProfileSnapshot());
  window.dispatchEvent(new CustomEvent("app:profile-updated"));
}

function getAllChannels(): Channel[] {
  return appStore.getState().playlists.flatMap((playlist) => playlist.channels);
}

function findChannel(url: string): Channel | undefined {
  return getAllChannels().find((channel) => channel.url === url);
}

function getProfileRestrictedGroups(profile: UserProfile | null): string[] {
  if (!profile || appStore.getState().profileAccessUnlocked) {
    return [];
  }

  return profile.blockedGroups;
}

function matchesRestrictedGroup(group: string, restrictedGroup: string): boolean {
  const normalizedGroup = group.toLowerCase();
  const normalizedRestrictedGroup = restrictedGroup.toLowerCase();
  if (!normalizedGroup || !normalizedRestrictedGroup) {
    return false;
  }

  return (
    normalizedGroup.includes(normalizedRestrictedGroup) ||
    normalizedRestrictedGroup.includes(normalizedGroup)
  );
}

function getHistoryChannels(): Channel[] {
  return appStore
    .getState()
    .history.map((item) => findChannel(item.url))
    .filter(Boolean) as Channel[];
}

function getFavoriteChannels(): Channel[] {
  return appStore
    .getState()
    .favorites.map((favorite) => findChannel(favorite.url))
    .filter(Boolean) as Channel[];
}

function dedupeChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel, index, items) => {
    return items.findIndex((candidate) => candidate.url === channel.url) === index;
  });
}

function createFallbackProfiles(): void {
  if (appStore.getState().profiles.length) {
    return;
  }

  const profiles = createDefaultProfiles();
  appStore.setProfiles(profiles);
  appStore.setActiveProfileId(profiles[0]?.id || null);
  appStore.setProfileAccessUnlocked(false);
  persistProfiles();
}

function getAllowedChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel) => !isGroupBlockedForProfile(channel.group));
}

function getTopGroups(): string[] {
  const counts = new Map<string, number>();
  getAllowedChannels(getHistoryChannels()).forEach((channel) => {
    counts.set(channel.group, (counts.get(channel.group) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([group]) => group);
}

function renderProfileControls(): void {
  const profileSelect = document.getElementById("profileSelect") as HTMLSelectElement | null;
  const profileLockButton = document.getElementById(
    "toggleProfileAccess"
  ) as HTMLButtonElement | null;
  const profileStatus = document.getElementById("headerProfileStatus");
  const { activeProfileId, profileAccessUnlocked, profiles } = appStore.getState();
  const activeProfile = getActiveProfile();

  if (profileSelect) {
    profileSelect.innerHTML = profiles
      .map((profile) => `<option value="${profile.id}">${profile.name}</option>`)
      .join("");
    profileSelect.value = activeProfileId || profiles[0]?.id || "";
  }

  if (profileLockButton) {
    const hasRestrictions = Boolean(activeProfile?.blockedGroups.length);
    profileLockButton.hidden = !hasRestrictions;
    profileLockButton.textContent = hasRestrictions
      ? profileAccessUnlocked
        ? "Lock Filters"
        : "Unlock Filters"
      : "No Restrictions";
  }

  if (profileStatus) {
    if (!activeProfile) {
      profileStatus.textContent = "No profile";
      return;
    }

    if (!activeProfile.blockedGroups.length) {
      profileStatus.textContent = `${activeProfile.name} • Open`;
      return;
    }

    profileStatus.textContent = profileAccessUnlocked
      ? `${activeProfile.name} • Unlocked`
      : `${activeProfile.name} • Filtered`;
  }
}

function renderPersonalizedSections(): void {
  const personalizedSections = document.getElementById("personalizedSections");
  if (!personalizedSections) {
    return;
  }

  const state = appStore.getState();
  const historyChannels = getAllowedChannels(getHistoryChannels());
  const favoriteChannels = getAllowedChannels(getFavoriteChannels());
  const currentChannel = getAllowedChannels(
    state.player.currentChannel ? [findChannel(state.player.currentChannel.url)].filter(Boolean) as Channel[] : []
  )[0] || null;
  const topGroups = getTopGroups();
  const recommendedChannels = getQuickSwitchSuggestions(4);

  personalizedSections.innerHTML = "";
  if (!currentChannel && !historyChannels.length && !favoriteChannels.length) {
    const li = document.createElement("li");
    li.className = "channel-item channel-empty-state";
    li.textContent = "Watch a few channels to unlock personalized recommendations.";
    personalizedSections.appendChild(li);
    return;
  }

  const cards: string[] = [];

  if (currentChannel) {
    cards.push(`
      <li class="history-item personalized-card">
        <span class="personalized-label">Resume</span>
        <strong class="personalized-title">${currentChannel.displayName}</strong>
        <p class="personalized-copy">Continue where you left off without hunting through the playlist again.</p>
        <div class="personalized-actions">
          <button class="playlist-action-button" data-personalized-action="play" data-url="${currentChannel.url}" data-name="${currentChannel.displayName}">
            Watch Now
          </button>
          <button class="playlist-action-button" data-personalized-action="queue" data-url="${currentChannel.url}" data-name="${currentChannel.displayName}">
            Queue View
          </button>
        </div>
      </li>
    `);
  }

  if (topGroups[0]) {
    cards.push(`
      <li class="history-item personalized-card">
        <span class="personalized-label">Trending Group</span>
        <strong class="personalized-title">${topGroups[0]}</strong>
        <p class="personalized-copy">This is the group you come back to most often in the active profile.</p>
        <div class="personalized-actions">
          <button class="playlist-action-button" data-personalized-action="filter-group" data-group="${topGroups[0]}">
            Browse Group
          </button>
        </div>
      </li>
    `);
  }

  if (topGroups[1]) {
    cards.push(`
      <li class="history-item personalized-card">
        <span class="personalized-label">Recommended Group</span>
        <strong class="personalized-title">${topGroups[1]}</strong>
        <p class="personalized-copy">A second lane to explore based on your recent and favorite watching habits.</p>
        <div class="personalized-actions">
          <button class="playlist-action-button" data-personalized-action="filter-group" data-group="${topGroups[1]}">
            Explore Next
          </button>
        </div>
      </li>
    `);
  }

  recommendedChannels.forEach((channel) => {
    cards.push(`
      <li class="history-item personalized-card personalized-card--compact">
        <span class="personalized-label">Quick Pick</span>
        <strong class="personalized-title">${channel.displayName}</strong>
        <p class="personalized-copy">${channel.group || "Live"} • ${channel.country || "Global"}</p>
        <div class="personalized-actions">
          <button class="playlist-action-button" data-personalized-action="play" data-url="${channel.url}" data-name="${channel.displayName}">
            Play
          </button>
          <button class="playlist-action-button" data-personalized-action="queue" data-url="${channel.url}" data-name="${channel.displayName}">
            Queue
          </button>
        </div>
      </li>
    `);
  });

  personalizedSections.innerHTML = cards.join("");
}

export function getActiveProfile(): UserProfile | null {
  const { activeProfileId, profiles } = appStore.getState();
  return profiles.find((profile) => profile.id === activeProfileId) || profiles[0] || null;
}

export function isGroupBlockedForProfile(group: string): boolean {
  const restrictedGroups = getProfileRestrictedGroups(getActiveProfile());
  if (!restrictedGroups.length) {
    return false;
  }

  return restrictedGroups.some((restrictedGroup) =>
    matchesRestrictedGroup(group || "", restrictedGroup)
  );
}

export function getQuickSwitchSuggestions(limit = 8): Channel[] {
  const state = appStore.getState();
  const currentChannel = state.player.currentChannel
    ? findChannel(state.player.currentChannel.url)
    : null;
  const historyChannels = getHistoryChannels();
  const favoriteChannels = getFavoriteChannels();
  const channels = dedupeChannels(
    [currentChannel, ...historyChannels, ...favoriteChannels].filter(Boolean) as Channel[]
  );

  return getAllowedChannels(channels).slice(0, limit);
}

export function initializeProfiles(): void {
  createFallbackProfiles();
  const profileSelect = document.getElementById("profileSelect") as HTMLSelectElement | null;
  const profileLockButton = document.getElementById(
    "toggleProfileAccess"
  ) as HTMLButtonElement | null;
  const personalizedSections = document.getElementById("personalizedSections");

  profileSelect?.addEventListener("change", (event) => {
    const nextProfileId = (event.target as HTMLSelectElement).value;
    appStore.setActiveProfileId(nextProfileId);
    appStore.setProfileAccessUnlocked(false);
    persistProfiles();
  });

  profileLockButton?.addEventListener("click", () => {
    const activeProfile = getActiveProfile();
    if (!activeProfile?.blockedGroups.length) {
      return;
    }

    if (appStore.getState().profileAccessUnlocked) {
      appStore.setProfileAccessUnlocked(false);
      persistProfiles();
      return;
    }

    const enteredPin = prompt(`Enter the ${activeProfile.name} PIN to unlock restricted groups.`);
    if (enteredPin === null) {
      return;
    }

    if (enteredPin.trim() !== activeProfile.pin) {
      alert("Incorrect PIN for this profile.");
      return;
    }

    appStore.setProfileAccessUnlocked(true);
    persistProfiles();
  });

  personalizedSections?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target
      .closest("[data-personalized-action]")
      ?.getAttribute("data-personalized-action");
    const button = target.closest("[data-personalized-action]") as HTMLElement | null;

    if (!action || !button) {
      return;
    }

    if (action === "play") {
      window.dispatchEvent(
        new CustomEvent("app:play-channel", {
          detail: {
            name: button.getAttribute("data-name") || "Channel",
            url: button.getAttribute("data-url") || "",
          },
        })
      );
      return;
    }

    if (action === "queue") {
      window.dispatchEvent(
        new CustomEvent("app:add-multiview-slot", {
          detail: {
            name: button.getAttribute("data-name") || "Channel",
            url: button.getAttribute("data-url") || "",
          },
        })
      );
      return;
    }

    if (action === "filter-group") {
      window.dispatchEvent(
        new CustomEvent("app:set-group-filter", {
          detail: {
            group: button.getAttribute("data-group") || "all",
          },
        })
      );
    }
  });

  appStore.subscribe(() => {
    renderProfileControls();
    renderPersonalizedSections();
  });

  renderProfileControls();
  renderPersonalizedSections();
}
