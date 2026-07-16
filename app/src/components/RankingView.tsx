/**
 * Funcionalidade 5 — Ranking de Cobertura Territorial + Dados Abertos.
 * Lista os bairros do melhor para o pior em habitantes por equipamento
 * (saúde ou educação, alternável). Cada bairro pode ser exportado.
 * Responde à pergunta da banca: "Quais regiões possuem menor oferta de serviços?"
 */

import { useMemo, useState } from 'react'
import type { FeaturePoligono, FeaturePonto } from '../types'
import { formatarRazao, type MetricasBairro } from '../lib/metricas'
import { exportarCSV, exportarJSON } from '../lib/export'
import { PontoStatus } from './SeloStatus'

type Metrica = 'saude' | 'educacao'

interface RankingViewProps {
  bairros: FeaturePoligono[]
  metricasPorBairro: Map<string, MetricasBairro>
  equipamentos: FeaturePonto[]
  aoSelecionarBairro: (nome: string) => void
}

export function RankingView({
  bairros,
  metricasPorBairro,
  equipamentos,
  aoSelecionarBairro,
}: RankingViewProps) {
  const [metrica, setMetrica] = useState<Metrica>('saude')

  // Ordena do melhor (menor razão hab/equip) para o pior (Infinity = sem equipamento)
  const ordenados = useMemo(() => {
    return [...bairros].sort((a, b) => {
      const ma = metricasPorBairro.get(a.properties.nome)
      const mb = metricasPorBairro.get(b.properties.nome)
      const ra = metrica === 'saude' ? ma?.habPorEquipSaude ?? Infinity : ma?.habPorEquipEducacao ?? Infinity
      const rb = metrica === 'saude' ? mb?.habPorEquipSaude ?? Infinity : mb?.habPorEquipEducacao ?? Infinity
      return ra - rb
    })
  }, [bairros, metricasPorBairro, metrica])

  function exportar(nome: string, formato: 'json' | 'csv') {
    const feature = bairros.find((b) => b.properties.nome === nome)
    const metricas = metricasPorBairro.get(nome)
    if (!feature || !metricas) return
    const doBairro = equipamentos.filter((e) => e.properties.bairro === nome)
    if (formato === 'json') exportarJSON(feature.properties, metricas, doBairro)
    else exportarCSV(feature.properties, metricas, doBairro)
  }

  return (
    <div>
      <h2 className="titulo-secao">Ranking de cobertura</h2>
      <p className="texto-suave" style={{ marginTop: 0 }}>
        Do bairro melhor servido para o pior — em habitantes por equipamento de{' '}
        {metrica === 'saude' ? 'saúde' : 'educação'}. Quanto menor, melhor.
      </p>

      <div className="alternar-metrica" role="radiogroup" aria-label="Métrica do ranking">
        <button
          type="button"
          role="radio"
          aria-checked={metrica === 'saude'}
          className="chip chip-azul"
          onClick={() => setMetrica('saude')}
        >
          Saúde
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={metrica === 'educacao'}
          className="chip chip-laranja"
          onClick={() => setMetrica('educacao')}
        >
          Educação
        </button>
      </div>

      {ordenados.map((b, i) => {
        const nome = b.properties.nome
        const metricas = metricasPorBairro.get(nome)
        if (!metricas) return null
        const razao = metrica === 'saude' ? metricas.habPorEquipSaude : metricas.habPorEquipEducacao
        const status = metrica === 'saude' ? metricas.statusSaude : metricas.statusEducacao

        return (
          <div key={nome} className="linha-ranking">
            <span className="posicao">{i + 1}º</span>
            <button
              type="button"
              className="ranking-corpo"
              onClick={() => aoSelecionarBairro(nome)}
              style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
              aria-label={`Abrir painel do bairro ${nome}`}
            >
              <div className="ranking-nome" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PontoStatus status={status} />
                {nome}
              </div>
              <div className="ranking-razao">{formatarRazao(razao)}</div>
            </button>
            <div className="ranking-acoes">
              <button
                type="button"
                className="btn-mini"
                onClick={() => exportar(nome, 'json')}
                aria-label={`Baixar dados abertos de ${nome} em JSON`}
              >
                JSON
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => exportar(nome, 'csv')}
                aria-label={`Baixar dados abertos de ${nome} em CSV`}
              >
                CSV
              </button>
            </div>
          </div>
        )
      })}

      <p className="texto-suave" style={{ fontSize: 11.5 }}>
        Baixe os dados abertos de qualquer bairro (JSON/CSV) — transparência
        para gestão pública, imprensa e pesquisa.
      </p>
    </div>
  )
}
