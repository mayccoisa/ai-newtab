import { useState } from "react";
import { normalizeBlockList } from "@homepage/agent-core";
import { COLLECT_INTERVAL_CHOICES } from "@/lib/auto-collect";
import { sanitizeBridgeUrl } from "@/lib/bridge";
import { btn } from "./ui";

const field = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: 12,
  fontSize: 14,
  borderRadius: 4,
  border: "1px solid #ddd",
  fontFamily: "inherit",
} as const;

export function SettingsModal({
  blockedSites,
  bridgeUrl,
  autoCollect,
  onToggleAutoCollect,
  intervalHours,
  onChangeInterval,
  onClose,
  onSave,
}: {
  blockedSites: string[];
  bridgeUrl: string;
  autoCollect: boolean;
  onToggleAutoCollect: (next: boolean) => void;
  intervalHours: number;
  onChangeInterval: (next: number) => void;
  onClose: () => void;
  onSave: (blockedSites: string[], bridgeUrl: string) => void;
}) {
  const [blockedDraft, setBlockedDraft] = useState(blockedSites.join("\n"));
  const [urlDraft, setUrlDraft] = useState(bridgeUrl);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: "white", borderRadius: 8, padding: 24, width: "90%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0, color: "#333" }}>Configurações</h2>
        <p style={{ color: "#666", fontSize: 14, lineHeight: 1.5 }}>
          O visual e o conteúdo da home você pede no chat do Claude Code ("deixa mais enxuta", "põe
          o clima no topo"). Aqui ficam só as regras do que o navegador pode ler.
        </p>

        <label style={{ display: "block", marginTop: 16, color: "#333", fontSize: 14 }}>
          Sites que nunca são lidos
          <textarea
            value={blockedDraft}
            onChange={(e) => setBlockedDraft(e.target.value)}
            aria-describedby="blocked-sites-help"
            style={{ ...field, minHeight: 120 }}
          />
        </label>
        <p id="blocked-sites-help" style={{ color: "#888", fontSize: 12, margin: "6px 0 0" }}>
          Um por linha. Subdomínios entram junto. Use *.exemplo.com para curinga.
        </p>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, color: "#333", fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={autoCollect} onChange={(e) => onToggleAutoCollect(e.target.checked)} />
          Coletar dados automaticamente
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginLeft: 24, color: autoCollect ? "#333" : "#aaa", fontSize: 14 }}>
          A cada
          <select
            value={intervalHours}
            disabled={!autoCollect}
            onChange={(e) => onChangeInterval(Number(e.target.value))}
            style={{ padding: "4px 8px", fontSize: 14, borderRadius: 4, border: "1px solid #ddd" }}
          >
            {COLLECT_INTERVAL_CHOICES.map((h) => (
              <option key={h} value={h}>
                {h === 24 ? "24 horas (diário)" : `${h} horas`}
              </option>
            ))}
          </select>
        </label>
        <p style={{ color: "#888", fontSize: 12, margin: "6px 0 0" }}>
          Só renova o material de leitura (sem custo). Quem monta a home é o Claude Code, quando você pede.
        </p>

        <label style={{ display: "block", marginTop: 16, color: "#333", fontSize: 14 }}>
          Endereço da ponte local
          <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} style={{ ...field, fontFamily: "ui-monospace, monospace" }} />
        </label>
        <p style={{ color: "#888", fontSize: 12, margin: "6px 0 0" }}>
          Só aceita 127.0.0.1 ou localhost. Padrão: http://127.0.0.1:4317
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btn, backgroundColor: "white", color: "#333", border: "1px solid #ddd" }}>
            Cancelar
          </button>
          <button onClick={() => onSave(normalizeBlockList(blockedDraft.split("\n")), sanitizeBridgeUrl(urlDraft))} style={btn}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
