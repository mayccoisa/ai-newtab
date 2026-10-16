/**
 * Cover photos for the articles a page links to. Listing pages rarely carry the
 * photo of each story (lazy-loaded, or only a CSS background), but every article
 * declares its share image in <meta property="og:image">. We fetch the article
 * HTML (with the user's cookies, no tab) and read just that tag.
 */

const PER_PAGE = 15;
const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;

/** Links that look like a story: same site, a slug-like path, not a section index. */
export function articleLinks(html: string, pageUrl: string, limit = PER_PAGE): string[] {
  let origin: URL;
  try {
    origin = new URL(pageUrl);
  } catch {
    return [];
  }
  const site = origin.hostname.replace(/^www\./, "");
  const out = new Set<string>();
  for (const match of html.matchAll(/<a href="([^"]+)"/g)) {
    let url: URL;
    try {
      url = new URL(match[1].replace(/&amp;/g, "&"), origin);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || !url.hostname.replace(/^www\./, "").endsWith(site)) continue;
    const path = url.pathname;
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    // A story slug is long and hyphenated (or an .html/.ghtml file); sections are short words.
    if (!(slug.length >= 20 && slug.includes("-")) && !/\.g?html?$/.test(slug)) continue;
    url.hash = "";
    out.add(url.href);
    if (out.size >= limit) break;
  }
  return [...out];
}

function ogImage(html: string, base: string): string | null {
  const head = html.slice(0, 200_000);
  const tag =
    head.match(/<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]*>/i)?.[0] ?? "";
  const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
  if (!content) return null;
  try {
    return new URL(content.replace(/&amp;/g, "&"), base).href;
  } catch {
    return null;
  }
}

async function fetchCover(url: string, signal: AbortSignal): Promise<string | null> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, { credentials: "include", signal: AbortSignal.any([signal, timeout]) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return ogImage(await res.text(), res.url || url);
  } catch {
    return null;
  }
}

/** url → image for every article that declared one. Never throws. */
export async function collectCovers(
  urls: string[],
  isAllowed: (url: string) => boolean,
  signal: AbortSignal,
): Promise<Record<string, string>> {
  const queue = urls.filter(isAllowed);
  const covers: Record<string, string> = {};
  const worker = async () => {
    while (queue.length && !signal.aborted) {
      const url = queue.shift()!;
      const image = await fetchCover(url, signal);
      if (image) covers[url] = image;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return covers;
}
