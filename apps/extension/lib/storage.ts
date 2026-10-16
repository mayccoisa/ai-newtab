import { DEFAULT_BLOCKED_SITES, type KVStore } from "@homepage/agent-core";
import { DEFAULT_BRIDGE_URL, sanitizeBridgeUrl } from "./bridge";

/** Everything the extension persists, in one place (all in chrome.storage.local). */
export const KEYS = {
  /** Last homepage received from the bridge, so the home page paints with the bridge off. */
  homepage: "homepageData",
  blockedSites: "blockedSites",
  autoCollect: "autoCollect",
  collectIntervalHours: "autoCollectIntervalHours",
  bridgeUrl: "bridgeUrl",
  /** ISO timestamp of the last auto-collect *attempted* (success or not). */
  lastAutoAttempt: "lastAutoCollectAttempt",
} as const;

export interface Homepage {
  /** The TSX source Claude wrote. */
  code: string;
  /** The bridge's `updatedAt` for this code (the file's modified time). */
  timestamp: string;
}

export interface Settings {
  blockedSites: string[];
  /** Unset means on — auto-collect is opt-out. */
  autoCollect: boolean;
  collectIntervalHours: number | null;
  bridgeUrl: string;
}

export const extensionStore: KVStore = {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export async function loadSettings(): Promise<Settings> {
  const s = await browser.storage.local.get([
    KEYS.blockedSites,
    KEYS.autoCollect,
    KEYS.collectIntervalHours,
    KEYS.bridgeUrl,
  ]);
  return {
    blockedSites: (s[KEYS.blockedSites] as string[] | undefined) ?? [...DEFAULT_BLOCKED_SITES],
    autoCollect: s[KEYS.autoCollect] !== false,
    collectIntervalHours: (s[KEYS.collectIntervalHours] as number | undefined) ?? null,
    bridgeUrl: sanitizeBridgeUrl((s[KEYS.bridgeUrl] as string | undefined) ?? DEFAULT_BRIDGE_URL),
  };
}

const SETTING_KEYS: Record<keyof Settings, string> = {
  blockedSites: KEYS.blockedSites,
  autoCollect: KEYS.autoCollect,
  collectIntervalHours: KEYS.collectIntervalHours,
  bridgeUrl: KEYS.bridgeUrl,
};

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await browser.storage.local.set({ [SETTING_KEYS[key]]: value });
}

export async function loadHomepage(): Promise<Homepage | undefined> {
  return extensionStore.get<Homepage>(KEYS.homepage);
}

export async function saveHomepage(code: string, timestamp: string): Promise<void> {
  const homepage: Homepage = { code, timestamp };
  await extensionStore.set(KEYS.homepage, homepage);
}
