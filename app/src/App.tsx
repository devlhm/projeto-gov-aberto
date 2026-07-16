/**
 * Raio de Cidadania — Observatório de Justiça Climática de São Vicente
 * Pilar: Serviços Públicos (Saúde e Educação) · marca Coop Clima
 *
 * Composição: mapa em tela cheia ao fundo + barra superior + chips de filtro
 * + Bottom Sheet arrastável com as visões Raio / Meu Bairro / Ranking.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Coordenada, Filtros, Visao } from './types'
import { FILTROS_INICIAIS } from './types'
import { useDados } from './hooks/useDados'
import { calcularMetricas, contarEquipamentosPorBairro, filtrarEquipamentos } from './lib/metricas'
import type { MetricasBairro } from './lib/metricas'
import { centroideDoPoligono, distanciaKm } from './lib/distancia'
import { CENTRO_SAO_VICENTE, MapaCidadania } from './components/MapaCidadania'
import { TopBar } from './components/TopBar'
import { FilterChips } from './components/FilterChips'
import { BottomSheet, type EstadoSheet } from './components/BottomSheet'
import { RaioView, type EquipamentoComDistancia } from './components/RaioView'
import { BairroPanel } from './components/BairroPanel'
import { RankingView } from './components/RankingView'
import { EquipamentoCard } from './components/EquipamentoCard'
import { LogoCoopClima } from './components/LogoCoopClima'
import { RAIO_PADRAO_KM } from './components/RadiusSlider'

/** Localização simulada (Centro de São Vicente) para demonstrações à banca
 *  ou quando o usuário nega/não tem geolocalização. */
const POSICAO_DEMO: Coordenada = { lat: -23.9646, lng: -46.3888 }

/** Se o usuário estiver a mais que isso do centro da cidade, o protótipo cai
 *  no modo demonstração (os dados cobrem apenas São Vicente). */
const LIMITE_FORA_DA_CIDADE_KM = 30

export default function App() {
  const { bairros, equipamentos, erro } = useDados()

  // ---------- Estado da interface ----------
  const [visao, setVisao] = useState<Visao>('raio')
  const [estadoSheet, setEstadoSheet] = useState<EstadoSheet>('meio')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [raioKm, setRaioKm] = useState(RAIO_PADRAO_KM)
  const [posicao, setPosicao] = useState<Coordenada | null>(null)
  const [modoDemo, setModoDemo] = useState(false)
  const [buscandoPosicao, setBuscandoPosicao] = useState(false)
  const [bairroSelecionado, setBairroSelecionado] = useState<string | null>(null)
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string | null>(null)
  const [alvoVoo, setAlvoVoo] = useState<{ centro: Coordenada; zoom: number } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // ---------- Métricas derivadas (memoizadas) ----------
  const metricasPorBairro = useMemo(() => {
    const mapa = new Map<string, MetricasBairro>()
    if (!bairros || !equipamentos) return mapa
    const contagem = contarEquipamentosPorBairro(equipamentos.features)
    for (const b of bairros.features) {
      mapa.set(b.properties.nome, calcularMetricas(b.properties, contagem))
    }
    return mapa
  }, [bairros, equipamentos])

  /** Equipamentos após os chips de filtro (Funcionalidade 2) */
  const equipamentosFiltrados = useMemo(
    () => (equipamentos ? filtrarEquipamentos(equipamentos.features, filtros) : []),
    [equipamentos, filtros],
  )

  /** Equipamentos dentro do raio, com distância, ordenados (Funcionalidade 1) */
  const equipamentosNoRaio = useMemo<EquipamentoComDistancia[]>(() => {
    if (!posicao) return []
    return equipamentosFiltrados
      .map((feature) => ({
        feature,
        distanciaKm: distanciaKm(posicao, {
          lat: feature.properties.lat,
          lng: feature.properties.lng,
        }),
      }))
      .filter((e) => e.distanciaKm <= raioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
  }, [equipamentosFiltrados, posicao, raioKm])

  /** Com raio ativo o mapa mostra SÓ o que está dentro do raio */
  const equipamentosNoMapa = useMemo(
    () => (posicao ? equipamentosNoRaio.map((e) => e.feature) : equipamentosFiltrados),
    [posicao, equipamentosNoRaio, equipamentosFiltrados],
  )

  /** Inventário completo do bairro selecionado (sem filtros — é diagnóstico) */
  const equipamentosDoBairro = useMemo(
    () =>
      equipamentos && bairroSelecionado
        ? equipamentos.features.filter((e) => e.properties.bairro === bairroSelecionado)
        : [],
    [equipamentos, bairroSelecionado],
  )

  /** Equipamento destacado (tocado no mapa ou na lista) */
  const equipamentoDestacado = useMemo(
    () =>
      equipamentos?.features.find((e) => e.properties.id === equipamentoSelecionado) ?? null,
    [equipamentos, equipamentoSelecionado],
  )

  // ---------- Ações ----------

  function mostrarAviso(texto: string) {
    setAviso(texto)
    window.setTimeout(() => setAviso(null), 6000)
  }

  const entrarModoDemo = useCallback((motivo?: string) => {
    setPosicao(POSICAO_DEMO)
    setModoDemo(true)
    setVisao('raio')
    setAlvoVoo({ centro: POSICAO_DEMO, zoom: 15 })
    if (motivo) mostrarAviso(motivo)
  }, [])

  /** Funcionalidade 1 — geolocalização via navigator.geolocation */
  const usarLocalizacao = useCallback(() => {
    if (!('geolocation' in navigator)) {
      entrarModoDemo('Seu navegador não oferece geolocalização — modo demonstração ativado.')
      return
    }
    setBuscandoPosicao(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscandoPosicao(false)
        const aqui = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        // fora de São Vicente, o raio não encontraria nada — simula no Centro
        if (distanciaKm(aqui, CENTRO_SAO_VICENTE) > LIMITE_FORA_DA_CIDADE_KM) {
          entrarModoDemo('Você parece estar fora de São Vicente — usando localização simulada no Centro.')
          return
        }
        setPosicao(aqui)
        setModoDemo(false)
        setVisao('raio')
        setAlvoVoo({ centro: aqui, zoom: 15 })
      },
      () => {
        setBuscandoPosicao(false)
        entrarModoDemo('Não foi possível obter sua localização — modo demonstração ativado.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [entrarModoDemo])

  /** Toque num bairro (mapa, grade ou ranking) abre o painel do bairro */
  const selecionarBairro = useCallback(
    (nome: string) => {
      setBairroSelecionado(nome)
      setVisao('bairro')
      setEstadoSheet((atual) => (atual === 'recolhido' ? 'meio' : atual))
      const feature = bairros?.features.find((b) => b.properties.nome === nome)
      if (feature) {
        setAlvoVoo({ centro: centroideDoPoligono(feature.geometry.coordinates), zoom: 14 })
      }
    },
    [bairros],
  )

  /** Toque num equipamento (mapa ou lista) destaca o card correspondente */
  const selecionarEquipamento = useCallback(
    (id: string) => {
      setEquipamentoSelecionado(id)
      setVisao('raio')
      setEstadoSheet((atual) => (atual === 'recolhido' ? 'meio' : atual))
      const feature = equipamentos?.features.find((e) => e.properties.id === id)
      if (feature) {
        setAlvoVoo({
          centro: { lat: feature.properties.lat, lng: feature.properties.lng },
          zoom: 16,
        })
      }
    },
    [equipamentos],
  )

  const mudarVisao = useCallback((v: Visao) => {
    setVisao(v)
    setEstadoSheet((atual) => (atual === 'recolhido' ? 'meio' : atual))
  }, [])

  // Deep links úteis para apresentações e testes (aplicados uma única vez,
  // assim que os dados carregam):
  //   ?demo=1                → ativa a localização simulada
  //   ?bairro=Quarentenário  → abre o painel daquele bairro
  //   ?visao=ranking         → abre direto numa visão (raio|bairro|ranking)
  const deepLinkAplicado = useRef(false)
  useEffect(() => {
    if (!bairros || deepLinkAplicado.current) return
    deepLinkAplicado.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('demo')) entrarModoDemo()
    const bairroParam = params.get('bairro')
    if (bairroParam) selecionarBairro(bairroParam)
    const visaoParam = params.get('visao')
    if (visaoParam === 'raio' || visaoParam === 'bairro' || visaoParam === 'ranking') {
      setVisao(visaoParam)
    }
  }, [bairros, entrarModoDemo, selecionarBairro])

  // ---------- Estados de carregamento / erro ----------

  if (erro) {
    return (
      <div className="splash">
        <LogoCoopClima mono />
        <h1>Raio de Cidadania</h1>
        <p>Não foi possível carregar os dados: {erro}</p>
        <button type="button" className="cta-localizacao" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    )
  }

  if (!bairros || !equipamentos) {
    return (
      <div className="splash">
        <LogoCoopClima mono />
        <h1>Raio de Cidadania</h1>
        <div className="girador" aria-label="Carregando" />
        <p>Carregando dados abertos de São Vicente…</p>
      </div>
    )
  }

  // ---------- Interface principal ----------

  return (
    <div className="app">
      <MapaCidadania
        bairros={bairros.features}
        metricasPorBairro={metricasPorBairro}
        equipamentos={equipamentosNoMapa}
        posicao={posicao}
        raioKm={raioKm}
        bairroSelecionado={bairroSelecionado}
        equipamentoSelecionado={equipamentoSelecionado}
        alvoVoo={alvoVoo}
        aoSelecionarBairro={selecionarBairro}
        aoSelecionarEquipamento={selecionarEquipamento}
      />

      <div className="ui-topo">
        <TopBar
          posicaoAtiva={posicao !== null}
          buscando={buscandoPosicao}
          aoUsarLocalizacao={usarLocalizacao}
        />
        <FilterChips filtros={filtros} aoMudar={setFiltros} />
        {aviso && (
          <p className="aviso" role="status">
            {aviso}
          </p>
        )}
      </div>

      <BottomSheet
        estado={estadoSheet}
        aoMudarEstado={setEstadoSheet}
        visao={visao}
        aoMudarVisao={mudarVisao}
      >
        {visao === 'raio' && (
          <>
            {/* card fixado do equipamento tocado no mapa */}
            {equipamentoDestacado && (
              <EquipamentoCard
                equipamento={equipamentoDestacado.properties}
                distanciaKm={
                  posicao
                    ? distanciaKm(posicao, {
                        lat: equipamentoDestacado.properties.lat,
                        lng: equipamentoDestacado.properties.lng,
                      })
                    : undefined
                }
                selecionado
              />
            )}
            <RaioView
              posicao={posicao}
              modoDemo={modoDemo}
              buscando={buscandoPosicao}
              raioKm={raioKm}
              aoMudarRaio={setRaioKm}
              equipamentosNoRaio={equipamentosNoRaio.filter(
                (e) => e.feature.properties.id !== equipamentoSelecionado,
              )}
              totalFiltrado={equipamentosFiltrados.length}
              equipamentoSelecionado={equipamentoSelecionado}
              aoSelecionarEquipamento={selecionarEquipamento}
              aoUsarLocalizacao={usarLocalizacao}
              aoEntrarModoDemo={() => entrarModoDemo()}
            />
          </>
        )}

        {visao === 'bairro' && (
          <BairroPanel
            bairros={bairros.features}
            metricasPorBairro={metricasPorBairro}
            bairroSelecionado={bairroSelecionado}
            equipamentosDoBairro={equipamentosDoBairro}
            aoSelecionarBairro={selecionarBairro}
          />
        )}

        {visao === 'ranking' && (
          <RankingView
            bairros={bairros.features}
            metricasPorBairro={metricasPorBairro}
            equipamentos={equipamentos.features}
            aoSelecionarBairro={selecionarBairro}
          />
        )}
      </BottomSheet>
    </div>
  )
}
