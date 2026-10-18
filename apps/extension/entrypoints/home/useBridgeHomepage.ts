import { useEffect, useState } from "react";
import { bridgeClient } from "@/lib/bridge";
import { loadHomepage, saveHomepage } from "@/lib/storage";

const POLL_INTERVAL_MS = 3000;

export interface BridgeHomepageState {
  /** Raw TSX of the current homepage, or null before one exists. */
  code: string | null;
  /** True once the first read of storage has finished, so the empty state doesn't flash. */
  ready: boolean;
  /** Whether the bridge answered on the last poll. */
  online: boolean;
  /** `curadoria/pedido-coleta` is waiting for the worker's next heartbeat. */
  collectRequested: boolean;
  /** ISO da última coleta que chegou à ponte, ou null. Alimenta o aviso de edição velha. */
  lastCollectAt: string | null;
}

/**
 * The homepage is whatever Claude last wrote to curadoria/homepage.tsx. Paint the
 * cached copy instantly, then poll the bridge's cheap /status and only download
 * the code when its modified time moves — so an edit in the chat shows up here
 * within seconds, without reloading.
 */
export function useBridgeHomepage(bridgeUrl: string | null): BridgeHomepageState {
  const [state, setState] = useState<BridgeHomepageState>({
    code: null,
    ready: false,
    online: false,
    collectRequested: false,
    lastCollectAt: null,
  });

  useEffect(() => {
    if (!bridgeUrl) return;
    let disposed = false;
    let seen: string | null = null;
    const bridge = bridgeClient(bridgeUrl);

    void loadHomepage().then((cached) => {
      if (disposed) return;
      seen = cached?.timestamp ?? null;
      setState((s) => ({ ...s, code: cached?.code ?? s.code, ready: true }));
    });

    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      const status = await bridge.status();
      if (disposed) return;
      if (!status) {
        setState((s) => ({ ...s, online: false }));
        return;
      }
      let code: string | null = null;
      if (status.homepageUpdatedAt && status.homepageUpdatedAt !== seen) {
        const fresh = await bridge.homepage();
        if (disposed) return;
        if (fresh?.code && fresh.updatedAt) {
          seen = fresh.updatedAt;
          code = fresh.code;
          await saveHomepage(fresh.code, fresh.updatedAt);
        }
      }
      setState((s) => ({
        ...s,
        code: code ?? s.code,
        online: true,
        collectRequested: status.collectRequested,
        lastCollectAt: status.lastCollectAt ?? s.lastCollectAt,
      }));
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [bridgeUrl]);

  return state;
}
