interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare const __ENABLE_PWA__: boolean | undefined;

let deferredPrompt: BeforeInstallPromptEvent | null = null;

async function disableDevPwa(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

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
      : deferredPrompt
        ? "Install prompt ready"
        : "Use your browser menu to install";
  }

  if (installButton) {
    installButton.hidden = isStandalone || !deferredPrompt;
  }
}

export function initializePwa(): void {
  const pwaEnabled =
    typeof __ENABLE_PWA__ !== "undefined" ? __ENABLE_PWA__ === true : true;

  if (!pwaEnabled) {
    void disableDevPwa().catch((error) => {
      console.warn("Failed to disable service workers for development.", error);
    });
  } else if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.error("Service worker registration failed.", error);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
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
