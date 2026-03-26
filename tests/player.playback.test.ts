describe("player playback wiring", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("starts playback when a channel play event is dispatched", async () => {
    await jest.isolateModulesAsync(async () => {
      const playMock = jest
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue(undefined);
      jest
        .spyOn(HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => undefined);
      jest
        .spyOn(HTMLMediaElement.prototype, "load")
        .mockImplementation(() => undefined);

      const { Player } = await import("../src/components/Player");
      const { initializePlayerService } = await import(
        "../src/services/playerService"
      );
      const { appStore } = await import("../src/store/appStore");

      const player = Player();
      document.body.appendChild(player);

      const video = document.getElementById("videoPlayer") as HTMLVideoElement;
      Object.defineProperty(video, "canPlayType", {
        configurable: true,
        value: jest.fn().mockReturnValue("probably"),
      });

      initializePlayerService();

      window.dispatchEvent(
        new CustomEvent("app:play-channel", {
          detail: {
            name: "Test Channel",
            url: "https://example.com/live.m3u8",
          },
        })
      );

      video.onloadedmetadata?.(
        new Event("loadedmetadata") as Event & {
          currentTarget: HTMLVideoElement;
          target: HTMLVideoElement;
        }
      );

      expect(appStore.getState().player.currentChannel?.name).toBe("Test Channel");
      expect(video.src).toBe("https://example.com/live.m3u8");
      expect(playMock).toHaveBeenCalled();
    });
  });

  it("moves to an error state after retries are exhausted", async () => {
    jest.useFakeTimers();

    try {
      await jest.isolateModulesAsync(async () => {
        jest
          .spyOn(HTMLMediaElement.prototype, "pause")
          .mockImplementation(() => undefined);
        jest
          .spyOn(HTMLMediaElement.prototype, "load")
          .mockImplementation(() => undefined);

        const { Player } = await import("../src/components/Player");
        const { initializePlayerService } = await import(
          "../src/services/playerService"
        );
        const { appStore } = await import("../src/store/appStore");

        const player = Player();
        document.body.appendChild(player);

        const video = document.getElementById("videoPlayer") as HTMLVideoElement;
        Object.defineProperty(video, "canPlayType", {
          configurable: true,
          value: jest.fn().mockReturnValue("probably"),
        });

        initializePlayerService();

        window.dispatchEvent(
          new CustomEvent("app:play-channel", {
            detail: {
              name: "Unstable Channel",
              url: "https://example.com/unstable.m3u8",
            },
          })
        );

        video.dispatchEvent(new Event("error"));
        jest.advanceTimersByTime(900);
        expect(appStore.getState().player.retries).toBe(1);

        video.dispatchEvent(new Event("error"));
        jest.advanceTimersByTime(900);
        expect(appStore.getState().player.retries).toBe(2);

        video.dispatchEvent(new Event("error"));
        expect(appStore.getState().player.status).toBe("error");
        expect(appStore.getState().player.errorMessage).toContain("Playback");
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
