import { appStore } from "../store/appStore";
import { DiagnosticEntry } from "../types/models";

declare global {
  interface Window {
    __BC_ERROR_HOOK__?: (entry: DiagnosticEntry) => void;
  }
}

function renderDiagnostics(): void {
  const diagnosticsList = document.getElementById("diagnosticsList");
  if (!diagnosticsList) {
    return;
  }

  diagnosticsList.innerHTML = "";
  const logs = appStore.getState().diagnostics;
  if (!logs.length) {
    const li = document.createElement("li");
    li.className = "channel-item channel-empty-state";
    li.textContent = "Runtime diagnostics will appear here.";
    diagnosticsList.appendChild(li);
    return;
  }

  logs.slice(0, 25).forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <div class="channel-info">
        <div class="channel-copy">
          <span class="channel-name">${entry.message}</span>
          <span class="channel-meta">${entry.level.toUpperCase()} • ${new Date(
            entry.timestamp
          ).toLocaleTimeString()}${entry.context ? ` • ${entry.context}` : ""}</span>
        </div>
      </div>
    `;
    diagnosticsList.appendChild(li);
  });
}

export function logDiagnostic(
  level: DiagnosticEntry["level"],
  message: string,
  context?: string
): void {
  const entry: DiagnosticEntry = {
    context,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const nextEntries = [entry, ...appStore.getState().diagnostics].slice(0, 50);
  appStore.setDiagnostics(nextEntries);
  window.__BC_ERROR_HOOK__?.(entry);
}

export function exportDiagnostics(): void {
  const blob = new Blob(
    [JSON.stringify(appStore.getState().diagnostics, null, 2)],
    {
      type: "application/json",
    }
  );
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "broadcast-console-diagnostics.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export function initializeDiagnostics(): void {
  const exportButton = document.getElementById("exportDiagnostics");
  exportButton?.addEventListener("click", () => {
    exportDiagnostics();
  });

  window.addEventListener("error", (event) => {
    logDiagnostic("error", event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    logDiagnostic("error", String(event.reason), "promise");
  });

  appStore.subscribe(() => {
    renderDiagnostics();
  });

  renderDiagnostics();
}
