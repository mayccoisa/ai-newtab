/**
 * Ícones · desenha o ícone da extensão a partir do SVG que está aqui dentro.
 *
 * O ícone era a peça de quebra-cabeça do template do WXT, que não diz nada
 * sobre o que isto entrega. O desenho é uma página de jornal: nameplate, o fio
 * vermelho do Diário e duas colunas. Em 16 e 32 px a versão detalhada vira
 * borrão, então esses tamanhos usam um desenho mais simples.
 *
 * Rasteriza com o Chrome que já está na máquina (o mesmo que o harness usa),
 * em vez de trazer uma dependência de imagem só para cinco PNGs.
 *
 * Uso:
 *   node scripts/icones.mjs            # regrava apps/extension/public/icon/*.png
 *   CHROME_PATH=... node scripts/icones.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "apps/extension/public/icon");
const TAMANHOS = [16, 32, 48, 96, 128];

const CANDIDATOS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);

const chrome = CANDIDATOS.find((c) => existsSync(c));
if (!chrome) {
  console.error("Não achei o Chrome. Passe CHROME_PATH=... para o rasterizador.");
  process.exit(1);
}

const TINTA = "#15161a";
const PAPEL = "#faf7ef";
const FIO = "#8a1c13";
const TEXTO = "#c7c3b8";
const TEXTO_FRACO = "#d8d5cc";

/** Página com duas colunas: lê bem a partir de 48 px. */
const DETALHADO = `
  <rect x="24" y="22" width="80" height="84" rx="5" fill="${PAPEL}"/>
  <rect x="33" y="32" width="62" height="11" rx="2" fill="${TINTA}"/>
  <rect x="33" y="48" width="62" height="4" rx="2" fill="${FIO}"/>
  <rect x="33" y="58" width="28" height="22" rx="2" fill="${TEXTO}"/>
  <rect x="33" y="85" width="28" height="5" rx="2.5" fill="${TEXTO}"/>
  <rect x="33" y="94" width="20" height="5" rx="2.5" fill="${TEXTO_FRACO}"/>
  <rect x="67" y="58" width="28" height="5" rx="2.5" fill="${TEXTO}"/>
  <rect x="67" y="67" width="28" height="5" rx="2.5" fill="${TEXTO}"/>
  <rect x="67" y="76" width="22" height="5" rx="2.5" fill="${TEXTO_FRACO}"/>
  <rect x="67" y="85" width="28" height="5" rx="2.5" fill="${TEXTO_FRACO}"/>
  <rect x="67" y="94" width="16" height="5" rx="2.5" fill="${TEXTO_FRACO}"/>
`;

/** Nameplate, fio e duas linhas: o que ainda sobrevive em 16 px. */
const SIMPLES = `
  <rect x="19" y="19" width="90" height="90" rx="9" fill="${PAPEL}"/>
  <rect x="31" y="31" width="66" height="17" rx="3" fill="${TINTA}"/>
  <rect x="31" y="55" width="66" height="9" rx="4.5" fill="${FIO}"/>
  <rect x="31" y="72" width="66" height="11" rx="5.5" fill="${TEXTO}"/>
  <rect x="31" y="89" width="44" height="11" rx="5.5" fill="${TEXTO}"/>
`;

const svg = (tamanho) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${tamanho}" height="${tamanho}">
  <rect width="128" height="128" rx="28" fill="${TINTA}"/>
  ${tamanho <= 32 ? SIMPLES : DETALHADO}
</svg>`;

const obras = mkdtempSync(join(tmpdir(), "icones-"));
mkdirSync(DESTINO, { recursive: true });

for (const tamanho of TAMANHOS) {
  const fonte = join(obras, `${tamanho}.html`);
  const saida = join(DESTINO, `${tamanho}.png`);
  // O SVG já vem no tamanho final e a janela tem a medida exata: sem reamostragem.
  writeFileSync(
    fonte,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:transparent}
     </style></head><body>${svg(tamanho)}</body></html>`,
  );
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--default-background-color=00000000",
      `--window-size=${tamanho},${tamanho}`,
      `--screenshot=${saida}`,
      `file:///${fonte.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore" },
  );
  console.log(`✅ ${saida}`);
}

rmSync(obras, { recursive: true, force: true });
console.log("\nRode `pnpm build` e recarregue a extensão em chrome://extensions.");
