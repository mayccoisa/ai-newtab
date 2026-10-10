/**
 * Contracts shared by the collector and the local bridge.
 *
 * Nothing in this package may import `chrome`, `browser`, or `node:*`: it is
 * pure data shaping, so the extension and the Node tests can both use it.
 */

/** One domain's worth of browsing history, narrowed to fit in a context window. */
export interface SiteDigest {
  domain: string;
  visits: number;
  pages: number;
  /** ISO 8601 — readable dates beat epoch milliseconds. */
  lastVisit: string;
  score: number;
  /** Capped. `urls[]` is dropped entirely. */
  sampleTitles: string[];
}

export interface GetHistoryResult {
  windowDays: number;
  /** What the digest is *not* showing. Without this the reader assumes it is exhaustive. */
  totalSitesSeen: number;
  sites: SiteDigest[];
}

/** Raw per-domain history, as a BrowserBridge returns it — before `buildHistoryDigest` narrows it. */
export interface RawSiteMetadata {
  domain: string;
  totalVisits: number;
  uniquePages: number;
  lastVisitTime: number;
  averageVisitsPerDay: number;
  titles: string[];
  urls: string[];
  relevanceScore: number;
}

export interface ScrapedPage {
  url: string;
  /** Where the page ended up after redirects, when the host can tell. */
  finalUrl?: string;
  title: string;
  html: string;
}

/** The two capabilities only a real browser has. */
export interface BrowserBridge {
  getHistory(args: {
    daysToAnalyze: number;
    maxResults: number;
  }): Promise<{ sites: RawSiteMetadata[]; totalSitesSeen: number }>;

  getPageHtml(args: {
    urls: string[];
    loadDelayMs?: number;
  }): Promise<{ pages: ScrapedPage[]; failed: Array<{ url: string; reason: string }> }>;
}

/** Minimal persistence. `chrome.storage.local` in the extension. */
export interface KVStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** What the extension POSTs to the local bridge on every collection. */
export interface CollectPayload {
  /** ISO timestamp of when the collection finished. */
  collectedAt: string;
  history: GetHistoryResult;
  pages: ScrapedPage[];
  failed: Array<{ url: string; reason: string }>;
}
