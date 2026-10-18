/**
 * A ponte é JavaScript puro (`server.mjs`), de propósito: roda com `node`, sem
 * build. Quem a importa de TypeScript (o harness) tipa por aqui.
 */
import type { Server } from "node:http";

export declare const DEFAULT_PORT: number;

export interface Bridge {
  server: Server;
  port: number;
  /** Caminhos dentro de `curadoria/` que a ponte lê e escreve. */
  files: { homepage: string; sources: string; request: string; coleta: string };
  listen(): Promise<void>;
}

export declare function createBridge(options: { dir: string; port?: number }): Bridge;
