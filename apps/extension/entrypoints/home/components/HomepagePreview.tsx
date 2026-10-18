import { SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { toRenderable } from "@/lib/transpile";
// O kit entra como TEXTO: ele roda no sandbox, ao lado da home, não nesta página.
import kitSource from "../kit/diario-kit.tsx?raw";

const INDEX_JS = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Diário</title></head>
<body><div id="root"></div></body></html>`;

/** Transformado uma vez: o kit não muda enquanto a extensão está carregada. */
const KIT_JS = toRenderable(kitSource);

/**
 * Renders the agent's component in a Sandpack iframe. The code is
 * model-generated, so it runs sandboxed rather than in the extension's own page.
 *
 * Ao lado dela vai `/kit.js`, o kit de leitura versionado no repositório: a home
 * escrita pelo Claude traz o conteúdo e importa daqui o jeito de ler, em vez de
 * reescrever o layout a cada rodada.
 */
export function HomepagePreview({ code }: { code: string }) {
  const files = {
    "/App.js": { code },
    "/kit.js": { code: KIT_JS },
    "/index.js": { code: INDEX_JS },
    "/index.html": { code: INDEX_HTML },
  };

  return (
    <SandpackProvider files={files} template="react" options={{ autorun: true }}>
      <SandpackLayout style={{ height: "100vh", width: "100vw", border: 0, borderRadius: 0 }}>
        <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} showRefreshButton={false} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
