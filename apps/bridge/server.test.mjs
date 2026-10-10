import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBridge } from "./server.mjs";

const PORT = 4399;
const base = `http://127.0.0.1:${PORT}`;
const ext = { origin: "chrome-extension://abcdefghijklmnop" };
let dir, bridge;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "newtab-"));
  bridge = createBridge({ dir, port: PORT });
  await bridge.listen();
});
after(() => bridge.server.close());

const call = (path, { method = "GET", headers = {}, body } = {}) =>
  fetch(base + path, { method, headers: { "content-type": "application/json", ...headers }, body });

test("serves null before Claude has written a homepage, then the file", async () => {
  assert.deepEqual(await (await call("/homepage", { headers: ext })).json(), { code: null, updatedAt: null });
  writeFileSync(join(dir, "homepage.tsx"), "export default () => null");
  const res = await (await call("/homepage", { headers: ext })).json();
  assert.equal(res.code, "export default () => null");
  assert.ok(res.updatedAt);
});

test("a collection replaces the previous one and clears the request flag", async () => {
  await call("/request-collect", { method: "POST", headers: ext });
  assert.equal((await (await call("/status", { headers: ext })).json()).collectRequested, true);

  const payload = (title) => ({
    collectedAt: "2026-10-10T10:00:00.000Z",
    history: { windowDays: 14, totalSitesSeen: 1, sites: [] },
    pages: [{ url: "https://news.ycombinator.com/", finalUrl: "https://news.ycombinator.com/", title, html: `<p>${title}</p>` }],
    failed: [],
  });
  for (const title of ["velha", "nova"]) {
    const res = await call("/collect", { method: "POST", headers: ext, body: JSON.stringify(payload(title)) });
    assert.equal((await res.json()).pages, 1);
  }
  const index = JSON.parse(readFileSync(join(dir, "coleta", "indice.json"), "utf8"));
  assert.equal(index.pages.length, 1);
  assert.equal(readFileSync(join(dir, "coleta", index.pages[0].file), "utf8"), "<p>nova</p>");
  assert.equal(existsSync(join(dir, "pedido-coleta")), false);
});

test("refuses web pages (Origin) and DNS-rebinding hosts", async () => {
  assert.equal((await call("/homepage", { headers: { origin: "https://evil.example" } })).status, 403);
  assert.equal(
    (await call("/collect", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" })).status,
    403,
  );
  // fetch() cannot forge Host, so use a raw request.
  const { request } = await import("node:http");
  const status = await new Promise((resolve) => {
    request({ host: "127.0.0.1", port: PORT, path: "/homepage", headers: { host: "evil.example" } }, (r) => resolve(r.statusCode)).end();
  });
  assert.equal(status, 403);
});

test("rejects malformed collections", async () => {
  assert.equal((await call("/collect", { method: "POST", headers: ext, body: "{}" })).status, 400);
});
