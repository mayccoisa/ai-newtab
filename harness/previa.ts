/**
 * Prévia · desenha a edição atual como HTML estático, para olhar sem o Chrome.
 *
 * O Diário de verdade roda dentro da extensão, num sandbox. Para ver se a
 * edição está legível — e para comparar os dois modos de leitura lado a lado —
 * não vale carregar extensão a cada ajuste: isto renderiza a mesma home e o
 * mesmo kit no servidor e grava dois arquivos que abrem no navegador.
 *
 * O que NÃO aparece aqui: o que depende de clique (trocar de modo pelo seletor,
 * marcar lido, mudar o corpo do texto). Cada arquivo sai fixo num modo.
 *
 * Uso: pnpm previa [caminho-da-home]    → .previa/jornal.html e .previa/portal.html
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "sucrase";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KIT_PATH, OUT_PATH } from "./node-bridge";

const home = process.argv[2] ?? OUT_PATH;
const saida = join(import.meta.dir, "..", ".previa");

const paraJs = (tsx: string) =>
  transform(tsx, { transforms: ["typescript", "jsx", "imports"], jsxRuntime: "classic" }).code;

/** Avalia um módulo num shim CommonJS, igual ao que a extensão faz no sandbox. */
function avaliar(js: string, deps: Record<string, unknown>): Record<string, any> {
  const module_ = { exports: {} as any };
  new Function("require", "module", "exports", "React", js)(
    (name: string) => {
      if (name in deps) return deps[name];
      throw new Error(`import não permitido: "${name}"`);
    },
    module_,
    module_.exports,
    React,
  );
  return module_.exports;
}

const kit = avaliar(paraJs(readFileSync(KIT_PATH, "utf-8")), { react: React });
const exports_ = avaliar(paraJs(readFileSync(home, "utf-8")), {
  react: React,
  "./kit": kit,
  "./kit.js": kit,
});
const Home = exports_.default ?? exports_.PersonalizedHomepage;
if (typeof Home !== "function") throw new Error("a home não exporta um componente");

mkdirSync(saida, { recursive: true });

const html = renderToStaticMarkup(React.createElement(Home));
if (!html.includes("m-jornal")) throw new Error("a home não está usando o kit (classe m-* ausente)");

// O modo é uma classe no elemento raiz, então a prévia do outro modo é a mesma
// árvore com a classe trocada — sem reimplementar nada do kit aqui.
for (const modo of ["jornal", "portal"] as const) {
  const corpo = modo === "jornal" ? html : html.replace("m-jornal", "m-portal");
  const arquivo = join(saida, `${modo}.html`);
  writeFileSync(
    arquivo,
    `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Diário · modo ${modo}</title>
<style>html,body{margin:0}</style></head>
<body>${corpo}</body></html>`,
  );
  console.log(`✅ ${arquivo} (${corpo.length}b)`);
}

console.log(`
Abra os dois e compare. Conteúdo de ${home}.`);
