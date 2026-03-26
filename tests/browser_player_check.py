import json
from playwright.sync_api import sync_playwright


def snapshot(page, label):
    video_src = page.eval_on_selector(
        "#videoPlayer",
        "element => element.currentSrc || element.getAttribute('src') || ''",
    )
    return {
        "label": label,
        "channel": page.locator("#currentChannelName").inner_text(),
        "network": page.locator("#playerNetworkBadge").inner_text(),
        "retries": page.locator("#playerRetriesBadge").inner_text(),
        "state": page.locator(".player-container").get_attribute("data-player-state"),
        "status": page.locator("#playerStatus").inner_text(),
        "status_badge": page.locator("#playerStatusBadge").inner_text(),
        "video_src": video_src,
    }


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 960})
    console_messages = []

    page.on(
        "console",
        lambda message: console_messages.append(
            {
                "type": message.type,
                "text": message.text,
            }
        ),
    )

    page.goto("http://127.0.0.1:4173", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")

    results = [snapshot(page, "initial")]

    page.click("#loadTestPlaylist")
    page.wait_for_selector("#channelsList li.channel-item.collection-item")
    results.append(snapshot(page, "after_playlist"))

    preferred_names = ["Apple Sample", "Mux Demo", "Red Bull TV"]
    first_channel = None
    for preferred_name in preferred_names:
        candidate = page.locator(
            "#channelsList li.channel-item.collection-item",
            has_text=preferred_name,
        )
        if candidate.count() > 0:
            first_channel = candidate.first
            break

    if first_channel is None:
        first_channel = page.locator("#channelsList li.channel-item.collection-item").first
    first_channel_name = first_channel.locator(
        ".channel-copy .channel-name"
    ).inner_text().strip()
    first_channel.click()

    page.wait_for_function(
        """
        () => document.querySelector(".player-container")?.getAttribute("data-player-state") !== "idle"
        """,
        timeout=5000,
    )
    page.wait_for_timeout(2000)
    results.append(snapshot(page, "after_click"))

    page.wait_for_timeout(4000)
    results.append(snapshot(page, "after_settle"))

    page.screenshot(path="/tmp/iptv-player-browser-check.png", full_page=True)

    print(
        json.dumps(
            {
                "clicked_channel": first_channel_name,
                "console_tail": console_messages[-30:],
                "snapshots": results,
                "screenshot": "/tmp/iptv-player-browser-check.png",
            },
            indent=2,
        )
    )

    browser.close()
