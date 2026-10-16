/**
 * Capas · busca a foto de capa (og:image) de cada matéria que está na home.
 *
 * A coleta lê páginas de listagem, que quase nunca trazem a foto de cada
 * matéria. Este script parte dos links que já estão em curadoria/homepage.tsx,
 * abre cada matéria (só o HTML, sem navegador), lê o og:image e grava o mapa
 * link → foto em curadoria/coleta/capas.json. Com --aplicar, também reescreve o
 * bloco CAPAS da home, entre os marcadores "capas:inicio" e "capas:fim".
 *
 * Uso:
 *   pnpm capas              # busca e grava capas.json
 *   pnpm capas --aplicar    # e atualiza o bloco CAPAS da homepage.tsx
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOME = join(ROOT, "curadoria/homepage.tsx");
const SAIDA = join(ROOT, "curadoria/coleta/capas.json");
const aplicar = process.argv.includes("--aplicar");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

function ogImage(html, base) {
  const head = html.slice(0, 300_000);
  const tag =
    head.match(/<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]*>/i)?.[0] ?? "";
  const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
  // Imagem genérica do site (placeholder, og-image padrão) é pior que nenhuma foto.
  if (!content || /placeholder|\/og-image\.|default-(share|og)/i.test(content)) return null;
  try {
    return new URL(content.replace(/&amp;/g, "&"), base).href;
  } catch {
    return null;
  }
}

async function capa(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "pt-BR,pt;q=0.9,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    return ogImage(await res.text(), res.url || url);
  } catch {
    return null;
  }
}

async function main() {
  const fonte = readFileSync(HOME, "utf8");
  const links = [...new Set([...fonte.matchAll(/\bu:\s*['"](https?:[^'"]+)['"]/g)].map((m) => m[1]))];
  const fila = [...links];
  const achadas = {};
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (fila.length) {
        const url = fila.shift();
        const img = await capa(url);
        if (img) achadas[url] = img;
      }
    }),
  );

  const anteriores = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, "utf8")) : {};
  writeFileSync(SAIDA, JSON.stringify({ ...anteriores, ...achadas }, null, 2));
  const sem = links.filter((u) => !achadas[u]);
  console.log(`capas: ${Object.keys(achadas).length} de ${links.length} links`);
  if (sem.length) console.log("sem foto:\n  " + sem.join("\n  "));

  if (aplicar) {
    const ini = "// capas:inicio";
    const fim = "// capas:fim";
    const a = fonte.indexOf(ini);
    const b = fonte.indexOf(fim);
    if (a < 0 || b < a) {
      console.error(`A home não tem o bloco "${ini}" … "${fim}"; nada aplicado.`);
      return 1;
    }
    const bloco =
      `${ini} (gerado por pnpm capas --aplicar)\nconst CAPAS: Record<string, string> = ${JSON.stringify(achadas, null, 2)};\n`;
    writeFileSync(HOME, fonte.slice(0, a) + bloco + fonte.slice(b));
    console.log("bloco CAPAS da home atualizado");
  }
  return 0;
}

// exitCode, e não process.exit: no Windows, sair logo depois de um fetch derruba o libuv.
process.exitCode = await main();
