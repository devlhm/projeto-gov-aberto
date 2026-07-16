/**
 * Cálculo de distâncias geográficas (fórmula de Haversine).
 * Usado pelo "Raio de Cidadania" para filtrar equipamentos ao redor do usuário.
 */

import type { Coordenada } from '../types'

/** Raio médio da Terra em km */
const RAIO_TERRA_KM = 6371

/**
 * Distância em km entre duas coordenadas pela fórmula de Haversine
 * (distância sobre a esfera — precisa o suficiente para escala urbana).
 */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = grausParaRad(b.lat - a.lat)
  const dLng = grausParaRad(b.lng - a.lng)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(grausParaRad(a.lat)) * Math.cos(grausParaRad(b.lat)) * Math.sin(dLng / 2) ** 2

  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h))
}

function grausParaRad(graus: number): number {
  return (graus * Math.PI) / 180
}

/** Formata distância para exibição: "850 m" ou "1,2 km" */
export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/** Link de rota no Google Maps (não requer chave de API) */
export function urlRotaGoogleMaps(destino: Coordenada): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`
}

/** Centroide simples de um polígono GeoJSON (média dos vértices do anel externo).
 *  Suficiente para posicionar rótulos e centralizar o mapa no bairro. */
export function centroideDoPoligono(coordenadas: number[][][]): Coordenada {
  const anel = coordenadas[0]
  // o último vértice repete o primeiro (anel fechado) — ignora na média
  const vertices = anel.slice(0, -1)
  const soma = vertices.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  )
  return { lat: soma.lat / vertices.length, lng: soma.lng / vertices.length }
}
