function clearIndexedDb(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("broadcast-console-storage");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe("app startup", () => {
  beforeEach(async () => {
    jest.resetModules();
    localStorage.clear();
    await clearIndexedDb();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("mounts the main application shell", () => {
    jest.isolateModules(() => {
      require("../src/index");
      document.dispatchEvent(new Event("DOMContentLoaded"));
    });

    expect(document.querySelector(".main-container")).not.toBeNull();
    expect(document.getElementById("sidebar")).not.toBeNull();
    expect(document.getElementById("videoPlayer")).not.toBeNull();
    expect(document.getElementById("toggleTheme")).not.toBeNull();
    expect(document.getElementById("playlistPreset")).not.toBeNull();
    expect(document.getElementById("loadPlaylistPreset")).not.toBeNull();
    expect(document.getElementById("guidePanel")?.hasAttribute("hidden")).toBe(true);
  });
});
