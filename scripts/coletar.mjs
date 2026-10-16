/**
 * Coletar · pede uma coleta nova à extensão e espera ela chegar.
 *
 * Feito para o Claude Code rodar sozinho: confere a ponte (sobe se estiver
 * desligada), registra o pedido, espera o `lastCollectAt` ficar mais novo que o
 * pedido e imprime o que veio e o que falhou, lido de curadoria/coleta/indice.json.
 *
 * Precisa do Chrome aberto com a extensão carregada: é o heartbeat dela (1 min)
 * que vê o pedido e abre as páginas.
 *
 * Uso:
 *   pnpm coleta              # pede e espera até 10 min
 *   pnpm coleta --max 15     # espera até 15 min
 *   pnpm coleta --status     # só mostra o estado da ponte e da última coleta
 *
 * Sai com 0 quando a coleta chega, 1 quando o tempo acaba ou a ponte não sobe.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.NEWTAB_PORT || 4317);
const BASE = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);
const maxMin = Number(args[args.indexOf("--max") + 1]) || 10;
const soStatus = args.includes("--status");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, init) {
  try {
    const res = await fetch(BASE + path, { ...init, signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function garantirPonte() {
  if (await get("/health")) return true;
  console.log("Ponte desligada; subindo em segundo plano...");
  const child = spawn(process.execPath, [join(ROOT, "apps/bridge/server.mjs")], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await get("/health")) return true;
  }
  return false;
}

function resumo() {
  const idx = JSON.parse(readFileSync(join(ROOT, "curadoria/coleta/indice.json"), "utf8"));
  console.log(`Coleta de ${new Date(idx.collectedAt).toLocaleString("pt-BR")}`);
  console.log(`  lidas (${idx.pages.length}):`);
  for (const p of idx.pages) console.log(`    ok    ${p.url}  (${Math.round(p.bytes / 1024)} KB)`);
  if (idx.failed?.length) {
    console.log(`  falharam (${idx.failed.length}):`);
    for (const f of idx.failed) console.log(`    falha ${f.url}  · ${f.reason}`);
  }
}

async function main() {
  if (!(await garantirPonte())) {
    console.error(`A ponte não respondeu em ${BASE}. Rode "pnpm bridge" para ver o erro.`);
    return 1;
  }

  if (soStatus) {
    console.log(JSON.stringify(await get("/status"), null, 2));
    return 0;
  }

  const pedidoEm = Date.now();
  await get("/request-collect", { method: "POST" });
  console.log(`Pedido registrado. Esperando a extensão (até ${maxMin} min; ela olha a cada ~1 min)...`);

  // O pedido só some quando a coleta chega (a ponte apaga o arquivo ao gravar),
  // então a única prova de progresso é o lastCollectAt.
  const limite = pedidoEm + maxMin * 60_000;
  while (Date.now() < limite) {
    await sleep(5000);
    const st = await get("/status");
    if (st?.lastCollectAt && Date.parse(st.lastCollectAt) > pedidoEm) {
      resumo();
      return 0;
    }
  }

  console.error(
    `A coleta não chegou em ${maxMin} min. Confira se o Chrome está aberto com a extensão ` +
      `carregada; com 16 páginas ela costuma levar uns 4 min. Para esperar mais: --max 15.`,
  );
  return 1;
}

// exitCode, e não process.exit: no Windows, sair logo depois de um fetch derruba o libuv.
process.exitCode = await main();
