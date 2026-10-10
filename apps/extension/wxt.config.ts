import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AI Homepage (Claude Code)",
    description: "Uma nova aba que o Claude Code monta para você a partir do que você acompanha, sem chave de API.",
    permissions: [
      "history", //       collector: rank the sites you actually visit
      "tabs", //          collector: open pages and watch them load
      "scripting", //     collector: inject the scraper into loaded pages
      "storage", //       settings and the last homepage received
      "alarms", //        heartbeat: notice a collection request from Claude, scheduled collection
    ],
    // Needed to scrape arbitrary pages and to reach the local bridge on 127.0.0.1.
    host_permissions: ["<all_urls>"],
  },
});
