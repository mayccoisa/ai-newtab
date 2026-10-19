/**
 * Prévia · abre a edição atual no navegador, interativa, sem carregar extensão.
 *
 * O Diário de verdade roda dentro da extensão, num sandbox. Para julgar se a
 * edição está legível — e para comparar os dois modos de leitura — não vale
 * carregar extensão a cada ajuste no kit. Esta prévia empacota React, o kit e a
 * home num único HTML que abre direto do disco: os seletores de modo e de
 * tamanho, o "já li" e as abas funcionam de verdade.
 *
 * (A primeira versão era HTML estático, sem JavaScript, e nada respondia ao
 * clique. Era prévia de leitura, não de uso.)
 *
 * O que ela NÃO prova: a ponte local, a coleta e os avisos da própria aba da
 * extensão, que não existem fora dela.
 *
 * Uso: pnpm previa [caminho-da-home]   →  .previa/diario.html
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { KIT_PATH, OUT_PATH } from "./node-bridge";

const home = process.argv[2] ?? OUT_PATH;
const saida = join(import.meta.dir, "..", ".previa");
// A pasta de obras fica dentro do harness, que é o workspace que tem react e
// react-dom instalados: é de lá que o empacotador os resolve.
const obras = join(import.meta.dir, ".obras");

// A home importa './kit', então ela e um reexport do kit precisam ficar lado a
// lado. Montamos isso numa pasta de obras, sem tocar nos arquivos de verdade.
rmSync(obras, { recursive: true, force: true });
mkdirSync(obras, { recursive: true });
cpSync(home, join(obras, "home.tsx"));
writeFileSync(
  join(obras, "kit.tsx"),
  `export * from ${JSON.stringify(relative(obras, KIT_PATH).replace(/\\/g, "/"))};\n` +
    `export { default } from ${JSON.stringify(relative(obras, KIT_PATH).replace(/\\/g, "/"))};\n`,
);
writeFileSync(
  join(obras, "entrada.tsx"),
  `import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./home";

createRoot(document.getElementById("raiz")!).render(<Home />);
`,
);

const build = await Bun.build({
  entrypoints: [join(obras, "entrada.tsx")],
  target: "browser",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  throw new Error("o empacotamento falhou");
}

const js = await build.outputs[0].text();
// Em arquivo próprio, não embutido: o bundle minificado tem sequências que o
// parser de HTML corta no meio quando vão dentro de <script>.
writeFileSync(join(saida, "diario.js"), js);
const arquivo = join(saida, "diario.html");
writeFileSync(
  arquivo,
  `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Diário · prévia</title>
<style>html,body{margin:0}</style></head>
<body><div id="raiz"></div><script src="./diario.js"></script></body></html>`,
);
rmSync(obras, { recursive: true, force: true });

console.log(`✅ ${arquivo} (${Math.round(js.length / 1024)} kB de JS)`);
console.log(`   Conteúdo de ${home}. Os seletores de modo e tamanho funcionam.`);
