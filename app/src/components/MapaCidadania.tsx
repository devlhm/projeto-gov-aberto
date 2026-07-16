/**
 * Mapa em tela cheia (Leaflet + react-leaflet, tiles OpenStreetMap — sem
 * chave de API). Camadas:
 *   1. Polígonos dos bairros pintados pela escala de alerta
 *      (Funcionalidade 4 — Deserto de Serviços);
 *   2. Marcadores dos equipamentos (já filtrados por chips + raio);
 *   3. Posição do usuário + círculo do Raio de Cidadania.
 */

import { useEffect, useMemo } from 'react'
import { Circle, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Coordenada, FeaturePoligono, FeaturePonto } from '../types'
import type { MetricasBairro, Status } from '../lib/metricas'

/** Centro aproximado de São Vicente (fallback inicial do mapa) */
export const CENTRO_SAO_VICENTE: Coordenada = { lat: -23.9631, lng: -46.3919 }

/* Cores da escala semântica em hex — atributos SVG do Leaflet não resolvem
   variáveis CSS, então os valores dos tokens são repetidos aqui. */
const COR_STATUS: Record<Status, string> = {
  adequado: '#007a4a',
  atencao: '#e87722',
  critico: '#c0392b',
}

const COR_TIPO = { saude: '#00a3e0', educacao: '#e87722' }

/* ---------- Ícones de marcador (divIcon com SVG inline) ---------- */

const GLIFO_SAUDE =
  '<path d="M13.5 8h5v5h5v5h-5v5h-5v-5h-5v-5h5z" fill="#fff"/>'
const GLIFO_EDUCACAO =
  '<path d="M16 9.5c-1.6-1-3.7-1.4-6-1.3v10.6c2.3-.1 4.4.3 6 1.3 1.6-1 3.7-1.4 6-1.3V8.2c-2.3-.1-4.4.3-6 1.3z" fill="#fff"/><path d="M16 9.5v10.6" stroke="COR" stroke-width="1.2"/>'

const cacheIcones = new Map<string, L.DivIcon>()

function iconeEquipamento(tipo: 'saude' | 'educacao', selecionado: boolean): L.DivIcon {
  const chave = `${tipo}-${selecionado}`
  const emCache = cacheIcones.get(chave)
  if (emCache) return emCache

  const cor = COR_TIPO[tipo]
  const glifo = (tipo === 'saude' ? GLIFO_SAUDE : GLIFO_EDUCACAO).replace(/COR/g, cor)
  const icone = L.divIcon({
    className: '',
    html:
      `<div class="pino" data-selecionado="${selecionado}">` +
      `<svg width="32" height="42" viewBox="0 0 32 42">` +
      `<path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.5 16 41 16 41s15-14.5 15-25.2C31 7.6 24.3 1 16 1z" ` +
      `fill="${cor}" stroke="#fff" stroke-width="2"/>${glifo}</svg></div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 40],
  })
  cacheIcones.set(chave, icone)
  return icone
}

const iconeUsuario = L.divIcon({
  className: '',
  html: '<div class="ponto-usuario" role="img" aria-label="Sua posição"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/* ---------- Controle imperativo do mapa (voos e enquadramento) ---------- */

function ControladorDoMapa({
  alvoVoo,
  limites,
}: {
  alvoVoo: { centro: Coordenada; zoom: number } | null
  limites: L.LatLngBounds | null
}) {
  const mapa = useMap()

  // Enquadra todos os bairros quando os dados chegam.
  // O padding inferior compensa a área coberta pelo Bottom Sheet.
  useEffect(() => {
    if (limites) {
      mapa.fitBounds(limites, {
        paddingTopLeft: [24, 110], // barra superior + chips
        paddingBottomRight: [24, Math.round(window.innerHeight * 0.42)], // sheet
      })
    }
  }, [mapa, limites])

  // Voa até o alvo (bairro/equipamento selecionado)
  useEffect(() => {
    if (alvoVoo) {
      mapa.flyTo([alvoVoo.centro.lat, alvoVoo.centro.lng], alvoVoo.zoom, { duration: 0.8 })
    }
  }, [mapa, alvoVoo])

  return null
}

/* ---------- Componente principal ---------- */

interface MapaCidadaniaProps {
  bairros: FeaturePoligono[]
  metricasPorBairro: Map<string, MetricasBairro>
  /** equipamentos visíveis (já filtrados por chips e, se ativo, pelo raio) */
  equipamentos: FeaturePonto[]
  posicao: Coordenada | null
  raioKm: number
  bairroSelecionado: string | null
  equipamentoSelecionado: string | null
  alvoVoo: { centro: Coordenada; zoom: number } | null
  aoSelecionarBairro: (nome: string) => void
  aoSelecionarEquipamento: (id: string) => void
}

export function MapaCidadania({
  bairros,
  metricasPorBairro,
  equipamentos,
  posicao,
  raioKm,
  bairroSelecionado,
  equipamentoSelecionado,
  alvoVoo,
  aoSelecionarBairro,
  aoSelecionarEquipamento,
}: MapaCidadaniaProps) {
  // Limites de todos os bairros (para o enquadramento inicial)
  const limites = useMemo(() => {
    if (bairros.length === 0) return null
    const pontos = bairros.flatMap((b) =>
      b.geometry.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng)),
    )
    return L.latLngBounds(pontos)
  }, [bairros])

  return (
    <div className="mapa-fundo">
      <MapContainer
        center={[CENTRO_SAO_VICENTE.lat, CENTRO_SAO_VICENTE.lng]}
        zoom={13}
        zoomControl={false}
        attributionControl={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ControladorDoMapa alvoVoo={alvoVoo} limites={limites} />

        {/* Camada 1: bairros pintados pela escala de alerta */}
        {bairros.map((b) => {
          const nome = b.properties.nome
          const status = metricasPorBairro.get(nome)?.statusGeral ?? 'adequado'
          const cor = COR_STATUS[status]
          const selecionado = nome === bairroSelecionado
          const posicoes = b.geometry.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number],
          )
          return (
            <Polygon
              key={nome}
              positions={posicoes}
              eventHandlers={{ click: () => aoSelecionarBairro(nome) }}
              pathOptions={{
                color: cor,
                weight: selecionado ? 3.5 : 1.5,
                // críticos "acendem" mais forte no mapa
                fillColor: cor,
                fillOpacity: selecionado ? 0.45 : status === 'critico' ? 0.38 : 0.22,
                dashArray: selecionado ? undefined : '6 4', // traço "à mão"
              }}
            >
              <Tooltip sticky>
                <strong>{nome}</strong> — {status === 'adequado' ? 'adequado' : status === 'atencao' ? 'atenção' : 'crítico'}
              </Tooltip>
            </Polygon>
          )
        })}

        {/* Camada 2: equipamentos */}
        {equipamentos.map((e) => {
          const eq = e.properties
          return (
            <Marker
              key={eq.id}
              position={[eq.lat, eq.lng]}
              icon={iconeEquipamento(eq.tipo, eq.id === equipamentoSelecionado)}
              eventHandlers={{ click: () => aoSelecionarEquipamento(eq.id) }}
              alt={eq.nome}
            />
          )
        })}

        {/* Camada 3: usuário + círculo do raio */}
        {posicao && (
          <>
            <Circle
              center={[posicao.lat, posicao.lng]}
              radius={raioKm * 1000}
              pathOptions={{
                color: '#007a4a',
                weight: 2.5,
                dashArray: '8 6', // círculo tracejado, traço artesanal
                fillColor: '#007a4a',
                fillOpacity: 0.07,
              }}
            />
            <Marker
              position={[posicao.lat, posicao.lng]}
              icon={iconeUsuario}
              zIndexOffset={1000}
              alt="Sua posição"
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}
