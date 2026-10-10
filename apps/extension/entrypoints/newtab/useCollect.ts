import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLLECT_PORT,
  INITIAL_COLLECT_STATE,
  LOG_RETENTION,
  type CollectMsg,
  type CollectState,
  type PageMsg,
} from "@/lib/protocol";

type Port = ReturnType<typeof browser.runtime.connect>;

/** Reduce a worker → page message into the local mirror of the collection state. */
function reduce(state: CollectState, msg: CollectMsg): CollectState {
  switch (msg.kind) {
    case "snapshot":
      return msg.state;
    case "phase":
      return {
        ...state,
        running: true,
        phase: msg.phase,
        stepIndex: Math.max(state.stepIndex, msg.stepIndex),
        detail: msg.detail,
      };
    case "log":
      return { ...state, logs: [...state.logs.slice(-LOG_RETENTION), msg.line] };
    case "done":
      return { ...state, running: false, phase: "done" };
    case "error":
      return { ...state, running: false, phase: "error", error: msg.message };
  }
}

/**
 * Thin client onto the worker-hosted collection. Connects the port, subscribes
 * for a snapshot, and reduces incoming deltas into React state. Every open tab
 * runs one of these, so they all show the same live run.
 */
export function useCollect() {
  const [state, setState] = useState<CollectState>(INITIAL_COLLECT_STATE);
  const portRef = useRef<Port | null>(null);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const port = browser.runtime.connect({ name: COLLECT_PORT });
      portRef.current = port;
      port.onMessage.addListener((raw) => setState((s) => reduce(s, raw as CollectMsg)));
      port.onDisconnect.addListener(() => {
        portRef.current = null;
        // A disconnect means the worker was torn down; reconnecting wakes it.
        if (!disposed) setTimeout(connect, 500);
      });
      port.postMessage({ kind: "subscribe" } satisfies PageMsg);
    };

    connect();
    return () => {
      disposed = true;
      portRef.current?.disconnect();
      portRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    portRef.current?.postMessage({ kind: "start" } satisfies PageMsg);
    // Optimistic: flip to the progress screen now; the worker's deltas take over.
    setState({ ...INITIAL_COLLECT_STATE, running: true, phase: "history" });
  }, []);

  const cancel = useCallback(() => {
    portRef.current?.postMessage({ kind: "cancel" } satisfies PageMsg);
  }, []);

  return { state, start, cancel };
}
