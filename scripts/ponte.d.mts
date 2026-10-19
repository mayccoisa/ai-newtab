/**
 * Os scripts são JavaScript puro (`.mjs`), de propósito: rodam com `node`, sem
 * build. Quem os importa de TypeScript (o harness) tipa por aqui.
 */

/** Raiz do repositório, de onde a ponte descobre a pasta `curadoria/`. */
export declare const RAIZ: string;

/** `true` se a ponte respondeu em `base`. Desligada é estado normal, não erro. */
export declare function pingPonte(base?: string): Promise<boolean>;

/** Sobe a ponte se ela não estiver respondendo, e espera ela atender. */
export declare function garantirPonte(options?: {
  base?: string;
  raiz?: string;
  log?: (mensagem: string) => void;
}): Promise<boolean>;
