import { appStore } from "../store/appStore";
import {
  Channel,
  SourceHealthEntry,
  SourceHealthStatus,
} from "../types/models";
import { logDiagnostic } from "./diagnostics";
import { setStoredSourceHealth } from "./storage";

const SCAN_LIMIT = 12;
const SCAN_TIMEOUT_MS = 4500;
const STATUS_ORDER: Record<SourceHealthStatus, number> = {
  healthy: 3,
  unknown: 2,
  unstable: 1,
  offline: 0,
};

let isHealthScanRunning = false;

function setSourceHealthFeedback(
  message: string,
  tone: "error" | "neutral" | "success"
): void {
  const feedback = document.getElementById("sourceHealthFeedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.setAttribute("data-tone", tone);
}

function createDefaultEntry(url: string, name: string): SourceHealthEntry {
  return {
    checkedAt: null,
    failures: 0,
    lastFailureAt: null,
    lastKnownName: name || "Unknown channel",
    lastSuccessfulAt: null,
    latencyMs: null,
    negativeReports: 0,
    positiveReports: 0,
    status: "unknown",
    url,
  };
}

function resolveStatus(entry: SourceHealthEntry): SourceHealthStatus {
  if (!entry.checkedAt && !entry.positiveReports && !entry.negativeReports) {
    return "unknown";
  }

  if (
    entry.failures >= 2 &&
    !entry.lastSuccessfulAt &&
    entry.negativeReports >= entry.positiveReports
  ) {
    return "offline";
  }

  const trustScore =
    entry.positiveReports * 2 +
    (entry.lastSuccessfulAt ? 3 : 0) -
    entry.failures * 2 -
    entry.negativeReports * 2;

  if (trustScore <= 0) {
    return "unstable";
  }

  return "healthy";
}

function persistSourceHealth(entries: SourceHealthEntry[]): void {
  appStore.setSourceHealth(entries);
  setStoredSourceHealth(entries);
  window.dispatchEvent(new CustomEvent("app:source-health-updated"));
}

function updateSourceHealthEntry(
  url: string,
  name: string,
  updater: (entry: SourceHealthEntry) => SourceHealthEntry
): SourceHealthEntry | null {
  if (!url) {
    return null;
  }

  const sourceHealth = appStore.getState().sourceHealth;
  const existingEntry =
    sourceHealth.find((entry) => entry.url === url) ||
    createDefaultEntry(url, name);
  const nextEntry = updater({
    ...existingEntry,
    lastKnownName: name || existingEntry.lastKnownName,
  });
  nextEntry.status = resolveStatus(nextEntry);

  const nextSourceHealth = sourceHealth.some((entry) => entry.url === url)
    ? sourceHealth.map((entry) => (entry.url === url ? nextEntry : entry))
    : [nextEntry, ...sourceHealth];

  persistSourceHealth(nextSourceHealth);
  return nextEntry;
}

function getActivePlaylistChannels(): Channel[] {
  const { activePlaylistId, defaultPlaylistId, playlists } = appStore.getState();

  return (
    playlists.find((playlist) => playlist.id === activePlaylistId)?.channels ||
    playlists.find((playlist) => playlist.id === defaultPlaylistId)?.channels ||
    playlists[0]?.channels ||
    []
  );
}

function getScanCandidates(): Channel[] {
  const { favorites, history, player } = appStore.getState();
  const favoriteUrls = new Set(favorites.map((favorite) => favorite.url));
  const pinnedUrls = new Set(
    favorites.filter((favorite) => favorite.pinned).map((favorite) => favorite.url)
  );
  const recentUrls = history.map((item) => item.url);
  const currentUrl = player.currentChannel?.url;

  return [...getActivePlaylistChannels()]
    .filter((channel, index, channels) => {
      return channels.findIndex((candidate) => candidate.url === channel.url) === index;
    })
    .sort((left, right) => {
      const leftRecent = recentUrls.indexOf(left.url);
      const rightRecent = recentUrls.indexOf(right.url);
      const leftScore =
        Number(left.url === currentUrl) * 30 +
        Number(pinnedUrls.has(left.url)) * 20 +
        Number(favoriteUrls.has(left.url)) * 10 +
        (leftRecent === -1 ? 0 : Math.max(6 - leftRecent, 1));
      const rightScore =
        Number(right.url === currentUrl) * 30 +
        Number(pinnedUrls.has(right.url)) * 20 +
        Number(favoriteUrls.has(right.url)) * 10 +
        (rightRecent === -1 ? 0 : Math.max(6 - rightRecent, 1));

      return rightScore - leftScore;
    })
    .slice(0, SCAN_LIMIT);
}

async function probeSource(url: string): Promise<{
  latencyMs: number;
  ok: boolean;
}> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, SCAN_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    await fetch(url, {
      cache: "no-store",
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    });

    return {
      latencyMs: Math.round(performance.now() - startedAt),
      ok: true,
    };
  } catch (error) {
    return {
      latencyMs: Math.round(performance.now() - startedAt),
      ok: false,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function formatLatency(entry: SourceHealthEntry): string {
  return typeof entry.latencyMs === "number" ? `${entry.latencyMs} ms` : "No latency data";
}

function formatStatusLabel(status: SourceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "offline":
      return "Offline";
    case "unstable":
      return "Unstable";
    default:
      return "Not Checked";
  }
}

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.max(Math.round(diff / 60000), 0);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function compareSourceHealth(left: SourceHealthEntry, right: SourceHealthEntry): number {
  const statusDelta = STATUS_ORDER[right.status] - STATUS_ORDER[left.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  const leftTrust = left.positiveReports - left.negativeReports - left.failures;
  const rightTrust = right.positiveReports - right.negativeReports - right.failures;
  if (leftTrust !== rightTrust) {
    return rightTrust - leftTrust;
  }

  return left.lastKnownName.localeCompare(right.lastKnownName);
}

export function getSourceHealthEntry(url: string): SourceHealthEntry | null {
  return appStore.getState().sourceHealth.find((entry) => entry.url === url) || null;
}

export function getSourceHealthRank(url: string): number {
  const entry = getSourceHealthEntry(url);
  return entry ? STATUS_ORDER[entry.status] : STATUS_ORDER.unknown;
}

export function getSourceHealthLabel(url: string): string {
  const entry = getSourceHealthEntry(url);
  if (!entry) {
    return "";
  }

  return formatStatusLabel(entry.status);
}

export function markSourcePlaybackSuccess(url: string, name: string): void {
  const entry = updateSourceHealthEntry(url, name, (currentEntry) => ({
    ...currentEntry,
    checkedAt: new Date().toISOString(),
    lastSuccessfulAt: new Date().toISOString(),
    latencyMs: currentEntry.latencyMs,
  }));

  if (entry) {
    logDiagnostic("info", "Stream confirmed healthy by playback.", url);
  }
}

export function markSourcePlaybackFailure(url: string, name: string): void {
  updateSourceHealthEntry(url, name, (currentEntry) => ({
    ...currentEntry,
    checkedAt: new Date().toISOString(),
    failures: currentEntry.failures + 1,
    lastFailureAt: new Date().toISOString(),
  }));
  logDiagnostic("warn", "Stream health downgraded after playback failure.", url);
}

export function reportSourceIssue(url: string, name: string): void {
  updateSourceHealthEntry(url, name, (currentEntry) => ({
    ...currentEntry,
    checkedAt: new Date().toISOString(),
    failures: currentEntry.failures + 1,
    lastFailureAt: new Date().toISOString(),
    negativeReports: currentEntry.negativeReports + 1,
  }));
  setSourceHealthFeedback(`Marked ${name} as having a stream issue.`, "success");
  logDiagnostic("warn", "Manual stream issue reported.", url);
}

export function confirmSourceWorking(url: string, name: string): void {
  updateSourceHealthEntry(url, name, (currentEntry) => ({
    ...currentEntry,
    checkedAt: new Date().toISOString(),
    lastSuccessfulAt: new Date().toISOString(),
    positiveReports: currentEntry.positiveReports + 1,
  }));
  setSourceHealthFeedback(`Confirmed ${name} as working.`, "success");
  logDiagnostic("info", "Manual healthy stream confirmation received.", url);
}

export async function scanActivePlaylistHealth(): Promise<void> {
  if (isHealthScanRunning) {
    setSourceHealthFeedback("A source health scan is already running.", "neutral");
    return;
  }

  const candidates = getScanCandidates();
  if (!candidates.length) {
    setSourceHealthFeedback("Import a playlist before running a source health scan.", "error");
    return;
  }

  isHealthScanRunning = true;
  setSourceHealthFeedback(
    `Scanning ${candidates.length} prioritized streams from the active playlist...`,
    "neutral"
  );
  logDiagnostic("info", "Started source health scan.");

  let passed = 0;
  let failed = 0;
  let currentIndex = 0;

  const workerCount = Math.min(4, candidates.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < candidates.length) {
      const channel = candidates[currentIndex];
      currentIndex += 1;
      const result = await probeSource(channel.url);

      if (result.ok) {
        passed += 1;
        updateSourceHealthEntry(channel.url, channel.displayName, (currentEntry) => ({
          ...currentEntry,
          checkedAt: new Date().toISOString(),
          lastSuccessfulAt: new Date().toISOString(),
          latencyMs: result.latencyMs,
        }));
      } else {
        failed += 1;
        updateSourceHealthEntry(channel.url, channel.displayName, (currentEntry) => ({
          ...currentEntry,
          checkedAt: new Date().toISOString(),
          failures: currentEntry.failures + 1,
          lastFailureAt: new Date().toISOString(),
          latencyMs: result.latencyMs,
        }));
      }
    }
  });

  try {
    await Promise.all(workers);
    setSourceHealthFeedback(
      `Source scan finished: ${passed} reachable, ${failed} unstable or offline.`,
      failed ? "neutral" : "success"
    );
    logDiagnostic(
      failed ? "warn" : "info",
      `Completed source health scan (${passed} healthy, ${failed} unhealthy).`
    );
  } finally {
    isHealthScanRunning = false;
  }
}

export function renderSourceHealth(): void {
  const sourceHealthList = document.getElementById("sourceHealthList");
  if (!sourceHealthList) {
    return;
  }

  const activeUrls = new Set(getActivePlaylistChannels().map((channel) => channel.url));
  const sourceHealth = appStore
    .getState()
    .sourceHealth.filter((entry) => activeUrls.has(entry.url))
    .sort(compareSourceHealth)
    .slice(0, 20);

  sourceHealthList.innerHTML = "";
  if (!sourceHealth.length) {
    const li = document.createElement("li");
    li.className = "channel-item channel-empty-state";
    li.textContent = "Run a scan or report a stream issue to build source health data.";
    sourceHealthList.appendChild(li);
    return;
  }

  const fragment = document.createDocumentFragment();

  sourceHealth.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item source-health-item";
    li.setAttribute("data-source-health-url", entry.url);
    li.setAttribute("data-source-health-name", entry.lastKnownName);
    li.innerHTML = `
      <div class="channel-info">
        <div class="channel-copy">
          <span class="channel-name">${entry.lastKnownName}</span>
          <span class="channel-meta">
            <span class="source-health-pill source-health-pill--${entry.status}">
              ${formatStatusLabel(entry.status)}
            </span>
            ${formatLatency(entry)} • Reports +${entry.positiveReports}/-${entry.negativeReports} • Checked ${formatRelativeTime(
              entry.checkedAt
            )}
          </span>
        </div>
      </div>
      <div class="playlist-library-actions">
        <button class="playlist-action-button" data-source-health-action="confirm">Works</button>
        <button class="playlist-action-button" data-source-health-action="report">Issue</button>
      </div>
    `;
    fragment.appendChild(li);
  });

  sourceHealthList.appendChild(fragment);
}

export function initializeSourceHealth(): void {
  appStore.subscribe(() => {
    renderSourceHealth();
  });

  renderSourceHealth();
}
