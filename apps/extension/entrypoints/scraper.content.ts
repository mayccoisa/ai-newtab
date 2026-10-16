/**
 * Injected on demand by lib/scraper.ts (never auto-registered). Scrolls the page
 * to trigger lazy-loaded content, then returns its title and body HTML.
 */
export default defineContentScript({
  registration: "runtime",
  main() {
    // Function to scroll the page
    const scrollPage = async () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      // A tab in a background window can report innerHeight 0; never step by 0.
      const scrollDistance = Math.max(viewportHeight * 0.8, 400);
      let currentPosition = 0;
      // Timers are throttled in background tabs, so cap the walk by steps and time.
      const deadline = Date.now() + 10_000;
      let steps = 0;

      // Scroll down the page in increments
      while (currentPosition < scrollHeight && steps++ < 25 && Date.now() < deadline) {
        window.scrollTo(0, currentPosition);
        currentPosition += scrollDistance;

        // Wait for content to load (adjust delay as needed)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Scroll to the very bottom
      window.scrollTo(0, scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Back to the top
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 200));
    };

    // News sites lazy-load photos (data-src, srcset, <picture>); pin the real URL on src
    // so the sanitized HTML keeps an image next to each headline.
    const resolveLazyImages = () => {
      for (const img of Array.from(document.images)) {
        const lazy =
          img.currentSrc ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-lazy-src") ||
          img.getAttribute("data-original") ||
          (img.getAttribute("data-srcset") || img.getAttribute("srcset") || "").split(",")[0]?.trim().split(" ")[0] ||
          img.closest("picture")?.querySelector("source")?.getAttribute("srcset")?.split(",")[0]?.trim().split(" ")[0];
        const current = img.getAttribute("src") || "";
        if (lazy && (!current || current.startsWith("data:") || lazy !== current)) {
          try {
            img.setAttribute("src", new URL(lazy, location.href).href);
          } catch {}
        }
      }
    };

    const convertPageToHTML = async () => {
      // Scroll the page first to trigger lazy-loaded content
      await scrollPage();
      resolveLazyImages();

      // Return raw HTML and title after scrolling
      return {
        url: location.href,
        title: document.title,
        html: document.body.innerHTML,
      };
    };

    // executeScript resolves with this value
    return convertPageToHTML();
  },
});
