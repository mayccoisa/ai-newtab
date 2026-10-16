import {
  DEFAULTS,
  buildHistoryDigest,
  isAllowedUrl,
  isBlocked,
  normalizeBlockList,
  type CollectPayload,
} from "@homepage/agent-core";
import { shouldAutoCollect, collectIntervalMs } from "./auto-collect";
import { bridgeClient } from "./bridge";
import { getHistorySites } from "./history";
import {
  COLLECT_PORT,
  INITIAL_COLLECT_STATE,
  LOG_RETENTION,
  stepForPhase,
  type CollectMsg,
  type CollectPhase,
  type CollectState,
  type PageMsg,
} from "./protocol";
import { articleLinks, collectCovers } from "./covers";
import { scrapeUrls } from "./scraper";
import { KEYS, extensionStore, loadSettings } from "./storage";

type Port = Parameters<Parameters<typeof browser.runtime.onConnect.addListener>[0]>[0];

/**
 * While a collection runs, ping a cheap chrome API on this interval to reset
 * the ~30s MV3 idle-unload timer (scraping spends most of its time waiting).
 */
const KEEPALIVE_INTERVAL_MS = 20_000;

/** Sources Claude lists in curadoria/fontes.json are capped so one typo can't open 100 tabs. */
const MAX_EXPLICIT_SOURCES = 16;

export { COLLECT_PORT };

/**
 * Owns the single collection. Gathers what only the browser can see (history
 * and logged-in pages), hands it to the local bridge, and broadcasts progress
 * to every connected tab. Claude Code then reads it from disk and writes the
 * homepage — nothing here calls an LLM.
 *
 * One instance per service worker, i.e. one per browser profile, so
 * single-flight is per-profile.
 */
export class CollectManager {
  private state: CollectState = { ...INITIAL_COLLECT_STATE };
  private readonly ports = new Set<Port>();
  private controller: AbortController | null = null;
  private running = false;
  private keepalive: ReturnType<typeof setInterval> | null = null;

  // ---- port lifecycle ------------------------------------------------------

  attach(port: Port) {
    this.ports.add(port);
    port.onDisconnect.addListener(() => this.ports.delete(port));
    port.onMessage.addListener((raw) => {
      const msg = raw as PageMsg;
      if (msg.kind === "subscribe") this.send(port, { kind: "snapshot", state: this.state });
      else if (msg.kind === "start") void this.start("manual");
      else if (msg.kind === "cancel") this.controller?.abort();
    });
  }

  private send(port: Port, msg: CollectMsg) {
    try {
      port.postMessage(msg);
    } catch {
      this.ports.delete(port);
    }
  }

  private broadcast(msg: CollectMsg) {
    for (const port of this.ports) this.send(port, msg);
  }

  // ---- state ---------------------------------------------------------------

  private phase(phase: CollectPhase, detail = "") {
    const step = stepForPhase(phase);
    this.state = {
      ...this.state,
      running: true,
      phase,
      stepIndex: step === undefined ? this.state.stepIndex : Math.max(this.state.stepIndex, step),
      detail,
    };
    this.broadcast({ kind: "phase", phase, stepIndex: this.state.stepIndex, detail });
  }

  private log(line: string) {
    this.state = { ...this.state, logs: [...this.state.logs.slice(-LOG_RETENTION), line] };
    this.broadcast({ kind: "log", line });
  }

  // ---- heartbeat -----------------------------------------------------------

  /**
   * Called on every wake and every alarm. Collects when Claude asked for it
   * (the `pedido-coleta` flag), or when the auto-collect interval has passed.
   * A bridge that isn't running is normal, so this stays silent.
   */
  async tick() {
    if (this.running) return;
    const settings = await loadSettings();
    const status = await bridgeClient(settings.bridgeUrl).status();
    if (!status) return;

    if (status.collectRequested) {
      await this.start("pedido do Claude");
      return;
    }

    const lastAutoAttemptAt = await extensionStore.get<string>(KEYS.lastAutoAttempt);
    const due = shouldAutoCollect({
      enabled: settings.autoCollect,
      isRunning: this.running,
      lastCollectAt: status.lastCollectAt,
      lastAutoAttemptAt,
      intervalMs: collectIntervalMs(settings.collectIntervalHours),
      now: new Date(),
    });
    if (!due) return;
    await extensionStore.set(KEYS.lastAutoAttempt, new Date().toISOString());
    await this.start("agendada");
  }

  // ---- the collection ------------------------------------------------------

  async start(reason: string) {
    if (this.running) return;
    this.running = true;
    this.controller = new AbortController();
    this.state = { ...INITIAL_COLLECT_STATE, running: true };
    this.keepalive = setInterval(() => void browser.runtime.getPlatformInfo(), KEEPALIVE_INTERVAL_MS);
    this.log(`coleta iniciada (${reason})`);

    try {
      await this.collect(this.controller.signal);
      this.state = { ...this.state, running: false, phase: "done" };
      this.broadcast({ kind: "done" });
    } catch (err) {
      const message = this.controller.signal.aborted
        ? "Coleta cancelada."
        : err instanceof Error
          ? err.message
          : String(err);
      this.state = { ...this.state, running: false, phase: "error", error: message };
      this.broadcast({ kind: "error", message });
    } finally {
      if (this.keepalive) clearInterval(this.keepalive);
      this.keepalive = null;
      this.controller = null;
      this.running = false;
    }
  }

  private async collect(signal: AbortSignal) {
    const settings = await loadSettings();
    const blocked = normalizeBlockList(settings.blockedSites);
    const bridge = bridgeClient(settings.bridgeUrl);
    const aborted = () => {
      if (signal.aborted) throw new Error("aborted");
    };

    if (!(await bridge.status())) {
      throw new Error("A ponte local não está rodando. Abra um terminal na pasta do projeto e rode: pnpm bridge");
    }

    this.phase("history", `últimos ${DEFAULTS.daysToAnalyze} dias`);
    const raw = await getHistorySites(DEFAULTS.daysToAnalyze, DEFAULTS.maxResults);
    const allowed = raw.sites.filter((site) => !isBlocked(site.domain, blocked));
    const history = buildHistoryDigest(allowed, {
      daysToAnalyze: DEFAULTS.daysToAnalyze,
      maxResults: DEFAULTS.maxResults,
      totalSitesSeen: allowed.length,
    });
    this.log(`histórico: ${history.sites.length} de ${history.totalSitesSeen} sites`);
    aborted();

    // Claude can pin the sources in curadoria/fontes.json; otherwise the most-visited sites.
    const explicit = await bridge.sources();
    const candidates = explicit.length
      ? explicit.slice(0, MAX_EXPLICIT_SOURCES)
      : history.sites.slice(0, DEFAULTS.maxPages).map((site) => `https://${site.domain}/`);
    const urls = candidates.filter((url) => isAllowedUrl(url, blocked));
    if (urls.length < candidates.length) this.log(`bloqueados pelas suas configurações: ${candidates.length - urls.length}`);

    this.phase("scraping", `${urls.length} página(s)`);
    const report = urls.length ? await scrapeUrls(urls, { loadDelay: DEFAULTS.loadDelayMs }) : { pages: [], failed: [] };
    // A redirect can land on a blocked host; drop what it read before anything leaves the browser.
    const pages = report.pages.filter((page) => !page.finalUrl || isAllowedUrl(page.finalUrl, blocked));
    const failed = [
      ...report.failed,
      ...report.pages
        .filter((page) => !pages.includes(page))
        .map((page) => ({ url: page.url, reason: "bloqueada pelas configurações do usuário" })),
    ];
    this.log(`páginas lidas: ${pages.length}, falhas: ${failed.length}`);
    aborted();

    // The photo of each story, from its own og:image — listing pages rarely keep it.
    const articles = [...new Set(pages.flatMap((page) => articleLinks(page.html, page.finalUrl || page.url)))];
    this.phase("scraping", `fotos de ${articles.length} matéria(s)`);
    const covers = await collectCovers(articles, (url) => isAllowedUrl(url, blocked), signal);
    this.log(`fotos de capa: ${Object.keys(covers).length} de ${articles.length} matérias`);
    aborted();

    this.phase("sending", "ponte local");
    const payload: CollectPayload = { collectedAt: new Date().toISOString(), history, pages, failed, covers };
    const sent = await bridge.collect(payload);
    if (!sent) throw new Error("A ponte local recusou ou não respondeu ao envio da coleta.");
    this.log(`enviado: ${sent.pages} página(s)`);
  }
}
