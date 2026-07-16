/**
 * Funcionalidade 2 — Filtros inteligentes ("best effort").
 * Chips de categoria (Tudo / Saúde / Educação) + flags específicas.
 * As flags só aparecem quando a categoria correspondente está visível,
 * mantendo a barra enxuta no celular.
 */

import type { CategoriaFiltro, Filtros } from '../types'

interface FilterChipsProps {
  filtros: Filtros
  aoMudar: (filtros: Filtros) => void
}

const CATEGORIAS: { valor: CategoriaFiltro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Tudo' },
  { valor: 'saude', rotulo: 'Saúde' },
  { valor: 'educacao', rotulo: 'Educação' },
]

export function FilterChips({ filtros, aoMudar }: FilterChipsProps) {
  const mostraSaude = filtros.categoria !== 'educacao'
  const mostraEducacao = filtros.categoria !== 'saude'

  function alternarFlag(flag: keyof Omit<Filtros, 'categoria'>) {
    aoMudar({ ...filtros, [flag]: !filtros[flag] })
  }

  return (
    <div className="filtros" role="toolbar" aria-label="Filtros de equipamentos">
      {/* Categoria: comporta-se como grupo de rádio */}
      <div role="radiogroup" aria-label="Categoria" style={{ display: 'contents' }}>
        {CATEGORIAS.map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={filtros.categoria === valor}
            className="chip chip-verde"
            onClick={() => aoMudar({ ...filtros, categoria: valor })}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {mostraEducacao && (
        <>
          <button
            type="button"
            className="chip chip-laranja"
            aria-pressed={filtros.educacaoInfantil}
            onClick={() => alternarFlag('educacaoInfantil')}
          >
            Educação Infantil
          </button>
          <button
            type="button"
            className="chip chip-laranja"
            aria-pressed={filtros.ensinoFundamental}
            onClick={() => alternarFlag('ensinoFundamental')}
          >
            Ensino Fundamental
          </button>
        </>
      )}

      {mostraSaude && (
        <>
          <button
            type="button"
            className="chip chip-azul"
            aria-pressed={filtros.ambulatorial}
            onClick={() => alternarFlag('ambulatorial')}
          >
            Ambulatorial
          </button>
          <button
            type="button"
            className="chip chip-azul"
            aria-pressed={filtros.turno24h}
            onClick={() => alternarFlag('turno24h')}
          >
            Turno 24h
          </button>
        </>
      )}
    </div>
  )
}
