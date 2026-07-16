/**
 * Tipos do esquema de dados do Raio de Cidadania.
 *
 * Este é o CONTRATO entre o front e o ETL (etl/processar_dados.py):
 * os GeoJSON em public/data/ devem seguir exatamente estas propriedades.
 * Para trocar o mock por dados reais, basta substituir os arquivos.
 */

/** Perfil étnico-racial em números ABSOLUTOS (Censo 2022).
 *  Nota metodológica: "negros" agrega pretos + pardos, seguindo o
 *  enquadramento de justiça racial construído sobre as categorias do IBGE. */
export interface PerfilRacial {
  brancos: number
  negros: number
  indigenas: number
  amarelos: number
}

/** Propriedades de cada bairro em bairros.geojson */
export interface BairroProps {
  nome: string
  populacao_total: number
  area_km2: number
  /** habitantes por km² */
  densidade: number
  raca: PerfilRacial
}

/** Propriedades de cada equipamento em equipamentos.geojson */
export interface EquipamentoProps {
  id: string
  nome: string
  endereco: string
  /** Deve casar exatamente com BairroProps.nome */
  bairro: string
  tipo: 'saude' | 'educacao'
  /** Ex.: UBS, ESF, Hospital, Pronto-Socorro, Pronto Atendimento,
   *  Ambulatório, Creche, EMEI, EMEF */
  subtipo: string
  atende_24h: boolean
  ambulatorial: boolean
  educacao_infantil: boolean
  ensino_fundamental: boolean
  lat: number
  lng: number
}

/* ----- Tipos GeoJSON mínimos (evita dependência externa) ----- */

export interface FeaturePoligono {
  type: 'Feature'
  properties: BairroProps
  geometry: {
    type: 'Polygon'
    /** [ anel ][ vértice ][ lng, lat ] — ordem padrão do GeoJSON */
    coordinates: number[][][]
  }
}

export interface FeaturePonto {
  type: 'Feature'
  properties: EquipamentoProps
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export interface ColecaoBairros {
  type: 'FeatureCollection'
  features: FeaturePoligono[]
}

export interface ColecaoEquipamentos {
  type: 'FeatureCollection'
  features: FeaturePonto[]
}

/* ----- Tipos de estado da interface ----- */

export interface Coordenada {
  lat: number
  lng: number
}

export type Visao = 'raio' | 'bairro' | 'ranking'

export type CategoriaFiltro = 'todos' | 'saude' | 'educacao'

/** Filtros "best effort" combináveis com o raio ativo */
export interface Filtros {
  categoria: CategoriaFiltro
  educacaoInfantil: boolean
  ensinoFundamental: boolean
  ambulatorial: boolean
  turno24h: boolean
}

export const FILTROS_INICIAIS: Filtros = {
  categoria: 'todos',
  educacaoInfantil: false,
  ensinoFundamental: false,
  ambulatorial: false,
  turno24h: false,
}
