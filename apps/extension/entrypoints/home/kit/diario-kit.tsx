/**
 * Kit do Diário — o layout da home, versionado aqui e não reescrito a cada rodada.
 *
 * Por que existe: antes, `curadoria/homepage.tsx` carregava conteúdo E layout
 * (583 linhas, 155 só de CSS). O Claude reescrevia tudo a cada pedido, então o
 * visual mudava de qualidade de um dia para o outro e a rodada custava caro.
 * Agora a home escreve só o CONTEÚDO e chama <Diario/>; o jeito de ler mora aqui.
 *
 * Dois modos, trocados pelo leitor e lembrados no navegador:
 *   jornal — serifada, manchete, colunas com medida de leitura, fios no lugar de borda
 *   portal — cards, grade, foto grande: varredura rápida
 *
 * Este arquivo é lido como texto (`?raw`) e injetado no sandbox que renderiza a
 * home, por isso: só `react` pode ser importado, e nada aqui pode depender de
 * API de extensão. Precisa renderizar no servidor também (`pnpm home:verify`),
 * então todo acesso a `window`/`localStorage` é adiado ou protegido.
 */
import React from 'react';

// ---------------------------------------------------------------- contrato ---

/** Um item da coleta: uma matéria, um post, um lançamento. */
export type Item = {
  /** Id do assunto, igual ao `id` de um Assunto. */
  a: string;
  /** Título, já em português. */
  t: string;
  /** URL absoluta, tirada da página coletada. */
  u: string;
  /** Fonte, como aparece para o leitor ("g1", "The Verge"). */
  s: string;
  /** Linha fina: uma ou duas frases que o título não diz. */
  dek?: string;
  /** Etiqueta curta do recorte ("Eleições 2026", "Regulação"). */
  tag?: string;
  /** Foto, quando a página associa uma ao item. */
  img?: string;
};

export type Assunto = {
  id: string;
  nome: string;
  /** Nome de um ícone do kit (ver ICONES). Sem isso, vai sem ícone. */
  ic?: string;
};

/** Faixa de apoio: agenda, promoções, qualquer lista curta de um assunto. */
export type Faixa = {
  /** Id do assunto em que ela aparece. Sem isso, aparece em "Todas". */
  assunto?: string;
  titulo: string;
  ic?: string;
  /** `destaque` vira a coluna da direita ("-50%", "18/10"). */
  itens: { t: string; u: string; s?: string; destaque?: string; img?: string }[];
  /** Lista corrida (padrão) ou cartões lado a lado. */
  forma?: 'lista' | 'tiras';
};

export type DiarioProps = {
  /** Nome de quem lê, para a saudação. */
  leitor?: string;
  /** Quando a coleta aconteceu, em ISO. É o que datilografa a edição e mede se envelheceu. */
  coletaEm?: string;
  /** Mesma coisa em texto, para quando o ISO não existir ("15/10 às 23:55"). */
  coleta?: string;
  assuntos: Assunto[];
  itens: Item[];
  /** Mapa link → foto de capa, gerado por `pnpm capas --aplicar`. */
  capas?: Record<string, string>;
  faixas?: Faixa[];
  /** Páginas que não vieram na coleta. Aparecem na tela: a home não finge que vieram. */
  falhas?: string[];
  /** Uma linha de rodapé, quando houver algo a dizer. */
  nota?: string;
  /** Modo inicial, para quem ainda não escolheu um. Padrão: jornal. */
  modo?: 'jornal' | 'portal';
};

// ------------------------------------------------------------------ ícones ---

const ICONES: Record<string, React.ReactNode> = {
  grade: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  controle: <><path d="M6 8h12a4 4 0 014 4v1.5a3.5 3.5 0 01-6.3 2.1L14.5 14h-5l-1.2 1.6A3.5 3.5 0 012 13.5V12a4 4 0 014-4z" /><path d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.5" r="1" fill="currentColor" /><circle cx="18" cy="13.5" r="1" fill="currentColor" /></>,
  urna: <><path d="M4 11h16v9H4z" /><path d="M8 11V5h8v6" /><path d="M10 8l1.5 1.5L15 6" /></>,
  alvo: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  ia: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  chip: <><path d="M4 7h10v10H4z" /><path d="M14 10h3l3-3M14 14h3l3 3" /><path d="M7 10h4v4H7z" /></>,
  check: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>,
  claquete: <><path d="M3 10h18v10H3z" /><path d="M3 10l2-5 16 0-2 5" /><path d="M8 5l-2 5M13 5l-2 5M18 5l-2 5" /></>,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  etiqueta: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8" r="1.5" fill="currentColor" /></>,
  seta: <path d="M7 17L17 7M9 7h8v8" />,
  jornal: <><path d="M4 5h11v14H4z" /><path d="M15 9h5v8a2 2 0 01-2 2H4" /><path d="M7 8h5M7 11h5M7 14h3" /></>,
  texto: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
  olho: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></>,
};

const Icon = ({ n, size = 16 }: { n?: string; size?: number }) =>
  !n || !ICONES[n] ? null : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none' }}
      aria-hidden
    >
      {ICONES[n]}
    </svg>
  );

// ------------------------------------------------------- estado do leitor ----

type Modo = 'jornal' | 'portal';
type Corpo = 'compacto' | 'normal' | 'grande';

const CHAVES = { aba: 'diario:aba', modo: 'diario:modo', corpo: 'diario:corpo', lidos: 'diario:lidos' };

/** localStorage falha em aba privada e não existe no SSR: ler nunca pode derrubar a home. */
function ler(chave: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(chave: string, valor: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(chave, valor);
  } catch {
    /* sem persistência é degradação aceitável: a sessão continua */
  }
}

function lerLidos(): string[] {
  const cru = ler(CHAVES.lidos);
  if (!cru) return [];
  try {
    const v = JSON.parse(cru);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Preferência que volta ao padrão quando o valor guardado não é mais válido. */
function usePreferencia<T extends string>(chave: string, validos: readonly T[], padrao: T) {
  const [valor, setValor] = React.useState<T>(() => {
    const v = ler(chave) as T | null;
    return v && validos.includes(v) ? v : padrao;
  });
  const trocar = React.useCallback(
    (proximo: T) => {
      setValor(proximo);
      gravar(chave, proximo);
    },
    [chave],
  );
  return [valor, trocar] as const;
}

// --------------------------------------------------------------- utilidades ---

const ext = { target: '_blank', rel: 'noreferrer' } as const;

const esconder = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  img.style.display = 'none';
  const moldura = img.parentElement;
  if (moldura && moldura.classList.contains('im')) moldura.style.display = 'none';
};

/** Quantas horas a edição tem. `null` quando não se sabe: aí não se afirma nada. */
function idadeHoras(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

function datilografar(iso?: string, texto?: string): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${data.charAt(0).toUpperCase()}${data.slice(1)} · fechada às ${hora}`;
    }
  }
  return texto ? `Edição de ${texto}` : 'Edição sem data';
}

function saudacao(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// -------------------------------------------------------------------- estilo ---

/**
 * Um CSS só, com os dois modos. As variáveis de corpo (`--c*`) mudam com o
 * controle de tamanho, então a medida de leitura acompanha a fonte.
 */
const CSS = `
.dp{
  --bg:#f7f6f3;--pap:#fffefb;--ink:#15161a;--soft:#3d4049;--mute:#71747e;--line:#dedbd3;--fio:#15161a;
  --hov:#efede7;--acc:#8a1c13;--ok:#15803d;--vis:#9aa0ab;
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
  --sans:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --c-corpo:16px;--c-linha:1.62;--c-manchete:40px;--c-chamada:19px;--c-largura:34em;
  color-scheme:light;min-height:100vh;background:var(--bg);color:var(--ink);
  font-family:var(--sans);font-size:var(--c-corpo);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.dp.cp-compacto{--c-corpo:14.5px;--c-linha:1.55;--c-manchete:33px;--c-chamada:17px;--c-largura:32em}
.dp.cp-grande{--c-corpo:18px;--c-linha:1.7;--c-manchete:47px;--c-chamada:21px;--c-largura:36em}
@media (prefers-color-scheme:dark){
  .dp{--bg:#101114;--pap:#16171b;--ink:#f2f1ee;--soft:#c9c8c4;--mute:#8d8f98;--line:#2a2b31;--fio:#6f717a;
    --hov:#1d1e23;--acc:#e8897c;--ok:#4ade80;--vis:#6a6c75;color-scheme:dark}
}
.dp *{box-sizing:border-box}
.dp a{color:inherit;text-decoration:none}
.dp h1,.dp h2,.dp h3{margin:0}
.dp button{font:inherit}
.w{max-width:1200px;margin:0 auto;padding:0 28px}
@media (max-width:620px){.w{padding:0 16px}}

/* ---- cabeçalho / masthead ---- */
.mast{padding:26px 0 0}
.mast .linha{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap}
.mast h1{font-family:var(--serif);font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.05}
.mast .data{font-size:12.5px;color:var(--mute);letter-spacing:.02em}
.dp.m-jornal .mast{text-align:center;padding-top:34px}
.dp.m-jornal .mast .linha{justify-content:center;flex-direction:column;align-items:center;gap:8px}
.dp.m-jornal .mast h1{font-size:52px;letter-spacing:.01em;font-weight:700}
.dp.m-jornal .mast .data{text-transform:uppercase;letter-spacing:.16em;font-size:11px}
.dp.m-jornal .mast::after{content:"";display:block;height:0;border-top:3px double var(--fio);margin-top:16px}
@media (max-width:620px){.dp.m-jornal .mast h1{font-size:34px}}

/* ---- barra de assuntos ---- */
.abas{position:sticky;top:0;z-index:6;background:var(--bg);border-bottom:1px solid var(--line)}
.abas .w{display:flex;gap:4px;overflow-x:auto;padding:9px 28px;scrollbar-width:none}
.abas .w::-webkit-scrollbar{display:none}
.aba{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 12px;
  border-radius:8px;font-size:13px;font-weight:500;color:var(--soft);white-space:nowrap;transition:background .15s,color .15s}
.aba:hover{background:var(--hov);color:var(--ink)}
.aba:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.aba[aria-selected=true]{background:var(--ink);color:var(--bg);font-weight:600}
.aba .ct{font-size:11px;font-variant-numeric:tabular-nums;opacity:.6}
.dp.m-jornal .abas .w{justify-content:center}
.dp.m-jornal .aba{border-radius:0;font-family:var(--serif);font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.dp.m-jornal .aba[aria-selected=true]{background:none;color:var(--ink);box-shadow:inset 0 -2px 0 var(--acc)}

/* ---- controles de leitura ---- */
.ctr{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.grp{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:9px;background:var(--pap);overflow:hidden}
.gb{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;
  font-size:12.5px;font-weight:500;color:var(--soft);transition:background .15s,color .15s}
.gb+.gb{border-left:1px solid var(--line)}
.gb:hover{background:var(--hov);color:var(--ink)}
.gb:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.gb[aria-pressed=true]{background:var(--ink);color:var(--pap);font-weight:600}
.gb.so{width:30px;padding:0;justify-content:center}

/* ---- avisos (feedback na tela) ---- */
.avisos{display:flex;flex-direction:column;gap:8px;margin:16px 0 0}
.aviso{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:10px;
  border:1px solid var(--line);background:var(--pap);font-size:13px;line-height:1.5;color:var(--soft)}
.aviso b{color:var(--ink);font-weight:600}
.aviso.velha{border-color:color-mix(in srgb,var(--acc) 40%,var(--line));background:color-mix(in srgb,var(--acc) 7%,var(--pap))}
.aviso code{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12px;background:var(--hov);padding:1px 5px;border-radius:4px}
.aviso .x{all:unset;cursor:pointer;color:var(--mute);font-size:15px;line-height:1;padding:2px 4px}
.aviso .x:hover{color:var(--ink)}
.aviso .x:focus-visible{outline:2px solid var(--acc)}

.corpo{padding:22px 0 56px;display:flex;flex-direction:column;gap:34px}
.dp.m-jornal .corpo{gap:30px}

/* ---- cabeça de seção ---- */
.sh{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 13px}
.sh h2{font-size:12.5px;font-weight:600;color:var(--mute);display:flex;align-items:center;gap:7px;
  text-transform:uppercase;letter-spacing:.08em}
.dp.m-jornal .sh{display:block;margin-bottom:15px;border-bottom:1px solid var(--fio);padding-bottom:5px}
.dp.m-jornal .sh h2{font-family:var(--serif);font-size:14px;letter-spacing:.14em;color:var(--ink)}

/* ---- manchete ---- */
.manchete{display:grid;grid-template-columns:1.2fr 1fr;background:var(--pap);border:1px solid var(--line);
  border-radius:12px;overflow:hidden;transition:border-color .15s}
.manchete:hover{border-color:var(--mute)}
.manchete .im{position:relative;min-height:300px;background:var(--hov)}
.manchete .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.manchete .tx{padding:26px 30px;display:flex;flex-direction:column;gap:11px;justify-content:center}
.manchete h3{font-size:var(--c-manchete);line-height:1.1;letter-spacing:-.022em;font-weight:700}
.manchete.semfoto{grid-template-columns:1fr}
.dp.m-jornal .manchete{display:block;background:none;border:0;border-radius:0;padding:0 0 22px;border-bottom:1px solid var(--line)}
.dp.m-jornal .manchete .tx{padding:0;text-align:center;max-width:46em;margin:0 auto;gap:12px;align-items:center}
.dp.m-jornal .manchete h3{font-family:var(--serif);font-weight:700;letter-spacing:-.012em;line-height:1.08}
.dp.m-jornal .manchete .dek{font-family:var(--serif);font-size:var(--c-chamada);max-width:32em}
.dp.m-jornal .manchete .im{min-height:0;margin:18px auto 0;max-width:46em;position:static}
.dp.m-jornal .manchete .im img{position:static;width:100%;height:auto;aspect-ratio:2/1;object-fit:cover;border-radius:2px}

.rot{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--acc);
  text-transform:uppercase;letter-spacing:.07em}
.fonte{font-size:12px;color:var(--mute)}
.dek{color:var(--soft);line-height:var(--c-linha)}

/* ---- chamadas: grade (portal) × colunas (jornal) ---- */
.grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.cham{display:flex;flex-direction:column;background:var(--pap);border:1px solid var(--line);
  border-radius:12px;overflow:hidden;transition:border-color .15s}
.cham:hover{border-color:var(--mute)}
.cham .im{position:relative;aspect-ratio:16/9;overflow:hidden;background:var(--hov)}
.cham .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cham .tx{padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
.cham h3{font-size:var(--c-chamada);line-height:1.28;font-weight:600;letter-spacing:-.008em}
.cham .dek{font-size:.9em}
.cham .fonte{margin-top:auto;padding-top:5px}
.dp.m-jornal .grade{display:block;columns:3;column-gap:30px;column-rule:1px solid var(--line)}
@media (max-width:980px){.dp.m-jornal .grade{columns:2}}
@media (max-width:620px){.dp.m-jornal .grade{columns:1}}
.dp.m-jornal .cham{display:block;background:none;border:0;border-radius:0;padding:0 0 18px;margin:0 0 18px;
  border-bottom:1px solid var(--line);break-inside:avoid}
.dp.m-jornal .cham .tx{padding:0;gap:7px}
.dp.m-jornal .cham h3{font-family:var(--serif);font-weight:700;line-height:1.2}
.dp.m-jornal .cham .dek{font-family:var(--serif)}
.dp.m-jornal .cham .im{aspect-ratio:3/2;margin-bottom:10px;border-radius:2px}

/* ---- breves ---- */
.breves{background:var(--pap);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.linha{display:flex;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--line);transition:background .15s}
.linha:first-child{border-top:0}
.linha:hover{background:var(--hov)}
.linha img{width:64px;height:44px;border-radius:6px;object-fit:cover;flex:none;background:var(--hov)}
.linha .t{flex:1;min-width:0}
.linha b{display:block;font-weight:500;line-height:1.35}
.linha .ar{color:var(--mute);flex:none}
.linha .dest{font-weight:700;color:var(--ok);font-variant-numeric:tabular-nums;flex:none}
.pular{appearance:none;border:0;border-top:1px solid var(--line);background:none;color:inherit;width:100%;
  text-align:left;cursor:pointer}
.pular:first-child{border-top:0}
.pular:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.dp.m-jornal .breves{background:none;border:0;border-radius:0;columns:2;column-gap:30px}
@media (max-width:760px){.dp.m-jornal .breves{columns:1}}
.dp.m-jornal .linha{display:block;padding:0 0 11px;margin:0 0 11px;border-top:0;border-bottom:1px dotted var(--line);break-inside:avoid}
.dp.m-jornal .linha:hover{background:none}
.dp.m-jornal .linha:hover b{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
.dp.m-jornal .linha img,.dp.m-jornal .linha .ar{display:none}
.dp.m-jornal .linha b{font-family:var(--serif);font-weight:600;line-height:1.3;margin-bottom:2px}

/* ---- faixas e dois blocos ---- */
.tiras{display:grid;grid-auto-flow:column;grid-auto-columns:182px;gap:12px;overflow-x:auto;padding-bottom:5px}
.tira{display:flex;flex-direction:column;gap:4px;background:var(--pap);border:1px solid var(--line);
  border-radius:12px;padding:12px 14px;transition:border-color .15s}
.tira:hover{border-color:var(--mute)}
.tira .d{font-size:12px;font-weight:600;color:var(--acc)}
.tira b{font-weight:600;line-height:1.3}
.dp.m-jornal .tira{border-radius:0;background:none;border:0;border-left:2px solid var(--line);padding:2px 0 2px 12px}
.dois{display:grid;grid-template-columns:2fr 1fr;gap:28px;align-items:start}

/* ---- lido ---- */
.lido{opacity:.52}
.lido h3,.lido b{color:var(--vis)}
.lido:hover{opacity:1}

/* ---- vazio e rodapé ---- */
.vazio{background:var(--pap);border:1px dashed var(--line);border-radius:12px;padding:30px;color:var(--mute);
  text-align:center;line-height:1.65}
.vazio b{color:var(--ink)}
.pe{padding:0 0 44px;font-size:12px;color:var(--mute);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pe .sep{opacity:.45}
.dp.m-jornal .pe{justify-content:center;border-top:1px solid var(--line);padding-top:16px;text-align:center}
.zerar{all:unset;cursor:pointer;color:var(--mute);text-decoration:underline;text-underline-offset:2px}
.zerar:hover{color:var(--ink)}
.zerar:focus-visible{outline:2px solid var(--acc)}

@media (max-width:980px){.manchete,.dois{grid-template-columns:1fr}.manchete .im{min-height:220px}.grade{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.grade{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.dp *{transition:none!important;animation:none!important}}
@media print{
  .dp{--bg:#fff;--pap:#fff;background:#fff}
  .abas,.ctr,.avisos,.pular{display:none!important}
  .manchete,.cham,.breves{border:0;break-inside:avoid}
}
`;

// ------------------------------------------------------------------- peças ---

type PecaProps = { n: Item; foto?: string; lido: boolean; onAbrir: (u: string) => void; rotulo?: string };

const Manchete = ({ n, foto, lido, onAbrir, rotulo }: PecaProps) => (
  <a
    className={'manchete' + (foto ? '' : ' semfoto') + (lido ? ' lido' : '')}
    href={n.u}
    onClick={() => onAbrir(n.u)}
    {...ext}
  >
    {foto && (
      <div className="im">
        <img src={foto} alt="" loading="lazy" onError={esconder} />
      </div>
    )}
    <div className="tx">
      {(rotulo || n.tag) && <span className="rot">{[rotulo, n.tag].filter(Boolean).join(' · ')}</span>}
      <h3>{n.t}</h3>
      {n.dek && <p className="dek">{n.dek}</p>}
      <span className="fonte">{n.s}</span>
    </div>
  </a>
);

const Chamada = ({ n, foto, lido, onAbrir, rotulo }: PecaProps) => (
  <a className={'cham' + (lido ? ' lido' : '')} href={n.u} onClick={() => onAbrir(n.u)} {...ext}>
    {foto && (
      <div className="im">
        <img src={foto} alt="" loading="lazy" onError={esconder} />
      </div>
    )}
    <div className="tx">
      {(rotulo || n.tag) && <span className="rot">{[rotulo, n.tag].filter(Boolean).join(' · ')}</span>}
      <h3>{n.t}</h3>
      {n.dek && <p className="dek">{n.dek}</p>}
      <span className="fonte">{n.s}</span>
    </div>
  </a>
);

const Breve = ({ n, foto, lido, onAbrir, rotulo }: PecaProps) => (
  <a className={'linha' + (lido ? ' lido' : '')} href={n.u} onClick={() => onAbrir(n.u)} {...ext}>
    {foto && <img src={foto} alt="" loading="lazy" onError={esconder} />}
    <span className="t">
      <b>{n.t}</b>
      <span className="fonte">{[rotulo, n.s].filter(Boolean).join(' · ')}</span>
    </span>
    <span className="ar">
      <Icon n="seta" size={14} />
    </span>
  </a>
);

const Secao = ({ ic, t, children, acao }: { ic?: string; t: string; children: React.ReactNode; acao?: React.ReactNode }) => (
  <section>
    <div className="sh">
      <h2>
        <Icon n={ic} size={14} />
        {t}
      </h2>
      {acao}
    </div>
    {children}
  </section>
);

const FaixaBloco = ({ f }: { f: Faixa }) => (
  <Secao ic={f.ic} t={f.titulo}>
    {f.forma === 'tiras' ? (
      <div className="tiras">
        {f.itens.map((x) => (
          <a key={x.u + x.t} className="tira" href={x.u} {...ext}>
            {x.destaque && <span className="d">{x.destaque}</span>}
            <b>{x.t}</b>
            {x.s && <span className="fonte">{x.s}</span>}
          </a>
        ))}
      </div>
    ) : (
      <div className="breves">
        {f.itens.map((x) => (
          <a key={x.u + x.t} className="linha" href={x.u} {...ext}>
            {x.img && <img src={x.img} alt="" loading="lazy" onError={esconder} />}
            <span className="t">
              <b>{x.t}</b>
              {x.s && <span className="fonte">{x.s}</span>}
            </span>
            {x.destaque ? <span className="dest">{x.destaque}</span> : <span className="ar"><Icon n="seta" size={14} /></span>}
          </a>
        ))}
      </div>
    )}
  </Secao>
);

// ------------------------------------------------------------------ avisos ---

/**
 * O que a home sabe e o leitor não: a edição envelheceu, páginas falharam,
 * nada chegou. Dizer isso na tela é o que separa "home vazia" de "home quebrada".
 */
function Avisos({
  idade,
  falhas,
  vazia,
  dispensado,
  onDispensar,
}: {
  idade: number | null;
  falhas: string[];
  vazia: boolean;
  dispensado: boolean;
  onDispensar: () => void;
}) {
  const velha = idade !== null && idade >= 18 && !dispensado;
  if (!velha && !falhas.length && !vazia) return null;
  return (
    <div className="avisos w" role="status">
      {vazia && (
        <div className="aviso">
          <span>
            <b>Esta edição não tem nenhum item.</b> No chat do Claude Code, nesta pasta, peça{' '}
            <i>"monta minha home"</i>.
          </span>
        </div>
      )}
      {velha && (
        <div className="aviso velha">
          <span>
            <b>Esta edição tem {Math.floor(idade as number)} horas.</b> Para trazer o que saiu depois
            dela, peça no chat <i>"atualiza a home"</i> — o Claude dispara a coleta sozinho.
          </span>
          <button className="x" onClick={onDispensar} title="Dispensar" aria-label="Dispensar aviso">
            ✕
          </button>
        </div>
      )}
      {falhas.length > 0 && (
        <div className="aviso">
          <span>
            <b>{falhas.length === 1 ? 'Uma página não veio' : `${falhas.length} páginas não vieram`}</b>{' '}
            nesta coleta: {falhas.join(', ')}. O que estaria nelas não está aqui.
          </span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- o Diário ---

/**
 * A home inteira. Quem chama passa só conteúdo: itens, assuntos, faixas e o que
 * falhou. O modo de leitura, o tamanho do corpo, a aba e o que já foi lido são
 * do leitor, e ficam no navegador dele.
 */
export function Diario({ leitor, coletaEm, coleta, assuntos, itens, capas, faixas = [], falhas = [], nota, modo: modoInicial = 'jornal' }: DiarioProps) {
  const ids = React.useMemo(() => assuntos.map((a) => a.id), [assuntos]);
  const [aba, setAba] = React.useState<string>(() => {
    const v = ler(CHAVES.aba);
    return v && (v === 'todas' || ids.includes(v)) ? v : 'todas';
  });
  const [modo, setModo] = usePreferencia<Modo>(CHAVES.modo, ['jornal', 'portal'], modoInicial);
  const [corpo, setCorpo] = usePreferencia<Corpo>(CHAVES.corpo, ['compacto', 'normal', 'grande'], 'normal');
  const [lidos, setLidos] = React.useState<string[]>(() => lerLidos());
  const [marcarLidos, setMarcarLidos] = React.useState(true);
  const [avisoVelhaFora, setAvisoVelhaFora] = React.useState(false);

  const foiLido = React.useCallback(
    (u: string) => marcarLidos && lidos.includes(u),
    [marcarLidos, lidos],
  );
  const abrir = React.useCallback((u: string) => {
    setLidos((atuais) => {
      if (atuais.includes(u)) return atuais;
      // Uma fila curta: 400 links cobrem semanas de leitura sem inflar o storage.
      const proximos = [u, ...atuais].slice(0, 400);
      gravar(CHAVES.lidos, JSON.stringify(proximos));
      return proximos;
    });
  }, []);
  const zerarLidos = React.useCallback(() => {
    setLidos([]);
    gravar(CHAVES.lidos, '[]');
  }, []);

  const trocarAba = React.useCallback((id: string) => {
    setAba(id);
    gravar(CHAVES.aba, id);
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* sem window (SSR) não há o que rolar */
    }
  }, []);

  const nomes = React.useMemo(() => Object.fromEntries(assuntos.map((a) => [a.id, a.nome])), [assuntos]);
  const icones = React.useMemo(() => Object.fromEntries(assuntos.map((a) => [a.id, a.ic])), [assuntos]);
  const foto = React.useCallback((n: Item) => n.img || (capas ? capas[n.u] : undefined), [capas]);
  const doAssunto = React.useCallback((id: string) => itens.filter((n) => n.a === id), [itens]);

  const idade = idadeHoras(coletaEm);
  const lidosNaEdicao = React.useMemo(
    () => (marcarLidos ? itens.filter((n) => lidos.includes(n.u)).length : 0),
    [itens, lidos, marcarLidos],
  );

  // Setas esquerda e direita andam entre as abas, como num tablist de verdade.
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const todas = ['todas', ...ids];
    const i = todas.indexOf(aba);
    const proxima = todas[(i + (e.key === 'ArrowRight' ? 1 : todas.length - 1)) % todas.length];
    trocarAba(proxima);
    const el = typeof document === 'undefined' ? null : document.getElementById('aba-' + proxima);
    if (el) el.focus();
  };

  const peca = (n: Item, rotulo?: string): PecaProps => ({
    n,
    foto: foto(n),
    lido: foiLido(n.u),
    onAbrir: abrir,
    rotulo,
  });

  /** Uma aba de assunto: manchete, chamadas, breves e as faixas daquele assunto. */
  const Assunto_ = ({ id }: { id: string }) => {
    const doIt = doAssunto(id);
    const minhas = faixas.filter((f) => f.assunto === id);
    if (!doIt.length) {
      return (
        <div className="vazio">
          <b>Nada de {nomes[id]} chegou nesta coleta.</b>
          <br />
          A aba continua aqui: é mais honesto que esconder o assunto. Peça <i>"atualiza a home"</i> no
          chat do Claude Code.
        </div>
      );
    }
    const [lead, ...resto] = doIt;
    const chamadas = resto.slice(0, 6);
    const breves = resto.slice(6);
    return (
      <>
        <Manchete {...peca(lead)} />
        {minhas.map((f) => (
          <FaixaBloco key={f.titulo} f={f} />
        ))}
        {chamadas.length > 0 && (
          <Secao ic={icones[id]} t="Também nesta edição">
            <div className="grade">
              {chamadas.map((n) => (
                <Chamada key={n.u} {...peca(n)} />
              ))}
            </div>
          </Secao>
        )}
        {breves.length > 0 && (
          <Secao ic="texto" t="Em poucas linhas">
            <div className="breves">
              {breves.map((n) => (
                <Breve key={n.u} {...peca(n)} />
              ))}
            </div>
          </Secao>
        )}
      </>
    );
  };

  /** Todas: a manchete do primeiro assunto, o principal de cada um e um resumo. */
  const Todas_ = () => {
    const primeiros = ids.map((id) => doAssunto(id)[0]).filter(Boolean) as Item[];
    if (!primeiros.length) return null;
    const [lead, ...outros] = primeiros;
    const breves = ids.flatMap((id) => doAssunto(id).slice(1, 3));
    const soltas = faixas.filter((f) => !f.assunto);
    return (
      <>
        <Manchete {...peca(lead, nomes[lead.a])} />
        {outros.length > 0 && (
          <Secao ic="grade" t="O principal de cada assunto">
            <div className="grade">
              {outros.map((n) => (
                <Chamada key={n.u} {...peca(n, nomes[n.a])} />
              ))}
            </div>
          </Secao>
        )}
        {soltas.map((f) => (
          <FaixaBloco key={f.titulo} f={f} />
        ))}
        <div className="dois">
          {breves.length > 0 && (
            <Secao ic="texto" t="Em poucas linhas">
              <div className="breves">
                {breves.map((n) => (
                  <Breve key={n.u} {...peca(n, nomes[n.a])} />
                ))}
              </div>
            </Secao>
          )}
          <Secao ic="grade" t="Ir para o assunto">
            <div className="breves">
              {ids.map((id) => (
                <button key={id} className="linha pular" onClick={() => trocarAba(id)}>
                  <Icon n={icones[id]} size={16} />
                  <span className="t">
                    <b>{nomes[id]}</b>
                    <span className="fonte">{doAssunto(id).length} itens</span>
                  </span>
                  <span className="ar">
                    <Icon n="seta" size={14} />
                  </span>
                </button>
              ))}
            </div>
          </Secao>
        </div>
      </>
    );
  };

  const corpos: { id: Corpo; rotulo: string; titulo: string }[] = [
    { id: 'compacto', rotulo: 'A', titulo: 'Corpo compacto: mais itens na tela' },
    { id: 'normal', rotulo: 'A', titulo: 'Corpo normal' },
    { id: 'grande', rotulo: 'A', titulo: 'Corpo grande: leitura confortável' },
  ];

  return (
    <div className={`dp m-${modo} cp-${corpo}`}>
      <style>{CSS}</style>

      <header className="mast w">
        <div className="linha">
          <h1>{modo === 'jornal' ? 'O Diário' : `${saudacao()}, ${leitor ?? 'leitor'}`}</h1>
          <span className="data">{datilografar(coletaEm, coleta)}</span>
        </div>
      </header>

      <nav className="abas" aria-label="Assuntos">
        <div className="w" role="tablist" onKeyDown={teclas}>
          <button
            id="aba-todas"
            className="aba"
            role="tab"
            aria-selected={aba === 'todas'}
            tabIndex={aba === 'todas' ? 0 : -1}
            onClick={() => trocarAba('todas')}
          >
            <Icon n="grade" size={15} />
            Todas
            <span className="ct">{itens.length}</span>
          </button>
          {assuntos.map((x) => (
            <button
              key={x.id}
              id={'aba-' + x.id}
              className="aba"
              role="tab"
              aria-selected={aba === x.id}
              tabIndex={aba === x.id ? 0 : -1}
              onClick={() => trocarAba(x.id)}
            >
              <Icon n={x.ic} size={15} />
              {x.nome}
              <span className="ct">{doAssunto(x.id).length}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="w" style={{ paddingTop: 16 }}>
        <div className="ctr">
          <div className="grp" role="group" aria-label="Modo de leitura">
            <button className="gb" aria-pressed={modo === 'jornal'} onClick={() => setModo('jornal')} title="Jornal: serifada, manchete e colunas">
              <Icon n="jornal" size={14} />
              Jornal
            </button>
            <button className="gb" aria-pressed={modo === 'portal'} onClick={() => setModo('portal')} title="Portal: cards e grade, varredura rápida">
              <Icon n="grade" size={14} />
              Portal
            </button>
          </div>
          <div className="grp" role="group" aria-label="Tamanho do texto">
            {corpos.map((c) => (
              <button
                key={c.id}
                className="gb so"
                aria-pressed={corpo === c.id}
                onClick={() => setCorpo(c.id)}
                title={c.titulo}
                style={{ fontSize: c.id === 'compacto' ? 11 : c.id === 'normal' ? 13 : 16 }}
              >
                {c.rotulo}
              </button>
            ))}
          </div>
          <div className="grp" role="group" aria-label="Marcar o que já foi lido">
            <button
              className="gb"
              aria-pressed={marcarLidos}
              onClick={() => setMarcarLidos((v) => !v)}
              title={marcarLidos ? 'Esmaecendo o que você já abriu' : 'Mostrando tudo com o mesmo peso'}
            >
              <Icon n="olho" size={14} />
              {marcarLidos ? `Lidos ${lidosNaEdicao}/${itens.length}` : 'Marcar lidos'}
            </button>
          </div>
        </div>
      </div>

      <Avisos
        idade={idade}
        falhas={falhas}
        vazia={itens.length === 0}
        dispensado={avisoVelhaFora}
        onDispensar={() => setAvisoVelhaFora(true)}
      />

      <main className="w corpo" role="tabpanel" aria-labelledby={'aba-' + aba}>
        {aba === 'todas' ? <Todas_ /> : <Assunto_ id={aba} />}
      </main>

      <footer className="w pe">
        <span>Curadoria do Claude Code</span>
        {nota && (
          <>
            <span className="sep">·</span>
            <span>{nota}</span>
          </>
        )}
        {lidos.length > 0 && (
          <>
            <span className="sep">·</span>
            <button className="zerar" onClick={zerarLidos}>
              esquecer o que eu já li ({lidos.length})
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

export default Diario;
