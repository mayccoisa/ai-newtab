import { Comando } from "./Comando";

/**
 * A ponte local desligada é o único jeito de esta aba parar de funcionar — e,
 * antes, o leitor só via um ponto cinza e um botão desabilitado. Aqui ela diz
 * em palavras o que deixou de funcionar, o que continua funcionando e o que
 * fazer, com o comando pronto para copiar.
 *
 * O comando é o `pnpm ponte`, e não o `pnpm bridge`: ele sobe a ponte em segundo
 * plano e devolve o terminal, em vez de ocupar um. Com a tarefa de login do
 * README registrada, isso já acontece sozinho — ver este aviso sempre que o
 * Windows inicia é o sinal de que ela não está registrada.
 */
export function AvisoPonte({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="nt-aviso" role="status">
      <div>
        <b>A ponte local está desligada.</b> Esta aba está mostrando a última edição salva: ela não
        recebe as edições que você pedir no chat e não consegue coletar. Para religar agora, na pasta
        do projeto: <Comando>pnpm ponte</Comando> Se ela aparece desligada a cada vez que você liga o
        computador, falta registrar a tarefa de login (veja <b>Instalar</b> no README).
      </div>
      <button className="nt-aviso-x" onClick={onFechar} title="Dispensar" aria-label="Dispensar aviso">
        ✕
      </button>
    </div>
  );
}
