import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_BLOCKED_SITES } from "@homepage/agent-core";
import { DEFAULT_COLLECT_INTERVAL_HOURS } from "@/lib/auto-collect";
import { DEFAULT_BRIDGE_URL } from "@/lib/bridge";
import { COLLECT_STEPS } from "@/lib/protocol";
import { loadSettings, saveSetting } from "@/lib/storage";
import { toRenderable } from "@/lib/transpile";
import { CollectProgress } from "./components/CollectProgress";
import { HomepagePreview } from "./components/HomepagePreview";
import { SettingsModal } from "./components/SettingsModal";
import { btn, errorBox } from "./components/ui";
import { useBridgeHomepage } from "./useBridgeHomepage";
import { useCollect } from "./useCollect";

const mono = { fontFamily: "ui-monospace, monospace", background: "#f1f1f1", padding: "2px 6px", borderRadius: 3 } as const;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [blockedSites, setBlockedSites] = useState<string[]>(DEFAULT_BLOCKED_SITES);
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [autoCollect, setAutoCollect] = useState(true);
  const [intervalHours, setIntervalHours] = useState(DEFAULT_COLLECT_INTERVAL_HOURS);
  const [showSettings, setShowSettings] = useState(false);
  /** Expand the full progress view over an existing homepage. */
  const [viewProgress, setViewProgress] = useState(false);
  /** The error the user dismissed, so a stale banner doesn't linger. */
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const { state, start, cancel } = useCollect();
  const homepage = useBridgeHomepage(bridgeUrl);
  const renderedCode = useMemo(() => (homepage.code ? toRenderable(homepage.code) : null), [homepage.code]);

  useEffect(() => {
    if (!state.running) setViewProgress(false);
  }, [state.running]);

  useEffect(() => {
    (async () => {
      try {
        const settings = await loadSettings();
        setBlockedSites(settings.blockedSites);
        setBridgeUrl(settings.bridgeUrl ?? DEFAULT_BRIDGE_URL);
        setAutoCollect(settings.autoCollect);
        setIntervalHours(settings.collectIntervalHours ?? DEFAULT_COLLECT_INTERVAL_HOURS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveRules = useCallback(async (sites: string[], url: string) => {
    await Promise.all([saveSetting("blockedSites", sites), saveSetting("bridgeUrl", url)]);
    setBlockedSites(sites);
    setBridgeUrl(url);
    setShowSettings(false);
  }, []);

  const toggleAutoCollect = useCallback(async (next: boolean) => {
    setAutoCollect(next);
    await saveSetting("autoCollect", next);
  }, []);
  const changeInterval = useCallback(async (next: number) => {
    setIntervalHours(next);
    await saveSetting("collectIntervalHours", next);
  }, []);

  if (loading || !homepage.ready) return <div style={{ padding: 20, textAlign: "center" }}>Carregando…</div>;

  // With no homepage to fall back to, a running collection takes over the tab.
  if (state.running && (!renderedCode || viewProgress)) {
    return (
      <CollectProgress
        state={state}
        onCancel={cancel}
        onBack={renderedCode ? () => setViewProgress(false) : undefined}
      />
    );
  }

  if (!renderedCode) {
    return (
      <div style={{ maxWidth: 600, margin: "12vh auto", padding: 24, fontFamily: "system-ui", color: "#222" }}>
        <h1 style={{ fontSize: 26 }}>Sua home ainda não foi montada</h1>
        <p style={{ color: "#555", lineHeight: 1.6 }}>
          Quem monta a home é o Claude Code, direto no chat — sem chave de API. O navegador só junta
          o material (histórico e páginas que você acompanha) e o Claude escreve a home a partir dele.
        </p>
        <ol style={{ color: "#444", lineHeight: 1.9, paddingLeft: 20 }}>
          <li>
            Na pasta do projeto, rode <code style={mono}>pnpm bridge</code>{" "}
            {homepage.online ? <b style={{ color: "#0a7" }}>(✓ ponte conectada)</b> : <b style={{ color: "#a02620" }}>(ponte offline)</b>}
          </li>
          <li>Clique em <b>Coletar dados</b> abaixo.</li>
          <li>No chat do Claude Code, peça: <i>"monta minha home"</i>. Ela aparece aqui sozinha.</li>
        </ol>
        {state.error && (
          <div style={{ ...errorBox, margin: "16px 0", padding: 12, borderRadius: 4 }}>{state.error}</div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button style={{ ...btn, opacity: homepage.online ? 1 : 0.5 }} disabled={!homepage.online} onClick={start}>
            Coletar dados
          </button>
          <button style={{ ...btn, backgroundColor: "#555" }} onClick={() => setShowSettings(true)}>
            ⚙️ Configurações
          </button>
        </div>
        {showSettings && settingsModal()}
      </div>
    );
  }

  function settingsModal() {
    return (
      <SettingsModal
        blockedSites={blockedSites}
        bridgeUrl={bridgeUrl ?? DEFAULT_BRIDGE_URL}
        autoCollect={autoCollect}
        onToggleAutoCollect={toggleAutoCollect}
        intervalHours={intervalHours}
        onChangeInterval={changeInterval}
        onClose={() => setShowSettings(false)}
        onSave={saveRules}
      />
    );
  }

  const showError = state.error && dismissedError !== state.error;

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", gap: 8, alignItems: "center" }}>
        <span
          title={homepage.online ? "Ponte local conectada: edições do Claude aparecem aqui sozinhas" : "Ponte offline. Rode: pnpm bridge"}
          style={{ ...btn, backgroundColor: "rgba(0,0,0,0.55)", cursor: "default", fontSize: 12, padding: "6px 10px" }}
        >
          {homepage.online ? "● Claude conectado" : "○ ponte offline"}
        </span>
        {state.running ? (
          <button
            style={{ ...btn, backgroundColor: "#0a7", display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setViewProgress(true)}
            title="Ver progresso da coleta"
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "white",
                animation: "hb-pulse 1.2s ease-in-out infinite",
              }}
            />
            Coletando… {Math.min(state.stepIndex + 1, COLLECT_STEPS.length)}/{COLLECT_STEPS.length}
          </button>
        ) : (
          <button
            style={{ ...btn, opacity: homepage.online ? 1 : 0.5 }}
            disabled={!homepage.online}
            onClick={start}
            title={
              homepage.collectRequested
                ? "O Claude pediu uma coleta nova: ela começa em instantes"
                : "Junta histórico e páginas novas para o Claude usar na próxima atualização"
            }
          >
            {homepage.collectRequested ? "⏳ Coleta pedida" : "↻ Coletar dados"}
          </button>
        )}
        <button style={btn} onClick={() => setShowSettings(true)} title="Configurações">
          ⚙️
        </button>
      </div>

      {showError && (
        <div
          style={{
            ...errorBox,
            position: "fixed",
            top: 20,
            left: 20,
            right: 420,
            zIndex: 999,
            padding: "10px 14px",
            borderRadius: 6,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ flex: 1 }}>
            <b>A coleta falhou.</b> {state.error}
          </span>
          <button style={{ ...btn, padding: "4px 10px", backgroundColor: "#a02620" }} onClick={start}>
            Tentar de novo
          </button>
          <button
            onClick={() => setDismissedError(state.error)}
            style={{ background: "transparent", border: "none", color: "#a02620", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            title="Dispensar"
          >
            ✕
          </button>
        </div>
      )}

      <HomepagePreview code={renderedCode} />

      {showSettings && settingsModal()}
    </div>
  );
}
