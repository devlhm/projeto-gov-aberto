/**
 * Bottom Sheet arrastável com 3 estados (recolhido / meio / expandido).
 * Implementado com Pointer Events puros — sem biblioteca de gestos.
 * Abriga a navegação entre as visões: Raio, Meu Bairro e Ranking.
 */

import { useRef, useState, type PointerEvent as EventoPonteiro, type ReactNode } from 'react'
import type { Visao } from '../types'
import { IconeBairro, IconeRaio, IconeRanking } from './Icones'

export type EstadoSheet = 'recolhido' | 'meio' | 'expandido'

/** Altura de cada estado, em px (calculada na hora para acompanhar a janela) */
function alturaDoEstado(estado: EstadoSheet): number {
  switch (estado) {
    case 'recolhido':
      return 128
    case 'meio':
      return window.innerHeight * 0.46
    case 'expandido':
      return window.innerHeight * 0.88
  }
}

const ABAS: { visao: Visao; rotulo: string; icone: ReactNode }[] = [
  { visao: 'raio', rotulo: 'Raio', icone: <IconeRaio /> },
  { visao: 'bairro', rotulo: 'Meu Bairro', icone: <IconeBairro /> },
  { visao: 'ranking', rotulo: 'Ranking', icone: <IconeRanking /> },
]

interface BottomSheetProps {
  estado: EstadoSheet
  aoMudarEstado: (estado: EstadoSheet) => void
  visao: Visao
  aoMudarVisao: (visao: Visao) => void
  children: ReactNode
}

export function BottomSheet({
  estado,
  aoMudarEstado,
  visao,
  aoMudarVisao,
  children,
}: BottomSheetProps) {
  // altura "viva" durante o arrasto; null = usa a altura do estado (via CSS)
  const [alturaDrag, setAlturaDrag] = useState<number | null>(null)
  const inicioRef = useRef<{ y: number; altura: number } | null>(null)

  function aoIniciarArrasto(e: EventoPonteiro<HTMLDivElement>) {
    inicioRef.current = { y: e.clientY, altura: alturaDoEstado(estado) }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function aoMoverArrasto(e: EventoPonteiro<HTMLDivElement>) {
    if (!inicioRef.current) return
    const delta = inicioRef.current.y - e.clientY // arrastar p/ cima = positivo
    const maxima = alturaDoEstado('expandido')
    const minima = alturaDoEstado('recolhido')
    setAlturaDrag(Math.min(maxima, Math.max(minima, inicioRef.current.altura + delta)))
  }

  function aoSoltarArrasto(e: EventoPonteiro<HTMLDivElement>) {
    if (!inicioRef.current) return
    const delta = Math.abs(inicioRef.current.y - e.clientY)

    if (delta < 6) {
      // toque simples na alça: alterna entre os estados
      const proximo: Record<EstadoSheet, EstadoSheet> = {
        recolhido: 'meio',
        meio: 'expandido',
        expandido: 'recolhido',
      }
      aoMudarEstado(proximo[estado])
    } else if (alturaDrag !== null) {
      // solta: encaixa no estado mais próximo da altura atual
      const estados: EstadoSheet[] = ['recolhido', 'meio', 'expandido']
      const maisProximo = estados.reduce((melhor, atual) =>
        Math.abs(alturaDoEstado(atual) - alturaDrag) <
        Math.abs(alturaDoEstado(melhor) - alturaDrag)
          ? atual
          : melhor,
      )
      aoMudarEstado(maisProximo)
    }

    inicioRef.current = null
    setAlturaDrag(null)
  }

  return (
    <section
      className="sheet"
      data-estado={estado}
      data-arrastando={alturaDrag !== null}
      style={alturaDrag !== null ? { height: alturaDrag } : undefined}
      aria-label="Painel de informações"
    >
      <div
        className="sheet-alca-area"
        onPointerDown={aoIniciarArrasto}
        onPointerMove={aoMoverArrasto}
        onPointerUp={aoSoltarArrasto}
        onPointerCancel={() => {
          inicioRef.current = null
          setAlturaDrag(null)
        }}
        role="button"
        aria-label="Arrastar para redimensionar o painel"
        tabIndex={0}
      >
        <div className="sheet-alca" />
      </div>

      <nav className="abas" role="tablist" aria-label="Visões do aplicativo">
        {ABAS.map(({ visao: v, rotulo, icone }) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={visao === v}
            className="aba"
            onClick={() => aoMudarVisao(v)}
          >
            {icone}
            {rotulo}
          </button>
        ))}
      </nav>

      <div className="sheet-conteudo">{children}</div>
    </section>
  )
}
