describe("app startup", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("mounts the main application shell", () => {
    jest.isolateModules(() => {
      require("../src/index");
      document.dispatchEvent(new Event("DOMContentLoaded"));
    });

    expect(document.getElementById("header")).not.toBeNull();
    expect(document.getElementById("sidebar")).not.toBeNull();
    expect(document.getElementById("videoPlayer")).not.toBeNull();
  });
});
