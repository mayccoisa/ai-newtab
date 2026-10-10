# curadoria/

Pasta de trabalho entre a extensão e o Claude Code. **Nada daqui é versionado** (o `.gitignore`
ignora tudo menos este arquivo), porque tem seu histórico e páginas que você lê logado.

| Arquivo | Quem escreve | Para quê |
|---|---|---|
| `homepage.tsx` | Claude Code | A home. A nova aba renderiza e recarrega sozinha |
| `preferencias.md` | Claude Code | O que vale sempre (estilo, seções fixas, o que evitar) |
| `fontes.json` | Claude Code | `{ "urls": [...] }` páginas que a próxima coleta abre |
| `pedido-coleta` | Claude Code | Existir = "extensão, colete de novo". Some quando a coleta chega |
| `coleta/historico.json` | extensão | Ranking dos sites mais visitados |
| `coleta/indice.json` | extensão | Páginas lidas, falhas e a hora da coleta |
| `coleta/paginas/*.html` | extensão | HTML limpo de cada página |
