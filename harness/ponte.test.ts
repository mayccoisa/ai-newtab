/**
 * O guardião da ponte: é ele que tira o `pnpm bridge` do caminho, então o que
 * importa provar é que ele não sobe uma segunda ponte quando já existe uma, e
 * que uma porta sem ninguém atendendo não passa por ponte no ar.
 */
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { garantirPonte, pingPonte } from "../scripts/ponte.mjs";
import { createBridge } from "../apps/bridge/server.mjs";

const PORTA = 4397;
const base = `http://127.0.0.1:${PORTA}`;

test("porta sem ninguém atendendo não passa por ponte no ar", async () => {
  expect(await pingPonte("http://127.0.0.1:4296")).toBe(false);
});

test("com a ponte no ar, garantir não sobe outra e não imprime nada", async () => {
  const bridge = createBridge({ dir: mkdtempSync(join(tmpdir(), "newtab-ponte-")), port: PORTA });
  await bridge.listen();
  try {
    const falas: string[] = [];
    expect(await garantirPonte({ base, log: (m) => falas.push(m) })).toBe(true);
    expect(falas).toEqual([]);
  } finally {
    bridge.server.close();
  }
});

test("segunda ponte na mesma porta é recusada em vez de derrubar a primeira", async () => {
  const bridge = createBridge({ dir: mkdtempSync(join(tmpdir(), "newtab-ponte-")), port: PORTA });
  await bridge.listen();
  const outra = createBridge({ dir: mkdtempSync(join(tmpdir(), "newtab-ponte-")), port: PORTA });
  try {
    await expect(outra.listen()).rejects.toMatchObject({ code: "EADDRINUSE" });
    expect(await pingPonte(base)).toBe(true);
  } finally {
    bridge.server.close();
  }
});
