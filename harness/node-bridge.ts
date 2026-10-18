/**
 * Fixtures for the Bun tests: a stand-in for what the extension's lib/history.ts
 * produces from chrome.history, and where Claude writes the homepage.
 */
import { join } from "node:path";
import type { RawSiteMetadata } from "@homepage/agent-core";

/** curadoria/homepage.tsx — the file Claude Code writes and the extension renders. */
export const OUT_PATH = join(import.meta.dir, "..", "curadoria", "homepage.tsx");

/** O kit de leitura que a home importa como "./kit", versionado no repositório. */
export const KIT_PATH = join(
  import.meta.dir,
  "..",
  "apps/extension/entrypoints/home/kit/diario-kit.tsx",
);

const DAY = 24 * 60 * 60 * 1000;

/** Stand-in for what the extension's lib/history.ts produces from chrome.history. */
export function fixtureHistory(now = Date.now()): RawSiteMetadata[] {
  const make = (
    domain: string,
    totalVisits: number,
    uniquePages: number,
    hoursAgo: number,
    titles: string[],
    score: number,
  ): RawSiteMetadata => ({
    domain,
    totalVisits,
    uniquePages,
    lastVisitTime: now - hoursAgo * 60 * 60 * 1000,
    averageVisitsPerDay: totalVisits / 14,
    titles,
    urls: titles.map((_, i) => `https://${domain}/item/${i}`),
    relevanceScore: score,
  });

  return [
    make("news.ycombinator.com", 142, 63, 1, ["Hacker News", "Show HN: a thing", "Ask HN: how do you"], 0.94),
    make("lobste.rs", 58, 24, 3, ["Lobsters", "Rust in the kernel"], 0.81),
    make("arstechnica.com", 44, 31, 6, ["Ars Technica", "Space policy roundup"], 0.72),
    make("github.com", 210, 96, 0.5, ["GitHub", "pull requests", "issues"], 0.69),
    make("mail.google.com", 300, 4, 0.2, ["Inbox (12)"], 0.66),
    make("stackoverflow.com", 33, 30, 26, ["How to center a div"], 0.41),
    make("en.wikipedia.org", 21, 19, 50, ["Cache coherence", "Byzantine fault"], 0.33),
    ...Array.from({ length: 40 }, (_, i) =>
      make(`filler-${i}.example.com`, 3, 2, 100 + i, [`Filler ${i}`], 0.2 - i * 0.001),
    ),
  ];
}

/** Crude sanitizer approximating the extension's cleanHtmlForLLM (lib/scraper.ts). */
