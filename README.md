# AI Homepage · versão Claude Code (sem chave de API)

Fork de **[ThariqS/ai-newtab](https://github.com/ThariqS/ai-newtab)** — e eu estou adorando essa
ideia. O mérito do conceito é do [Thariq](https://github.com/ThariqS): montar a página inicial do
navegador a partir do que a pessoa realmente acompanha, em vez de um feed decidido por outra
pessoa. Foi a primeira coisa que me fez olhar para a nova aba como um lugar de ler, e não de
clicar. Este repositório é só a minha versão disso, com duas mudanças de rumo e nenhuma pretensão
de substituir o original — se você chegou aqui primeiro, **vá ver o dele**.

O que eu mudei: aqui **não existe chave de API**. Quem faz a curadoria é o Claude Code, no chat.
A extensão só coleta, e o Diário renderiza o que o Claude escreveu.

```
 navegador (extensão)              disco (curadoria/)                 chat do Claude Code
 ───────────────────              ───────────────────                ───────────────────
 histórico + páginas logadas ──▶  coleta/historico.json     ──────▶  lê o material
                                  coleta/paginas/*.html              escreve a home
 Diário renderiza          ◀────  homepage.tsx              ◀──────  "deixa mais enxuta"
```

## Dois modos de leitura

A home abre em **Jornal** e troca para **Portal** num clique, no topo da página. A escolha fica
guardada no navegador, junto com o tamanho do texto e o que você já leu.

| | Jornal | Portal |
|---|---|---|
| Tipografia | serifada, manchete e linha fina | sem serifa, título curto |
| Grade | colunas com fio no meio, como página de jornal | cards numa grade |
| Para quê | sentar e ler | varrer e escolher |

Os dois saem do mesmo kit versionado (`apps/extension/entrypoints/home/kit/diario-kit.tsx`), não
de código reescrito a cada dia: a home que o Claude escreve carrega **só conteúdo**, e o jeito de
ler é do repositório. Na prática, pedir "atualiza a home" ficou barato e o visual parou de
oscilar de uma edição para a outra.

## A página diz o que está acontecendo

O que a home sabe e você não, ela fala — em vez de parecer vazia ou completa quando não está:

- **edição velha**: passou de 18 horas, a página avisa e diz o que pedir no chat;
- **página que falhou na coleta**: aparece pelo nome, porque o que estaria nela não está ali;
- **assunto sem item**: a aba continua, dizendo que nada chegou daquele assunto;
- **ponte desligada**: a aba explica que está mostrando a última edição salva e entrega o comando
  pronto para copiar, em vez de só desabilitar o botão.

## O que mudou em relação ao original

| Original | Aqui |
|---|---|
| Agente Managed Agents decide as páginas, lê e escreve | Extensão coleta; **você pede no chat** e o Claude escreve |
| Chave `sk-ant-…` guardada no navegador | Nenhuma chave |
| Rebuild automático gasta API | Coleta automática é de graça (só reabre as páginas) |
| Instruções e modelo nas Configurações | "deixa estilo jornal" no chat; fica salvo em `curadoria/preferencias.md` |
| A home só muda quando você reconstrói | **Muda ao vivo**: o Claude edita o arquivo e a aba atualiza em segundos |
| O layout vem junto com o conteúdo, reescrito a cada vez | **Kit versionado** com dois modos de leitura; a home carrega só conteúdo |
| Ponte offline = botão desabilitado | A aba diz o que parou e dá o comando para copiar |
| A ponte só existe enquanto um terminal fica aberto | **Sobe junto com o seu login**, em segundo plano: abrir o Chrome basta |

## Instalar

Precisa de Chrome (ou Chromium), Node 20+ e o Claude Code aberto nesta pasta.

```bash
git clone https://github.com/mayccoisa/ai-newtab.git
cd ai-newtab
npx pnpm@10.11.1 install
npx pnpm@10.11.1 build
```

1. `chrome://extensions` › **Modo do desenvolvedor** › **Carregar sem compactação** › `apps/extension/.output/chrome-mv3`.
2. Registre a ponte no seu login, uma vez (Windows). Abra a pasta Inicializar com
   **Win+R › `shell:startup`** e crie ali um atalho para:

   ```
   wscript.exe "C:\proj\ai-newtab\scripts\ponte-login.vbs"
   ```

   Daí em diante a ponte sobe junto com a sua sessão do Windows, em segundo plano e sem janela: você
   abre o Chrome e o Diário funciona, sem terminal nenhum. O `.vbs` só chama `scripts\ponte.cmd`
   escondendo o console, e descobre a raiz pelo próprio caminho. Para conferir, dê duplo clique no
   atalho e abra <http://127.0.0.1:4317/health>. Para desfazer, apague o atalho.

   > Em máquina onde você possa agendar tarefa, `schtasks /create /tn "AI Homepage - Ponte local"
   > /sc onlogon /tr "C:\proj\ai-newtab\scripts\ponte.cmd"` faz o mesmo. Em máquina com política
   > corporativa isso costuma voltar **Acesso negado**, e é para esse caso que existe o atalho.

Se preferir não registrar nada, a ponte continua subindo sob demanda: **`npx pnpm@10.11.1 ponte`**
sobe e devolve o terminal, `pnpm bridge` deixa ela em primeiro plano (bom para ver o erro) e
`pnpm coleta` sobe sozinho antes de pedir a coleta. Em todos os casos é a porta 4317, só em
`127.0.0.1`. Fora do Windows, chame `node scripts/ponte.mjs` no que já inicia a sua sessão.

## Usar

1. Clique no ícone da extensão (ela também abre sozinha quando o Chrome inicia) e em **Coletar** (abre as páginas numa janela em segundo plano).
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
apps/extension        a extensão MV3 (WXT + React): coletor e a página do Diário
apps/bridge           ponte local (Node puro, sem dependências)
scripts               ponte.mjs (garante a ponte no ar), coletar.mjs, capas.mjs
harness               testes do Bun, prévia estática e teste da extensão no Chrome headless

apps/extension/entrypoints/home/kit/diario-kit.tsx    o layout do Diário (os dois modos)
curadoria/homepage.tsx                                 só o conteúdo da edição (não versionado)
```

```bash
pnpm dev            # WXT com hot reload
pnpm ponte          # sobe a ponte em segundo plano e devolve o terminal
pnpm typecheck
pnpm test           # bun test harness/ + node --test da ponte
pnpm home:verify    # curadoria/homepage.tsx renderiza?
pnpm previa         # desenha a edição em .previa/jornal.html e .previa/portal.html
```

Mexeu no kit? `pnpm previa` mostra o resultado nos dois modos sem precisar carregar a extensão.

## Licença e crédito

MIT, como o projeto original. O código que veio de [ThariqS/ai-newtab](https://github.com/ThariqS/ai-newtab)
continua sob a licença dele, e o histórico deste fork preserva os commits originais — dá para ver
de onde cada coisa veio com `git log`. Obrigado pela ideia. 🙏
