/**
 * Ponte · garante que a ponte local esteja no ar, sem ocupar um terminal.
 *
 * O Diário só recebe edição e só coleta com a ponte (127.0.0.1:4317) de pé.
 * `pnpm bridge` deixa ela em primeiro plano, bom para ver o erro; aqui é o
 * contrário: confere se já responde, sobe em segundo plano se não, e devolve o
 * terminal. É a mesma função que o `pnpm coleta` usa antes de pedir a coleta.
 *
 * Uso:
 *   pnpm ponte     # sobe a ponte se ela não estiver no ar e sai
 *
 * Sai com 0 quando a ponte está no ar, 1 quando ela não subiu.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = Number(process.env.NEWTAB_PORT || 4317);
const BASE = `http://127.0.0.1:${PORTA}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `true` se a ponte respondeu. Desligada é estado normal, não erro. */
export async function pingPonte(base = BASE) {
  try {
    const res = await fetch(base + "/health", { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sobe a ponte se ela não estiver respondendo, e espera ela atender. */
export async function garantirPonte({ base = BASE, raiz = RAIZ, log = () => {} } = {}) {
  if (await pingPonte(base)) return true;
  log("Ponte desligada; subindo em segundo plano...");
  const filho = spawn(process.execPath, [join(raiz, "apps/bridge/server.mjs")], {
    cwd: raiz,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  filho.unref();
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await pingPonte(base)) return true;
  }
  return false;
}

// Só quando rodado como script: o `pnpm coleta` e os testes importam as funções daqui.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const noAr = await garantirPonte({ log: (m) => console.log(m) });
  if (noAr) console.log(`Ponte no ar em ${BASE}. Pode fechar o terminal.`);
  else console.error(`A ponte não respondeu em ${BASE}. Rode "pnpm bridge" para ver o erro.`);
  // exitCode, e não process.exit: no Windows, sair logo depois de um fetch derruba o libuv.
  process.exitCode = noAr ? 0 : 1;
}
