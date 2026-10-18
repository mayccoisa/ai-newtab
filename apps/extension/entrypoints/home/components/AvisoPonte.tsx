import { Comando } from "./Comando";

/**
 * A ponte local desligada é o único jeito de esta aba parar de funcionar — e,
 * antes, o leitor só via um ponto cinza e um botão desabilitado. Aqui ela diz
 * em palavras o que deixou de funcionar, o que continua funcionando e o que
 * fazer, com o comando pronto para copiar.
 */
export function AvisoPonte({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="nt-aviso" role="status">
      <div>
        <b>A ponte local está desligada.</b> Esta aba está mostrando a última edição salva: ela não
        recebe as edições que você pedir no chat e não consegue coletar. Para religar, na pasta do
        projeto: <Comando>pnpm bridge</Comando>
      </div>
      <button className="nt-aviso-x" onClick={onFechar} title="Dispensar" aria-label="Dispensar aviso">
        ✕
      </button>
    </div>
  );
}
