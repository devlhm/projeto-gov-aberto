/**
 * Recriação simplificada do wordmark "COOP CLIMA" (versão compacta, sem
 * assinatura — indicada pelo manual para tamanhos pequenos).
 *
 * Fiel às regras do manual: letras blocadas com rotações individuais
 * (tipografia vernacular de letreiro), COOP alternando marrom/laranja,
 * CLIMA alternando verde/azul, "P" maior e caído, "i" baixinho.
 * A prop `mono` produz a versão monocromática negativa (branca), exigida
 * sobre fundos escuros ou sobre as cores institucionais.
 */

export function LogoCoopClima({ mono = false }: { mono?: boolean }) {
  return (
    <div className={`logo-coop${mono ? ' mono' : ''}`} aria-label="Coop Clima São Vicente" role="img">
      <div>
        <span className="l1 marrom">C</span>
        <span className="l2 laranja">O</span>
        <span className="l3 marrom">O</span>
        <span className="l4 laranja">P</span>
      </div>
      <div>
        <span className="l5 verde">C</span>
        <span className="l6 verde">L</span>
        <span className="l7 azul">i</span>
        <span className="l8 azul">M</span>
        <span className="l9 verde">A</span>
      </div>
    </div>
  )
}
