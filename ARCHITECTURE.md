# Arquitetura

Sem LLM no caminho. Três partes, todas na sua máquina:

| | Roda onde | Faz o quê |
|---|---|---|
| **Extensão** (service worker) | Navegador | Coleta: lê `chrome.history`, abre páginas numa janela em segundo plano, higieniza o HTML e envia à ponte |
| **Extensão** (página do Diário: abre com o Chrome e pelo ícone) | Navegador | Visão fina: consulta a ponte e renderiza `homepage.tsx` num iframe Sandpack |
| **Ponte** (`apps/bridge`) | Node, `127.0.0.1:4317` | Grava a coleta em `curadoria/coleta/` e serve `curadoria/homepage.tsx` |
| **Claude Code** (o chat) | Sua sessão | Lê a coleta do disco e escreve `curadoria/homepage.tsx` |

```
 service worker            ponte                  disco                  Claude Code
      │  GET /status ───────▶│  (a cada 1 min)       │                        │
      │◀─ collectRequested ──┤◀── pedido-coleta ─────┤◀── cria o arquivo ─────┤
      ├─ chrome.history, abre páginas, sanitiza      │                        │
      ├─ POST /collect ─────▶│── coleta/*.json,html ▶│── lê ─────────────────▶│
      │                      │                       │◀── escreve homepage.tsx┤
 nova aba                    │                       │                        │
      ├─ GET /status (3 s) ─▶│  homepageUpdatedAt mudou?                      │
      └─ GET /homepage ─────▶│── lê homepage.tsx ───▶ renderiza no Sandpack
```

O estado vive em arquivos, não em memória: a ponte pode reiniciar sem perder nada, e o Claude
enxerga exatamente o que a extensão enviou.

## A ponte

Zero dependências (`node:http`). Endpoints:

| | |
|---|---|
| `GET /health` | está de pé? |
| `GET /status` | `homepageUpdatedAt`, `collectRequested`, `lastCollectAt` |
| `GET /homepage` | `{ code, updatedAt }` do `homepage.tsx` |
| `GET /sources` | URLs de `fontes.json` que a próxima coleta deve abrir |
| `POST /collect` | recebe `CollectPayload`, **substitui** a coleta anterior, apaga `pedido-coleta` |
| `POST /request-collect` | cria `pedido-coleta` |

**Segurança.** Escuta só em loopback. Qualquer requisição com `Origin` que não seja
`chrome-extension://` / `moz-extension://` leva 403 (um site aberto no navegador não consegue
escrever nem ler), e `Host` fora de loopback também (DNS rebinding). Requisições sem `Origin`
(curl, o próprio Claude) passam. Testes em `apps/bridge/server.test.mjs`.

**Quem a liga.** `scripts/ponte.mjs` é o guardião: pergunta `/health` e, se ninguém atender, sobe
uma ponte desacoplada do terminal. É ele que o `pnpm ponte` chama, que o `pnpm coleta` chama antes
de pedir a coleta, e que a tarefa de login do Windows chama (ver **Instalar** no README) — o que
tirou do caminho o `pnpm bridge` ocupando um terminal para o Diário funcionar. Subir uma segunda
ponte na mesma porta não derruba a primeira: a de depois diz que já tem uma e sai com 0.

## A coleta

`apps/extension/lib/collector.ts` (`CollectManager`), um por service worker:

1. **Histórico**: ranqueia domínios dos últimos 14 dias, tira os bloqueados e gera o resumo.
2. **Páginas**: usa `fontes.json` se existir; senão a raiz dos 8 sites mais visitados. Filtra
   pelo bloqueio e abre numa janela sem foco (`lib/scraper.ts`, inalterado).
3. **Redirecionamento**: página que terminou num host bloqueado é descartada antes de sair do navegador.
4. **Envio** à ponte.

O heartbeat de 1 minuto (`chrome.alarms`) chama `tick()`, que coleta quando o Claude pediu
(`collectRequested`) ou quando a coleta automática venceu (só depois da primeira coleta manual).
Ponte desligada é estado normal: o `tick` não faz nada. Durante a coleta, um ping a cada 20 s
impede o Chrome de descarregar o worker.

## Nova aba

`useBridgeHomepage` pinta a cópia em `chrome.storage.local` na hora e consulta `/status` a cada
3 s; só baixa o código quando `homepageUpdatedAt` muda. Por isso uma edição feita no chat aparece
na aba aberta em poucos segundos. Sem ponte, a última home continua na tela. O código é gerado
por modelo, então roda dentro de um iframe Sandpack, nunca na página da extensão.

## Estrutura

```
packages/agent-core/   puro: tipos, resumo do histórico, filtro de sites (sem chrome.*, browser.* ou node:*)
apps/bridge/           server.mjs + testes
scripts/               ponte.mjs (garante a ponte no ar), coletar.mjs, capas.mjs
apps/extension/        entrypoints/background.ts, home/, lib/{collector,bridge,history,scraper,storage,protocol,auto-collect,transpile}.ts
harness/               testes do Bun e verificação da extensão no Chrome headless
curadoria/             pasta de trabalho (ignorada pelo git); ver curadoria/README.md
```

## Verificação

| Comando | Prova |
|---|---|
| `pnpm test` | Resumo do histórico, filtro de sites, o guardião da ponte (não sobe uma segunda) e a ponte (coleta substitui a anterior, 403 para páginas web e Host falso) |
| `pnpm typecheck` | Tipos em todos os pacotes |
| `pnpm home:verify` | `curadoria/homepage.tsx` transpila, avalia e renderiza só com React |
| `pnpm extension:test` | No Chrome headless: worker registra, a página do Diário renderiza o estado vazio, a porta responde, `start` com a ponte desligada falha com mensagem clara |

## Privacidade

O filtro de sites bloqueados vale no coletor, não só na instrução: domínios bloqueados saem do
resumo do histórico e da contagem, URLs bloqueadas ou não-HTTP(S) nunca chegam ao navegador, e
hosts de rede local (localhost, IP privado, `.local`, `.internal`) são sempre bloqueados.
Subrecursos carregados pela página não são interceptados.

O que o Claude Code lê de `curadoria/coleta/` entra no contexto da sessão de chat. Se isso for
um problema para um site, ponha-o em **Sites que nunca são lidos**.
