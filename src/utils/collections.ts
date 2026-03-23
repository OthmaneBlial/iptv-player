interface CollectionItemConfig {
  isFavorite: boolean;
  isPinned: boolean;
  meta?: string;
  onPlay: () => void;
  onRemove?: () => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
  timestamp?: string;
  title: string;
  url: string;
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  return `Last watched ${date.toLocaleString()}`;
}

function createLogoMarkup(title: string): string {
  return `<span class="channel-logo-placeholder">${title
    .slice(0, 1)
    .toUpperCase()}</span>`;
}

export function createCollectionItemElement(
  config: CollectionItemConfig
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "channel-item collection-item";
  li.innerHTML = `
    <div class="channel-info">
      ${createLogoMarkup(config.title)}
      <div class="channel-copy">
        <span class="channel-name">${config.title}</span>
        <span class="channel-meta">${
          config.meta || formatTimestamp(config.timestamp)
        }</span>
      </div>
    </div>
    <div class="collection-actions">
      <button class="collection-action" data-action="pin" title="Pin channel">
        <i class="fas fa-thumbtack${
          config.isPinned ? "" : " collection-action--muted"
        }"></i>
      </button>
      <button class="collection-action" data-action="favorite" title="Favorite channel">
        <i class="${
          config.isFavorite ? "fas fa-heart" : "far fa-heart"
        }"></i>
      </button>
      ${
        config.onRemove
          ? `<button class="collection-action" data-action="remove" title="Remove">
        <i class="fas fa-xmark"></i>
      </button>`
          : ""
      }
    </div>
  `;

  li.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target.closest("[data-action]")?.getAttribute("data-action");

    if (action === "favorite") {
      event.stopPropagation();
      config.onToggleFavorite();
      return;
    }

    if (action === "pin") {
      event.stopPropagation();
      config.onTogglePinned();
      return;
    }

    if (action === "remove" && config.onRemove) {
      event.stopPropagation();
      config.onRemove();
      return;
    }

    config.onPlay();
  });

  return li;
}

export function renderEmptyCollectionState(
  list: HTMLElement,
  message: string
): void {
  const li = document.createElement("li");
  li.className = "channel-item channel-empty-state";
  li.textContent = message;
  list.appendChild(li);
}
