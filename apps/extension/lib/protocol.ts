/**
 * Protocol between the new-tab page(s) and the service worker.
 *
 * The worker owns exactly one collection at a time and is the single source of
 * truth for its state (see collector.ts). Tabs are thin, disposable views: they
 * connect on COLLECT_PORT, receive a snapshot, then stream deltas.
 */
export const COLLECT_PORT = "homepage-collector";

export type CollectPhase = "history" | "scraping" | "sending" | "done" | "error";

/** Live collection state. The worker holds the canonical copy; tabs reduce into a mirror. */
export interface CollectState {
  running: boolean;
  phase: CollectPhase | null;
  /** High-water index into COLLECT_STEPS — only advances. */
  stepIndex: number;
  detail: string;
  logs: string[];
  error: string | null;
}

export const INITIAL_COLLECT_STATE: CollectState = {
  running: false,
  phase: null,
  stepIndex: 0,
  detail: "",
  logs: [],
  error: null,
};

/** How many recent log lines are kept (and shown). */
export const LOG_RETENTION = 40;

// page → worker
export type PageMsg =
  | { kind: "subscribe" } //   → replies with a snapshot
  | { kind: "start" } //       no-op if a collection is already running
  | { kind: "cancel" };

// worker → page (broadcast to every connected tab)
export type CollectMsg =
  | { kind: "snapshot"; state: CollectState }
  | { kind: "phase"; phase: CollectPhase; stepIndex: number; detail: string }
  | { kind: "log"; line: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export const COLLECT_STEPS: { label: string; phases: CollectPhase[] }[] = [
  { label: "Lendo seu histórico", phases: ["history"] },
  { label: "Abrindo as páginas no seu navegador", phases: ["scraping"] },
  { label: "Enviando para o Claude Code", phases: ["sending", "done"] },
];

/** Which step a phase belongs to, or `undefined` if it shouldn't move the stepper. */
export function stepForPhase(phase: CollectPhase): number | undefined {
  const i = COLLECT_STEPS.findIndex((step) => step.phases.includes(phase));
  return i === -1 ? undefined : i;
}
