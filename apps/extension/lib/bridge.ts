import type { CollectPayload } from "@homepage/agent-core";

export const DEFAULT_BRIDGE_URL = "http://127.0.0.1:4317";

/** The bridge only ever lives on this machine; anything else is ignored. */
export function sanitizeBridgeUrl(value: string | undefined | null): string {
  const url = (value ?? "").trim().replace(/\/+$/, "");
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url) ? url : DEFAULT_BRIDGE_URL;
}

export interface BridgeStatus {
  homepageUpdatedAt: string | null;
  collectRequested: boolean;
  lastCollectAt: string | null;
}

export interface BridgeHomepage {
  code: string | null;
  updatedAt: string | null;
}

/** Resolves to `null` when the bridge is not running: offline is a normal state, not an error. */
async function request<T>(base: string, path: string, init?: RequestInit, timeoutMs = 4000): Promise<T | null> {
  try {
    const res = await fetch(base + path, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const bridgeClient = (base: string) => ({
  status: () => request<BridgeStatus>(base, "/status"),
  homepage: () => request<BridgeHomepage>(base, "/homepage"),
  sources: async () => (await request<{ urls: string[] }>(base, "/sources"))?.urls ?? [],
  /** Pages can be megabytes, so this call gets a long timeout. */
  collect: (payload: CollectPayload) =>
    request<{ ok: true; pages: number }>(
      base,
      "/collect",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
      60_000,
    ),
});
