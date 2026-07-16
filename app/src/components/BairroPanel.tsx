/**
 * Funcionalidade 3 — Painel do Meu Bairro (justiça climática e social).
 * População, perfil étnico-racial, habitantes por equipamento (saúde e
 * educação separados) com selo de status, e download de dados abertos.
 * Responde às perguntas da banca: "Meu bairro possui cobertura adequada?"
 * e (transparência) "dados abertos por bairro".
 */

import type { FeaturePoligono, FeaturePonto } from '../types'
import { formatarRazao, type MetricasBairro } from '../lib/metricas'
import { exportarCSV, exportarJSON } from '../lib/export'
import { GraficoRacial } from './GraficoRacial'
import { SeloStatus, PontoStatus } from './SeloStatus'
import { IconeDownload, IconeEducacao, IconeSaude } from './Icones'

interface BairroPanelProps {
  bairros: FeaturePoligono[]
  metricasPorBairro: Map<string, MetricasBairro>
  bairroSelecionado: string | null
  equipamentosDoBairro: FeaturePonto[]
  aoSelecionarBairro: (nome: string) => void
}

export function BairroPanel({
  bairros,
  metricasPorBairro,
  bairroSelecionado,
  equipamentosDoBairro,
  aoSelecionarBairro,
}: BairroPanelProps) {
  const feature = bairros.find((b) => b.properties.nome === bairroSelecionado)

  // ---- Estado vazio: escolher um bairro ----
  if (!feature) {
    return (
      <div>
        <h2 className="titulo-secao">Meu bairro</h2>
        <p className="texto-suave">
          Toque em um bairro no mapa — ou escolha abaixo — para ver população,
          perfil étnico-racial e a cobertura de saúde e educação.
        </p>
        <div className="grade-bairros">
          {[...bairros]
            .sort((a, b) => a.properties.nome.localeCompare(b.properties.nome, 'pt-BR'))
            .map((b) => {
              const metricas = metricasPorBairro.get(b.properties.nome)
              return (
                <button
                  key={b.properties.nome}
                  type="button"
                  className="chip-bairro"
                  onClick={() => aoSelecionarBairro(b.properties.nome)}
                >
                  {metricas && <PontoStatus status={metricas.statusGeral} />}
                  {b.properties.nome}
                </button>
              )
            })}
        </div>
      </div>
    )
  }

  // ---- Bairro selecionado ----
  const bairro = feature.properties
  const metricas = metricasPorBairro.get(bairro.nome)
  if (!metricas) return null

  return (
    <div>
      <div className="painel-cabecalho">
        <h2>{bairro.nome}</h2>
        <SeloStatus status={metricas.statusGeral} />
      </div>

      {/* Alerta de deserto de serviços (Funcionalidade 4, versão painel) */}
      {metricas.statusGeral === 'critico' && (
        <p className="aviso" style={{ margin: '0 0 10px', background: 'var(--status-critico)' }}>
          Deserto de serviços: muita gente disputando pouca infraestrutura
          pública. Prioridade para investimento.
        </p>
      )}

      <div className="grade-stats">
        <div className="stat">
          <div className="stat-valor">{bairro.populacao_total.toLocaleString('pt-BR')}</div>
          <div className="stat-rotulo">habitantes</div>
        </div>
        <div className="stat">
          <div className="stat-valor">{bairro.area_km2.toLocaleString('pt-BR')}</div>
          <div className="stat-rotulo">km²</div>
        </div>
        <div className="stat">
          <div className="stat-valor">{bairro.densidade.toLocaleString('pt-BR')}</div>
          <div className="stat-rotulo">hab/km²</div>
        </div>
      </div>

      <GraficoRacial raca={bairro.raca} populacaoTotal={bairro.populacao_total} />

      {/* Habitantes por equipamento — saúde e educação separados */}
      <div className="grade-cobertura">
        <div className="cobertura-card saude">
          <div className="cobertura-titulo">
            <IconeSaude /> Saúde
          </div>
          <div className="cobertura-razao">
            {metricas.nEquipSaude}{' '}
            {metricas.nEquipSaude === 1 ? 'equipamento' : 'equipamentos'}
            <br />
            {formatarRazao(metricas.habPorEquipSaude)}
          </div>
          <SeloStatus status={metricas.statusSaude} />
        </div>

        <div className="cobertura-card educacao">
          <div className="cobertura-titulo">
            <IconeEducacao /> Educação
          </div>
          <div className="cobertura-razao">
            {metricas.nEquipEducacao}{' '}
            {metricas.nEquipEducacao === 1 ? 'equipamento' : 'equipamentos'}
            <br />
            {formatarRazao(metricas.habPorEquipEducacao)}
          </div>
          <SeloStatus status={metricas.statusEducacao} />
        </div>
      </div>

      {/* Lista dos equipamentos do bairro */}
      {equipamentosDoBairro.length > 0 && (
        <>
          <h3 className="titulo-secao" style={{ fontSize: 18 }}>
            Equipamentos no bairro
          </h3>
          {equipamentosDoBairro.map(({ properties: eq }) => (
            <div key={eq.id} className="card" style={{ padding: '10px 14px' }}>
              <strong style={{ fontSize: 13.5 }}>{eq.nome}</strong>
              <div className="eq-meta">
                {eq.subtipo} · {eq.endereco}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Dados abertos (pilar de transparência) */}
      <div className="acoes-dados">
        <button
          type="button"
          className="btn-dados"
          onClick={() => exportarJSON(bairro, metricas, equipamentosDoBairro)}
        >
          <IconeDownload /> Baixar JSON
        </button>
        <button
          type="button"
          className="btn-dados"
          onClick={() => exportarCSV(bairro, metricas, equipamentosDoBairro)}
        >
          <IconeDownload /> Baixar CSV
        </button>
      </div>
      <p className="texto-suave" style={{ fontSize: 11.5, marginTop: 6 }}>
        Dados abertos do bairro: população, perfil racial, métricas de
        cobertura e lista de equipamentos — livres para reuso por gestores,
        jornalistas e pesquisadores.
      </p>
    </div>
  )
}
