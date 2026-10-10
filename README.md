# AI Homepage · versão Claude Code (sem chave de API)

Fork de [ThariqS/ai-newtab](https://github.com/ThariqS/ai-newtab). Uma nova aba montada a partir
do que você realmente acompanha, **mas quem faz a curadoria é o Claude Code, no chat**. Não existe
chave de API, token de LLM nem custo por build: a extensão só coleta, o chat escreve a home.

```
 navegador (extensão)              disco (curadoria/)                 chat do Claude Code
 ───────────────────              ───────────────────                ───────────────────
 histórico + páginas logadas ──▶  coleta/historico.json     ──────▶  lê o material
                                  coleta/paginas/*.html              escreve a home
 nova aba renderiza        ◀────  homepage.tsx              ◀──────  "deixa mais enxuta"
```

## O que mudou em relação ao original

| Original | Aqui |
|---|---|
| Agente Managed Agents decide as páginas, lê e escreve | Extensão coleta; **você pede no chat** e o Claude escreve |
| Chave `sk-ant-…` guardada no navegador | Nenhuma chave |
| Rebuild automático gasta API | Coleta automática é de graça (só reabre as páginas) |
| Instruções e modelo nas Configurações | "deixa estilo jornal" no chat; fica salvo em `curadoria/preferencias.md` |
| A home só muda quando você reconstrói | **Muda ao vivo**: o Claude edita o arquivo e a aba atualiza em segundos |

## Instalar

Precisa de Chrome (ou Chromium), Node 20+ e o Claude Code aberto nesta pasta.

```bash
git clone https://github.com/mayccoisa/ai-newtab.git
cd ai-newtab
npx pnpm@10.11.1 install
npx pnpm@10.11.1 build
```

1. `chrome://extensions` › **Modo do desenvolvedor** › **Carregar sem compactação** › `apps/extension/.output/chrome-mv3`.
2. Deixe a ponte rodando num terminal: `npx pnpm@10.11.1 bridge` (porta 4317, só em `127.0.0.1`).

## Usar

1. Abra uma nova aba e clique em **Coletar dados** (abre as páginas numa janela em segundo plano).
2. No chat do Claude Code, nesta pasta: **"monta minha home"**.
3. Daí em diante é conversa: *"põe o clima e minha agenda no topo"*, *"só uma coluna, sem imagens"*,
   *"atualiza com o que saiu hoje"* (o Claude pede uma coleta nova sozinho), *"sempre sem política"*
   (vira preferência permanente).

O Claude também pode fixar quais páginas ler (`curadoria/fontes.json`) quando a raiz de um site
não é onde está o conteúdo. Veja [CLAUDE.md](./CLAUDE.md) para o roteiro completo que ele segue e
[curadoria/README.md](./curadoria/README.md) para o que cada arquivo faz.

## Privacidade

- Nada sai da sua máquina por este projeto. A ponte escuta só `127.0.0.1` e recusa qualquer
  requisição que venha de uma página web (checa `Origin` e `Host`); só a extensão fala com ela.
- O que o Claude Code **lê** do disco passa pelo contexto desta sessão de chat, como qualquer
  arquivo que você peça para ele abrir. As mesmas regras do original valem para a coleta: sites
  bloqueados (webmail, login, documentos) e endereços de rede local nunca são abertos, e uma
  página que redireciona para um site bloqueado é descartada antes de ser enviada.
- `curadoria/` está no `.gitignore`: histórico e páginas logadas não vão para o GitHub.

## Desenvolvimento

```
packages/agent-core   filtro de sites e resumo do histórico (puro, sem chrome.* nem node:*)
apps/extension        a extensão MV3 (WXT + React): coletor, nova aba
apps/bridge           ponte local (Node puro, sem dependências)
harness               testes do Bun e teste da extensão no Chrome headless
```

```bash
pnpm dev            # WXT com hot reload
pnpm typecheck
pnpm test           # bun test harness/ + node --test da ponte
pnpm home:verify    # curadoria/homepage.tsx renderiza?
```

## Licença

MIT, como o projeto original.
