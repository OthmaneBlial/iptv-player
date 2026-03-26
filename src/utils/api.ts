/**
 * IPTV API Client
 * TypeScript wrapper for WASM backend and storage operations
 */

import type {
  Channel,
  FilterState,
  PlaylistLibrarySnapshot,
  PlaylistRecord,
} from "../types/models";
import { getStoredPlaylistLibrary, setStoredPlaylistLibrary } from "./storage";

// Type definitions for WASM module
// @ts-ignore - WASM module is dynamically loaded
declare module "../../iptv-wasm/pkg/iptv_wasm.js" {
  export default function(): Promise<void>;
  export function parse_playlist(data: string, base_url: string): Channel[];
  export function filter_channels_js(channels: Channel[], filter: FilterState): Channel[];
  export function search_channels_js(channels: Channel[], query: string): [Channel, number][];
  export function get_fuzzy_score(value: string, query: string): number;
  export function get_unique_groups(channels: Channel[]): string[];
  export function get_unique_countries(channels: Channel[]): string[];
  export function get_unique_languages(channels: Channel[]): string[];
  export function sort_channels_by_favorites(channels: Channel[], favorites: string[]): Channel[];
}

interface IptvWasmModule {
  parse_playlist(data: string, base_url: string): Channel[];
  filter_channels_js(channels: Channel[], filter: FilterState): Channel[];
  search_channels_js(channels: Channel[], query: string): [Channel, number][];
  get_fuzzy_score(value: string, query: string): number;
  get_unique_groups(channels: Channel[]): string[];
  get_unique_countries(channels: Channel[]): string[];
  get_unique_languages(channels: Channel[]): string[];
  sort_channels_by_favorites(channels: Channel[], favorites: string[]): Channel[];
}

let wasmModule: IptvWasmModule | null = null;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module
 */
export async function initWasm(): Promise<void> {
  if (wasmModule) return;

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    console.log('[WASM] Initializing...');
    try {
      // Try to load from pkg directory (development)
      // @ts-ignore
      const module = await import("../../iptv-wasm/pkg/iptv_wasm.js");
      console.log('[WASM] Module loaded, initializing...');
      await module.default();
      console.log('[WASM] Initialized successfully!');
      wasmModule = module;
    } catch (err) {
      console.warn('[WASM] Failed to load WASM module, using JavaScript fallback:', err);
      // Fallback to pure JavaScript implementations
      wasmModule = createJsFallback();
    }
  })();

  await wasmInitPromise;
}

/**
 * Create JavaScript fallback implementations when WASM is not available
 */
function createJsFallback(): IptvWasmModule {
  return {
    parse_playlist: parseM3UJs,
    filter_channels_js: filterChannelsJs,
    search_channels_js: searchChannelsJs,
    get_fuzzy_score: fuzzyScoreJs,
    get_unique_groups: (channels) => [...new Set(channels.map((c) => c.group).filter(Boolean))].sort(),
    get_unique_countries: (channels) => [...new Set(channels.map((c) => c.country).filter(Boolean))].sort(),
    get_unique_languages: (channels) => [...new Set(channels.map((c) => c.language).filter(Boolean))].sort(),
    sort_channels_by_favorites: (channels, favorites) => {
      const favSet = new Set(favorites);
      return [...channels].sort((a, b) => {
        const aFav = favSet.has(a.url);
        const bFav = favSet.has(b.url);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
    },
  };
}

/**
 * Parse M3U playlist (JavaScript fallback)
 */
function parseM3UJs(data: string, baseUrl: string): Channel[] {
  const lines = data.split("\n");
  const channels: Channel[] = [];
  let currentAttrs: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#EXTINF")) {
      const separatorIndex = trimmed.indexOf(",");
      const metadata = separatorIndex >= 0 ? trimmed.slice(0, separatorIndex) : trimmed;
      const title = separatorIndex >= 0 ? trimmed.slice(separatorIndex + 1).trim() : "Unknown";

      currentAttrs = { title };

      const attrPattern = /([\w-]+)="([^"]*)"/g;
      let match;
      while ((match = attrPattern.exec(metadata)) !== null) {
        currentAttrs[match[1]] = match[2];
      }
    } else if (trimmed && !trimmed.startsWith("#")) {
      const url = resolveUrlJs(trimmed, baseUrl);
      if (url) {
        const name = currentAttrs["tvg-name"] || currentAttrs["title"] || "Unknown";
        channels.push({
          name,
          url,
          logo: currentAttrs["tvg-logo"] || "",
          group: currentAttrs["group-title"] || "Ungrouped",
          country: currentAttrs["tvg-country"] || "",
          language: currentAttrs["tvg-language"] || "",
          id: currentAttrs["tvg-id"] || "",
          displayName: currentAttrs["title"] || name,
        });
      }
      currentAttrs = {};
    }
  }

  return channels;
}

/**
 * Resolve URL (JavaScript fallback)
 */
function resolveUrlJs(url: string, baseUrl: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) return url;

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

/**
 * Filter channels (JavaScript fallback)
 */
function filterChannelsJs(channels: Channel[], filter: FilterState): Channel[] {
  return channels.filter((channel) => {
    if (filter.country !== "all" && channel.country !== filter.country) return false;
    if (filter.group !== "all" && channel.group !== filter.group) return false;
    if (filter.language !== "all" && channel.language !== filter.language) return false;
    if (filter.query) {
      const q = filter.query.toLowerCase();
      return (
        fuzzyScoreJs(channel.displayName, q) >= 0 ||
        fuzzyScoreJs(channel.group, q) >= 0 ||
        fuzzyScoreJs(channel.country, q) >= 0 ||
        fuzzyScoreJs(channel.name, q) >= 0
      );
    }
    return true;
  });
}

/**
 * Search channels (JavaScript fallback)
 */
function searchChannelsJs(channels: Channel[], query: string): [Channel, number][] {
  if (!query) return [];
  const q = query.toLowerCase();
  const results: [Channel, number][] = [];

  for (const channel of channels) {
    const maxScore = Math.max(
      fuzzyScoreJs(channel.displayName, q),
      fuzzyScoreJs(channel.group, q),
      fuzzyScoreJs(channel.country, q),
      fuzzyScoreJs(channel.name, q)
    );
    if (maxScore >= 0) {
      results.push([channel, maxScore]);
    }
  }

  return results.sort((a, b) => b[1] - a[1]);
}

/**
 * Fuzzy score (JavaScript fallback)
 */
function fuzzyScoreJs(value: string, query: string): number {
  if (!query) return 0;
  const v = value.toLowerCase();
  const idx = v.indexOf(query);
  if (idx >= 0) return 1000 - idx;

  let score = 0;
  let qIdx = 0;
  for (const ch of v) {
    if (ch === query[qIdx]) {
      score += 10;
      qIdx++;
      if (qIdx === query.length) return score;
    }
  }
  return -1;
}

/**
 * Get the WASM module (ensuring it's initialized)
 */
async function getWasm(): Promise<IptvWasmModule> {
  if (!wasmModule) {
    await initWasm();
  }
  return wasmModule!;
}

/**
 * API Client class
 */
export class IptvApi {
  /**
   * Fetch playlist from URL
   */
  async fetchPlaylist(url: string): Promise<Channel[]> {
    const wasm = await getWasm();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.statusText}`);
    }
    const data = await response.text();
    return wasm.parse_playlist(data, url);
  }

  /**
   * Parse playlist from text
   */
  async parsePlaylist(data: string, baseUrl = ""): Promise<Channel[]> {
    const wasm = await getWasm();
    return wasm.parse_playlist(data, baseUrl);
  }

  /**
   * Filter channels
   */
  async filterChannels(channels: Channel[], filters: FilterState): Promise<Channel[]> {
    const wasm = await getWasm();
    return wasm.filter_channels_js(channels, filters);
  }

  /**
   * Search channels with fuzzy matching
   */
  async searchChannels(channels: Channel[], query: string): Promise<[Channel, number][]> {
    const wasm = await getWasm();
    return wasm.search_channels_js(channels, query);
  }

  /**
   * Get fuzzy score
   */
  async getFuzzyScore(value: string, query: string): Promise<number> {
    const wasm = await getWasm();
    return wasm.get_fuzzy_score(value, query);
  }

  /**
   * Get unique groups
   */
  async getUniqueGroups(channels: Channel[]): Promise<string[]> {
    const wasm = await getWasm();
    return wasm.get_unique_groups(channels);
  }

  /**
   * Get unique countries
   */
  async getUniqueCountries(channels: Channel[]): Promise<string[]> {
    const wasm = await getWasm();
    return wasm.get_unique_countries(channels);
  }

  /**
   * Get unique languages
   */
  async getUniqueLanguages(channels: Channel[]): Promise<string[]> {
    const wasm = await getWasm();
    return wasm.get_unique_languages(channels);
  }

  /**
   * Sort channels by favorites
   */
  async sortChannelsByFavorites(channels: Channel[], favorites: string[]): Promise<Channel[]> {
    const wasm = await getWasm();
    return wasm.sort_channels_by_favorites(channels, favorites);
  }

  // Storage operations using existing storage.ts

  async savePlaylistLibrary(snapshot: PlaylistLibrarySnapshot): Promise<void> {
    await setStoredPlaylistLibrary(snapshot);
  }

  async getPlaylistLibrary(): Promise<PlaylistLibrarySnapshot> {
    const library = await getStoredPlaylistLibrary();
    return library ?? {
      activePlaylistId: null,
      defaultPlaylistId: null,
      playlists: [],
    };
  }
}

// Create singleton instance
export const iptvApi = new IptvApi();

/**
 * Synchronous wrapper functions for cases where async is not feasible
 * These use the JS fallback until WASM is loaded
 */

export function parsePlaylistSync(data: string, baseUrl = ""): Channel[] {
  if (wasmModule) {
    return wasmModule.parse_playlist(data, baseUrl);
  }
  return parseM3UJs(data, baseUrl);
}

export function fuzzyScoreSync(value: string, query: string): number {
  if (wasmModule) {
    return wasmModule.get_fuzzy_score(value, query);
  }
  return fuzzyScoreJs(value, query);
}

export function filterChannelsSync(channels: Channel[], filter: FilterState): Channel[] {
  if (wasmModule) {
    return wasmModule.filter_channels_js(channels, filter);
  }
  return filterChannelsJs(channels, filter);
}
