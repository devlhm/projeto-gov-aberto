/**
 * Gráfico de barras do perfil étnico-racial — CSS puro, sem bibliotecas.
 * Nota metodológica: "Negros" agrega pretos + pardos (categorias do IBGE),
 * seguindo o enquadramento de justiça racial do projeto.
 */

import type { PerfilRacial } from '../types'

interface GraficoRacialProps {
  raca: PerfilRacial
  populacaoTotal: number
}

/** Ordem de exibição e cor de cada grupo (cores institucionais da marca) */
const GRUPOS: { chave: keyof PerfilRacial; rotulo: string; cor: string }[] = [
  { chave: 'negros', rotulo: 'Negros', cor: 'var(--cor-marrom)' },
  { chave: 'brancos', rotulo: 'Brancos', cor: 'var(--cor-azul)' },
  { chave: 'indigenas', rotulo: 'Indígenas', cor: 'var(--cor-verde)' },
  { chave: 'amarelos', rotulo: 'Amarelos', cor: 'var(--cor-laranja)' },
]

export function GraficoRacial({ raca, populacaoTotal }: GraficoRacialProps) {
  return (
    <div className="card grafico-racial">
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Perfil étnico-racial</h3>

      {GRUPOS.map(({ chave, rotulo, cor }) => {
        const valor = raca[chave]
        const pct = populacaoTotal > 0 ? (valor / populacaoTotal) * 100 : 0
        return (
          <div key={chave} className="linha-racial">
            <span className="rotulo-racial">{rotulo}</span>
            <div
              className="barra-trilha"
              role="img"
              aria-label={`${rotulo}: ${pct.toFixed(1).replace('.', ',')}% (${valor.toLocaleString('pt-BR')} pessoas)`}
            >
              <div className="barra-preenchida" style={{ width: `${pct}%`, background: cor }} />
            </div>
            <span className="valor-racial">
              {pct.toFixed(1).replace('.', ',')}% · {valor.toLocaleString('pt-BR')}
            </span>
          </div>
        )
      })}

      <p className="texto-suave" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
        “Negros” agrega pretos e pardos (IBGE, Censo 2022) — enquadramento de
        justiça racial adotado pelo Observatório.
      </p>
    </div>
  )
}
