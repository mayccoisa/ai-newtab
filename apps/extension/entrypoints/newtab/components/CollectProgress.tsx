import { useEffect, useRef, useState } from "react";
import { COLLECT_STEPS, LOG_RETENTION, type CollectState } from "@/lib/protocol";

/** Full-screen collection view: the step list on the left, the activity log on the right. */
export function CollectProgress({
  state,
  onCancel,
  onBack,
}: {
  state: CollectState;
  onCancel: () => void;
  /** Present when a collection runs over an existing homepage — offers a way back to it. */
  onBack?: () => void;
}) {
  const { stepIndex, detail, logs } = state;
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="build">
      <div className="build-left">
        <div className="build-panel">
          <div className="build-top">
            <span className="build-title">Coletando seus dados</span>
            <span className="build-elapsed">
              {mm}:{ss}
            </span>
          </div>

          <ol className="build-steps">
            {COLLECT_STEPS.map((step, i) => {
              const status = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
              return (
                <li key={step.label} className={`build-step ${status}`}>
                  <span className="build-marker">{status === "done" ? "✓" : i + 1}</span>
                  <div className="build-step-body">
                    <div className="build-step-label">{step.label}</div>
                    {status === "active" && detail && <div className="build-step-detail">{detail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="build-cancel" onClick={onCancel}>
              Cancelar
            </button>
            {onBack && (
              <button className="build-cancel" style={{ background: "transparent" }} onClick={onBack}>
                ← Voltar para a home
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="build-right">
        <div className="build-panel">
          <div className="build-eyebrow">O que está acontecendo</div>
          <div className="build-narration">
            Estou lendo seu histórico e abrindo, numa janela em segundo plano, as páginas que você
            acompanha. Quando terminar, é só pedir no chat do Claude Code para atualizar a home.
          </div>
          {logs.length > 0 && (
            <>
              <div className="build-eyebrow build-log-label">Registro</div>
              <pre className="build-log" ref={logRef}>
                {logs.slice(-LOG_RETENTION).join("\n")}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
