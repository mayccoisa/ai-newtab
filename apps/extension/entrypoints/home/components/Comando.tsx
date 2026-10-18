import { useCallback, useState } from "react";

/**
 * Um comando que o leitor precisa rodar no terminal, com botão de copiar.
 *
 * Existe porque o atrito maior deste fork é a ponte local: as instruções diziam
 * "rode pnpm bridge" e a pessoa tinha que digitar. Copiar é um clique, e o
 * "copiado" confirma que foi — sem confirmação, não se sabe se o clique pegou.
 */
export function Comando({ children }: { children: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = useCallback(() => {
    void navigator.clipboard
      .writeText(children)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      })
      .catch(() => {
        // Sem permissão de clipboard o comando continua legível e selecionável.
        setCopiado(false);
      });
  }, [children]);

  return (
    <span className="cmd">
      <code>{children}</code>
      <button type="button" onClick={copiar} title="Copiar o comando" aria-label="Copiar o comando">
        {copiado ? "copiado ✓" : "copiar"}
      </button>
    </span>
  );
}
