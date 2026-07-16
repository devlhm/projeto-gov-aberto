/**
 * Hook de carregamento dos dados estáticos (GeoJSON em public/data/).
 *
 * Arquitetura frontend-only: não há backend. Para usar dados reais,
 * basta substituir os arquivos bairros.geojson e equipamentos.geojson
 * (gerados pelo ETL em etl/processar_dados.py) — o esquema é o mesmo.
 */

import { useEffect, useState } from 'react'
import type { ColecaoBairros, ColecaoEquipamentos } from '../types'

interface EstadoDados {
  bairros: ColecaoBairros | null
  equipamentos: ColecaoEquipamentos | null
  erro: string | null
}

export function useDados(): EstadoDados {
  const [estado, setEstado] = useState<EstadoDados>({
    bairros: null,
    equipamentos: null,
    erro: null,
  })

  useEffect(() => {
    const base = import.meta.env.BASE_URL

    async function carregar() {
      try {
        const [respBairros, respEquip] = await Promise.all([
          fetch(`${base}data/bairros.geojson`),
          fetch(`${base}data/equipamentos.geojson`),
        ])
        if (!respBairros.ok || !respEquip.ok) {
          throw new Error('Falha ao carregar os arquivos GeoJSON')
        }
        const [bairros, equipamentos] = await Promise.all([
          respBairros.json() as Promise<ColecaoBairros>,
          respEquip.json() as Promise<ColecaoEquipamentos>,
        ])
        setEstado({ bairros, equipamentos, erro: null })
      } catch (e) {
        setEstado({
          bairros: null,
          equipamentos: null,
          erro: e instanceof Error ? e.message : 'Erro desconhecido ao carregar dados',
        })
      }
    }

    carregar()
  }, [])

  return estado
}
