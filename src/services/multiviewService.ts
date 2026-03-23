import Hls from "hls.js";
import { appStore } from "../store/appStore";
import { MultiviewSlot, MultiviewState } from "../types/models";
import { getQuickSwitchSuggestions } from "../utils/profiles";
import { setStoredMultiview } from "../utils/storage";

const previewPlayers = new Map<number, Hls>();

let playerContainer: HTMLElement | null = null;
let quickSwitchOverlay: HTMLElement | null = null;
let multiviewGrid: HTMLElement | null = null;
let toggleQuickSwitchButton: HTMLButtonElement | null = null;
let toggleMiniPlayerButton: HTMLButtonElement | null = null;
let toggleMultiviewButton: HTMLButtonElement | null = null;
let addCurrentToMultiviewButton: HTMLButtonElement | null = null;
let multiviewLayoutSelect: HTMLSelectElement | null = null;

function persistMultiview(): void {
  setStoredMultiview(appStore.getState().multiview);
}

function destroyPreviewPlayer(slotIndex: number): void {
  const instance = previewPlayers.get(slotIndex);
  if (!instance) {
    return;
  }

  instance.destroy();
  previewPlayers.delete(slotIndex);
}

function destroyUnusedPreviewPlayers(limit: number): void {
  [...previewPlayers.keys()].forEach((slotIndex) => {
    if (slotIndex >= limit) {
      destroyPreviewPlayer(slotIndex);
    }
  });
}

function attachPreviewPlayer(
  videoElement: HTMLVideoElement,
  slot: MultiviewSlot,
  slotIndex: number
): void {
  const existingUrl = videoElement.getAttribute("data-preview-url");
  if (existingUrl === slot.url) {
    void videoElement.play().catch(() => {});
    return;
  }

  destroyPreviewPlayer(slotIndex);
  videoElement.setAttribute("data-preview-url", slot.url);
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.autoplay = true;

  if (Hls.isSupported()) {
    const previewHls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    previewHls.loadSource(slot.url);
    previewHls.attachMedia(videoElement);
    previewHls.on(Hls.Events.MANIFEST_PARSED, () => {
      void videoElement.play().catch(() => {});
    });
    previewPlayers.set(slotIndex, previewHls);
    return;
  }

  videoElement.src = slot.url;
  videoElement.onloadedmetadata = () => {
    void videoElement.play().catch(() => {});
  };
}

function syncPreviewPlayers(): void {
  if (!multiviewGrid) {
    return;
  }

  const { enabled, layout, slots } = appStore.getState().multiview;
  if (!enabled) {
    destroyUnusedPreviewPlayers(0);
    return;
  }

  destroyUnusedPreviewPlayers(layout);

  Array.from({ length: layout }, (_, slotIndex) => slotIndex).forEach((slotIndex) => {
    const slot = slots[slotIndex];
    const videoElement = multiviewGrid?.querySelector(
      `[data-multiview-slot="${slotIndex}"] video`
    ) as HTMLVideoElement | null;
    if (!videoElement || !slot) {
      destroyPreviewPlayer(slotIndex);
      return;
    }

    attachPreviewPlayer(videoElement, slot, slotIndex);
  });
}

function setMultiviewState(
  nextState: Partial<MultiviewState>
): void {
  appStore.setMultiview(nextState);
  persistMultiview();
}

function renderQuickSwitch(): void {
  if (!quickSwitchOverlay || !toggleQuickSwitchButton) {
    return;
  }

  const { quickSwitchOpen } = appStore.getState().multiview;
  const suggestions = getQuickSwitchSuggestions(8);

  quickSwitchOverlay.hidden = !quickSwitchOpen;
  toggleQuickSwitchButton.setAttribute(
    "aria-pressed",
    quickSwitchOpen ? "true" : "false"
  );

  if (!quickSwitchOpen) {
    return;
  }

  if (!suggestions.length) {
    quickSwitchOverlay.innerHTML = `
      <div class="quick-switch-shell">
        <p class="quick-switch-kicker">Quick Switch</p>
        <h3>Build up a few watched channels first.</h3>
        <p class="quick-switch-copy">Favorites, history, and profile-safe picks appear here for instant switching and multiview queueing.</p>
      </div>
    `;
    return;
  }

  quickSwitchOverlay.innerHTML = `
    <div class="quick-switch-shell">
      <div class="quick-switch-header">
        <div>
          <p class="quick-switch-kicker">Quick Switch</p>
          <h3>Instant picks for this profile</h3>
        </div>
        <p class="quick-switch-copy">Play immediately or send a stream to the multiview wall.</p>
      </div>
      <div class="quick-switch-list">
        ${suggestions
          .map(
            (channel) => `
              <div class="quick-switch-item">
                <div>
                  <strong>${channel.displayName}</strong>
                  <span>${channel.group || "Live"} • ${channel.country || "Global"}</span>
                </div>
                <div class="quick-switch-actions">
                  <button class="playlist-action-button" data-quick-switch-action="play" data-url="${channel.url}" data-name="${channel.displayName}">
                    Play
                  </button>
                  <button class="playlist-action-button" data-quick-switch-action="queue" data-url="${channel.url}" data-name="${channel.displayName}">
                    Queue
                  </button>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderMultiview(): void {
  if (!multiviewGrid || !toggleMiniPlayerButton || !toggleMultiviewButton || !multiviewLayoutSelect) {
    return;
  }

  const { enabled, layout, miniPlayer, slots } = appStore.getState().multiview;
  multiviewGrid.hidden = !enabled;
  multiviewGrid.className = `multiview-grid multiview-grid--${layout}`;
  toggleMiniPlayerButton.setAttribute("aria-pressed", miniPlayer ? "true" : "false");
  toggleMultiviewButton.setAttribute("aria-pressed", enabled ? "true" : "false");
  multiviewLayoutSelect.value = layout.toString();
  playerContainer?.classList.toggle("player-container--mini", miniPlayer);

  if (!enabled) {
    multiviewGrid.innerHTML = "";
    syncPreviewPlayers();
    return;
  }

  const tiles = Array.from({ length: layout }, (_, slotIndex) => slots[slotIndex] || null)
    .map((slot, slotIndex) => {
      if (!slot) {
        return `
          <div class="multiview-tile multiview-tile--empty" data-multiview-slot="${slotIndex}">
            <div class="multiview-empty-copy">
              <p>Slot ${slotIndex + 1}</p>
              <span>Use Quick Switch or “Add Current” to populate this view.</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="multiview-tile" data-multiview-slot="${slotIndex}">
          <video muted playsinline aria-label="${slot.name} preview"></video>
          <div class="multiview-meta">
            <strong>${slot.name}</strong>
            <div class="multiview-actions">
              <button class="playlist-action-button" data-multiview-action="focus" data-slot-index="${slotIndex}">
                Watch
              </button>
              <button class="playlist-action-button" data-multiview-action="remove" data-slot-index="${slotIndex}">
                Remove
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  multiviewGrid.innerHTML = tiles;
  syncPreviewPlayers();
}

function addSlot(slot: MultiviewSlot): void {
  if (!slot.url) {
    return;
  }

  const { layout, slots } = appStore.getState().multiview;
  const nextSlots = slots.filter((existingSlot) => existingSlot.url !== slot.url).slice(0, 4);

  if (nextSlots.length >= layout) {
    nextSlots.pop();
  }

  const emptyIndex = nextSlots.findIndex((existingSlot) => !existingSlot);
  if (emptyIndex >= 0) {
    nextSlots[emptyIndex] = slot;
  } else {
    nextSlots.push(slot);
  }

  setMultiviewState({
    enabled: true,
    slots: nextSlots.slice(0, 4),
  });
}

function removeSlot(slotIndex: number): void {
  const nextSlots = [...appStore.getState().multiview.slots];
  nextSlots.splice(slotIndex, 1);
  setMultiviewState({
    slots: nextSlots,
  });
}

function focusSlot(slotIndex: number): void {
  const slot = appStore.getState().multiview.slots[slotIndex];
  if (!slot) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("app:play-channel", {
      detail: {
        name: slot.name,
        url: slot.url,
      },
    })
  );
}

export function initializeMultiviewService(): void {
  playerContainer = document.querySelector(".player-container");
  quickSwitchOverlay = document.getElementById("quickSwitchOverlay");
  multiviewGrid = document.getElementById("multiviewGrid");
  toggleQuickSwitchButton = document.getElementById(
    "toggleQuickSwitch"
  ) as HTMLButtonElement | null;
  toggleMiniPlayerButton = document.getElementById(
    "toggleMiniPlayer"
  ) as HTMLButtonElement | null;
  toggleMultiviewButton = document.getElementById(
    "toggleMultiview"
  ) as HTMLButtonElement | null;
  addCurrentToMultiviewButton = document.getElementById(
    "addCurrentToMultiview"
  ) as HTMLButtonElement | null;
  multiviewLayoutSelect = document.getElementById(
    "multiviewLayout"
  ) as HTMLSelectElement | null;

  toggleQuickSwitchButton?.addEventListener("click", () => {
    const { quickSwitchOpen } = appStore.getState().multiview;
    setMultiviewState({
      quickSwitchOpen: !quickSwitchOpen,
    });
  });

  toggleMiniPlayerButton?.addEventListener("click", () => {
    setMultiviewState({
      miniPlayer: !appStore.getState().multiview.miniPlayer,
    });
  });

  toggleMultiviewButton?.addEventListener("click", () => {
    const { enabled } = appStore.getState().multiview;
    setMultiviewState({
      enabled: !enabled,
    });
  });

  addCurrentToMultiviewButton?.addEventListener("click", () => {
    const currentChannel = appStore.getState().player.currentChannel;
    if (!currentChannel) {
      return;
    }

    addSlot({
      name: currentChannel.name,
      url: currentChannel.url,
    });
  });

  multiviewLayoutSelect?.addEventListener("change", (event) => {
    const nextLayout = parseInt((event.target as HTMLSelectElement).value, 10);
    const normalizedLayout = nextLayout === 4 ? 4 : 2;
    setMultiviewState({
      enabled: true,
      layout: normalizedLayout,
      slots: appStore.getState().multiview.slots.slice(0, normalizedLayout),
    });
  });

  quickSwitchOverlay?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target
      .closest("[data-quick-switch-action]")
      ?.getAttribute("data-quick-switch-action");
    const button = target.closest("[data-quick-switch-action]") as HTMLElement | null;

    if (!action || !button) {
      return;
    }

    const slot = {
      name: button.getAttribute("data-name") || "Channel",
      url: button.getAttribute("data-url") || "",
    };

    if (action === "play") {
      window.dispatchEvent(
        new CustomEvent("app:play-channel", {
          detail: slot,
        })
      );
      return;
    }

    if (action === "queue") {
      addSlot(slot);
    }
  });

  multiviewGrid?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target
      .closest("[data-multiview-action]")
      ?.getAttribute("data-multiview-action");
    const slotIndex = Number(
      target.closest("[data-slot-index]")?.getAttribute("data-slot-index")
    );

    if (!action || Number.isNaN(slotIndex)) {
      return;
    }

    if (action === "focus") {
      focusSlot(slotIndex);
      return;
    }

    if (action === "remove") {
      removeSlot(slotIndex);
    }
  });

  window.addEventListener("app:add-multiview-slot", (event: Event) => {
    const detail = (event as CustomEvent<MultiviewSlot>).detail;
    if (!detail?.url || !detail.name) {
      return;
    }

    addSlot(detail);
  });

  appStore.subscribe(() => {
    renderQuickSwitch();
    renderMultiview();
  });

  renderQuickSwitch();
  renderMultiview();
}
