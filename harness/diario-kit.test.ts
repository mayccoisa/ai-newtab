/**
 * O botão "Atualizar" do Diário atravessa um sandbox: o kit faz
 * `postMessage({ tipo: 'diario:coletar' })` e a aba da extensão escuta por esse
 * mesmo texto. Os dois lados vivem em arquivos diferentes e nenhum compilador
 * liga um ao outro — um typo de um lado deixa o botão mudo, sem erro nenhum.
 * Este teste é a corda entre eles.
 */
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KIT_PATH } from "./node-bridge";

const APP_PATH = join(import.meta.dir, "..", "apps/extension/entrypoints/home/App.tsx");

const kit = readFileSync(KIT_PATH, "utf-8");
const app = readFileSync(APP_PATH, "utf-8");

test("o kit declara o pedido de coleta e o envia ao hospedeiro", () => {
  const declarado = kit.match(/export const PEDIDO_COLETA = '([^']+)'/);
  expect(declarado).not.toBeNull();
  expect(kit).toContain("window.parent.postMessage({ tipo: PEDIDO_COLETA }");
});

test("a aba da extensão escuta exatamente esse mesmo pedido", () => {
  const declarado = kit.match(/export const PEDIDO_COLETA = '([^']+)'/)![1];
  expect(app).toContain(`dados.tipo !== "${declarado}"`);
  expect(app).toContain('window.addEventListener("message"');
});

test("a extensão responde no mesmo nome que o kit espera", () => {
  const resposta = kit.match(/export const RESPOSTA_COLETA = '([^']+)'/);
  expect(resposta).not.toBeNull();
  expect(app).toContain(`tipo: "${resposta![1]}"`);
  // E o botão só canta vitória com a resposta na mão.
  expect(kit).toContain("d.tipo !== RESPOSTA_COLETA");
});

test("o kit não importa nada além de react", () => {
  const imports = [...kit.matchAll(/^import .*? from ['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  expect(imports).toEqual(["react"]);
});
