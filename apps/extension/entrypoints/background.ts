import { CollectManager } from "@/lib/collector";
import { COLLECT_PORT } from "@/lib/protocol";

/**
 * The service worker owns the data collection (CollectManager). It reads what
 * only the browser can see — history and logged-in pages — and hands it to the
 * local bridge, where Claude Code picks it up. There is no LLM call anywhere.
 *
 * New-tab pages are thin views that connect on COLLECT_PORT. The alarm heartbeat
 * checks the bridge for a collection request from Claude and for the scheduled
 * auto-collect.
 */
const HEARTBEAT_ALARM = "homepage-heartbeat";

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

  browser.runtime.onStartup.addListener(() => void manager.tick());
  browser.runtime.onInstalled.addListener(() => void manager.tick());
  void manager.tick();
});
