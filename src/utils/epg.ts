import { appStore } from "../store/appStore";
import { EpgChannel, EpgProgram, EpgState } from "../types/models";
import { setStoredEpg } from "./storage";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getChannelKeys(channelUrl: string): string[] {
  const channel = appStore
    .getState()
    .playlists.flatMap((playlist) => playlist.channels)
    .find((entry) => entry.url === channelUrl);

  if (!channel) {
    return [];
  }

  return [channel.id, channel.name, channel.displayName]
    .filter(Boolean)
    .map((value) => normalize(value));
}

function getProgramsForUrl(channelUrl: string): EpgProgram[] {
  const keys = getChannelKeys(channelUrl);
  if (!keys.length) {
    return [];
  }

  const epg = appStore.getState().epg;
  const matchingChannelIds = epg.channels
    .filter((channel) =>
      keys.includes(normalize(channel.id)) ||
      keys.includes(normalize(channel.displayName))
    )
    .map((channel) => normalize(channel.id));

  return epg.programs
    .filter((program) => {
      const programKey = normalize(program.channelId);
      return keys.includes(programKey) || matchingChannelIds.includes(programKey);
    })
    .sort((left, right) => left.start.localeCompare(right.start));
}

function setEpgFeedback(message: string, tone: "error" | "neutral" | "success"): void {
  const feedback = document.getElementById("epgFeedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.setAttribute("data-tone", tone);
}

function renderGuideForCurrentChannel(): void {
  const guideList = document.getElementById("guideProgramsList");
  const guideNow = document.getElementById("guideNowPlaying");
  const guideNext = document.getElementById("guideNextPlaying");
  const guideDrawer = document.getElementById("guideDrawer");
  const currentChannel = appStore.getState().player.currentChannel;

  if (!guideList || !guideNow || !guideNext || !guideDrawer) {
    return;
  }

  guideList.innerHTML = "";
  guideDrawer.innerHTML = "";

  if (!currentChannel) {
    guideNow.textContent = "No channel selected.";
    guideNext.textContent = "Load a guide and start playback to see the schedule.";
    return;
  }

  const programs = getProgramsForUrl(currentChannel.url);
  if (!programs.length) {
    guideNow.textContent = "Guide data not available for this channel.";
    guideNext.textContent = "Import XMLTV data to unlock now/next information.";
    const li = document.createElement("li");
    li.className = "channel-item channel-empty-state";
    li.textContent = "No schedule found for the selected channel.";
    guideList.appendChild(li);
    return;
  }

  const now = new Date();
  const currentProgram =
    programs.find((program) => new Date(program.start) <= now && new Date(program.end) >= now) ||
    programs[0];
  const nextProgram =
    programs.find((program) => new Date(program.start) > new Date(currentProgram.end));

  guideNow.textContent = `Now: ${currentProgram.title}`;
  guideNext.textContent = nextProgram
    ? `Next: ${nextProgram.title}`
    : "No upcoming program found.";

  programs.slice(0, 6).forEach((program) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <div class="channel-info">
        <div class="channel-copy">
          <span class="channel-name">${program.title}</span>
          <span class="channel-meta">${new Date(program.start).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${new Date(program.end).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
      </div>
    `;
    guideList.appendChild(li);

    const drawerItem = document.createElement("div");
    drawerItem.className = "guide-drawer-item";
    drawerItem.innerHTML = `
      <span class="guide-drawer-time">${new Date(program.start).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}</span>
      <div>
        <strong>${program.title}</strong>
        <p>${program.description || "No description available."}</p>
      </div>
    `;
    guideDrawer.appendChild(drawerItem);
  });
}

export function loadEpgFromUrl(url: string): Promise<void> {
  setEpgFeedback("Loading EPG data from remote XMLTV source...", "neutral");
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load EPG.");
      }
      return response.text();
    })
    .then((xmlText) => {
      importEpgText(xmlText, url);
    })
    .catch((error) => {
      setEpgFeedback("Could not load EPG data from this URL.", "error");
      throw error;
    });
}

export async function loadEpgFile(file: File): Promise<void> {
  setEpgFeedback(`Loading EPG file ${file.name}...`, "neutral");
  const xmlText = await file.text();
  importEpgText(xmlText, file.name);
}

export function importEpgText(xmlText: string, sourceLabel: string): void {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const parseError = xml.querySelector("parsererror");
  if (parseError) {
    setEpgFeedback("The EPG XML could not be parsed.", "error");
    throw new Error("EPG XML parse error.");
  }

  const channels: EpgChannel[] = Array.from(xml.querySelectorAll("channel")).map(
    (channelNode) => ({
      displayName:
        channelNode.querySelector("display-name")?.textContent?.trim() || "",
      id: channelNode.getAttribute("id") || "",
    })
  );

  const programs: EpgProgram[] = Array.from(xml.querySelectorAll("programme")).map(
    (programNode) => ({
      channelId: programNode.getAttribute("channel") || "",
      description:
        programNode.querySelector("desc")?.textContent?.trim() || "",
      end: programNode.getAttribute("stop") || "",
      start: programNode.getAttribute("start") || "",
      title: programNode.querySelector("title")?.textContent?.trim() || "Untitled",
    })
  );

  const epg: EpgState = {
    channels,
    loadedAt: new Date().toISOString(),
    programs,
    sourceLabel,
  };

  appStore.setEpg(epg);
  setStoredEpg(epg);
  setEpgFeedback(
    `Loaded ${programs.length} guide entries from ${sourceLabel}.`,
    "success"
  );
  renderGuideForCurrentChannel();
}

export function initializeEpg(): void {
  appStore.subscribe(() => {
    renderGuideForCurrentChannel();
  });
  renderGuideForCurrentChannel();
}

export function getGuideSearchText(channelUrl: string): string {
  return getProgramsForUrl(channelUrl)
    .slice(0, 4)
    .map((program) => `${program.title} ${program.description}`)
    .join(" ");
}
