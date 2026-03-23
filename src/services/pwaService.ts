interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function updateInstallUi(): void {
  const installButton = document.getElementById(
    "installAppButton"
  ) as HTMLButtonElement | null;
  const installStatus = document.getElementById("installStatus");
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  if (installStatus) {
    installStatus.textContent = isStandalone
      ? "Installed app mode active"
      : "Installable web app available";
  }

  if (installButton) {
    installButton.hidden = isStandalone || !deferredPrompt;
  }
}

export function initializePwa(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.error("Service worker registration failed.", error);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    updateInstallUi();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updateInstallUi();
  });

  const installButton = document.getElementById(
    "installAppButton"
  ) as HTMLButtonElement | null;
  installButton?.addEventListener("click", async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    updateInstallUi();
  });

  updateInstallUi();
}
