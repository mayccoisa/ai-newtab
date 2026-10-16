import { CollectManager } from "@/lib/collector";
import { COLLECT_PORT } from "@/lib/protocol";

/**
 * The service worker owns the data collection (CollectManager). It reads what
 * only the browser can see — history and logged-in pages — and hands it to the
 * local bridge, where Claude Code picks it up. There is no LLM call anywhere.
 *
 * The home page (home.html) is a thin view that connects on COLLECT_PORT. It is not
 * the new tab: it opens once when Chrome starts and whenever the toolbar icon is
 * clicked. The alarm heartbeat checks the bridge for a collection request from
 * Claude and for the scheduled auto-collect.
 */
const HEARTBEAT_ALARM = "homepage-heartbeat";
const HOME_PATH = "/home.html";

/** Bring the home page forward if it is already open; otherwise open it in a new tab. */
async function openHome() {
  const url = browser.runtime.getURL(HOME_PATH);
  const [open] = await browser.tabs.query({ url });
  if (open?.id != null) {
    await browser.tabs.update(open.id, { active: true });
    if (open.windowId != null) await browser.windows.update(open.windowId, { focused: true });
    return;
  }
  await browser.tabs.create({ url });
}

export default defineBackground(() => {
  const manager = new CollectManager();

  browser.runtime.onConnect.addListener((port) => {
    if (port.name === COLLECT_PORT) manager.attach(port);
  });

  // ~1 min is the chrome.alarms floor — fine for noticing a request from Claude.
  browser.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === HEARTBEAT_ALARM) void manager.tick();
  });

  browser.action.onClicked.addListener(() => void openHome());

  browser.runtime.onStartup.addListener(() => {
    void openHome();
    void manager.tick();
  });
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") void openHome();
    void manager.tick();
  });
  void manager.tick();
});
