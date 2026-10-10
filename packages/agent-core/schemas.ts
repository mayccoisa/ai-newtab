/** Defaults and ceilings for what a collection reads. */
export const DEFAULTS = {
  daysToAnalyze: 14,
  maxResults: 30,
  /** Extra wait after a page loads, for lazy-rendered content. */
  loadDelayMs: 8000,
  /** Cap on titles carried per domain in the digest. */
  sampleTitles: 5,
  /** Pages opened per collection. */
  maxPages: 8,
} as const;
