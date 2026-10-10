/**
 * Local bridge between the browser extension and Claude Code (no LLM API involved).
 *
 *   extension  --POST /collect-->  curadoria/coleta/   (history digest + page HTML)
 *   Claude Code reads coleta/, writes curadoria/homepage.tsx
 *   extension  <--GET /homepage--  curadoria/homepage.tsx
 *
 * Uso: node apps/bridge/server.mjs   (env: NEWTAB_PORT, NEWTAB_DIR)
 *
 * Only the browser extension may talk to it: requests that carry a web Origin,
 * or a Host other than loopback (DNS rebinding), are refused. Nothing here is
 * ever reachable from the network: it binds 127.0.0.1.
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PORT = 4317;
const MAX_BODY_BYTES = 80 * 1024 * 1024;

export function createBridge({ dir, port = DEFAULT_PORT }) {
  const files = {
    homepage: join(dir, "homepage.tsx"),
    sources: join(dir, "fontes.json"),
    request: join(dir, "pedido-coleta"),
    coleta: join(dir, "coleta"),
  };
  mkdirSync(files.coleta, { recursive: true });

  const isLoopbackHost = (host = "") => /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host);
  // A normal web page always sends a http(s) Origin on cross-origin requests; the extension sends its own scheme.
  const isExtensionOrigin = (origin) => /^(chrome|moz)-extension:\/\//.test(origin);

  const mtimeIso = (path) => (existsSync(path) ? statSync(path).mtime.toISOString() : null);

  function readJson(path, fallback) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return fallback;
    }
  }

  function slug(url, i) {
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    return `${String(i + 1).padStart(2, "0")}-${host.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "pagina"}`;
  }

  function saveCollection(payload) {
    // Replace the previous collection wholesale: stale pages would read as fresh news.
    for (const name of readdirSync(files.coleta)) rmSync(join(files.coleta, name), { recursive: true, force: true });
    mkdirSync(join(files.coleta, "paginas"), { recursive: true });

    const index = payload.pages.map((page, i) => {
      const file = `paginas/${slug(page.finalUrl || page.url, i)}.html`;
      writeFileSync(join(files.coleta, file), page.html);
      return { file, url: page.url, finalUrl: page.finalUrl ?? page.url, title: page.title, bytes: Buffer.byteLength(page.html) };
    });
    writeFileSync(join(files.coleta, "historico.json"), JSON.stringify(payload.history, null, 2));
    writeFileSync(
      join(files.coleta, "indice.json"),
      JSON.stringify({ collectedAt: payload.collectedAt, pages: index, failed: payload.failed }, null, 2),
    );
    if (existsSync(files.request)) unlinkSync(files.request);
    return index.length;
  }

  function readBody(req) {
    return new Promise((resolveBody, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(Object.assign(new Error("payload too large"), { status: 413 }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    const send = (status, body) => {
      const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
      if (origin && isExtensionOrigin(origin)) {
        headers["access-control-allow-origin"] = origin;
        headers["vary"] = "Origin";
      }
      res.writeHead(status, headers);
      res.end(JSON.stringify(body));
    };

    if (!isLoopbackHost(req.headers.host) || (origin && !isExtensionOrigin(origin))) {
      return send(403, { error: "forbidden" });
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": origin ?? "",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "600",
      });
      return res.end();
    }

    const { pathname } = new URL(req.url ?? "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && pathname === "/health") return send(200, { ok: true });

      if (req.method === "GET" && pathname === "/homepage") {
        if (!existsSync(files.homepage)) return send(200, { code: null, updatedAt: null });
        return send(200, { code: readFileSync(files.homepage, "utf8"), updatedAt: mtimeIso(files.homepage) });
      }

      if (req.method === "GET" && pathname === "/sources") {
        const urls = readJson(files.sources, {}).urls;
        return send(200, { urls: Array.isArray(urls) ? urls.filter((u) => typeof u === "string") : [] });
      }

      if (req.method === "GET" && pathname === "/status") {
        return send(200, {
          homepageUpdatedAt: mtimeIso(files.homepage),
          collectRequested: existsSync(files.request),
          lastCollectAt: readJson(join(files.coleta, "indice.json"), {}).collectedAt ?? null,
        });
      }

      if (req.method === "POST" && pathname === "/request-collect") {
        writeFileSync(files.request, new Date().toISOString());
        return send(200, { ok: true });
      }

      if (req.method === "POST" && pathname === "/collect") {
        const payload = JSON.parse(await readBody(req));
        if (!payload || !Array.isArray(payload.pages) || !payload.history) return send(400, { error: "bad payload" });
        return send(200, { ok: true, pages: saveCollection(payload) });
      }

      return send(404, { error: "not found" });
    } catch (err) {
      return send(err?.status ?? 500, { error: String(err?.message ?? err) });
    }
  });

  return { server, files, port, listen: () => new Promise((ok) => server.listen(port, "127.0.0.1", ok)) };
}

// Run as a script (not when imported by the tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.env.NEWTAB_DIR ?? join(HERE, "..", "..", "curadoria"));
  const port = Number(process.env.NEWTAB_PORT ?? DEFAULT_PORT);
  const bridge = createBridge({ dir, port });
  await bridge.listen();
  console.log(`Ponte local em http://127.0.0.1:${port}`);
  console.log(`  pasta da curadoria: ${dir}`);
  console.log(`  homepage:           ${bridge.files.homepage}`);
}
