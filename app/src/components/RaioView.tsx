/**
 * Funcionalidade 1 — visão "Raio de Cidadania".
 * Com a localização ativa: slider de raio + lista dos equipamentos dentro
 * do raio, ordenados por distância. Sem localização: convite para ativar.
 * Responde à pergunta da banca: "Onde está a escola/unidade de saúde mais próxima?"
 */

import type { Coordenada, FeaturePonto } from '../types'
import { RadiusSlider } from './RadiusSlider'
import { EquipamentoCard } from './EquipamentoCard'
import { IconeLocalizacao } from './Icones'

export interface EquipamentoComDistancia {
  feature: FeaturePonto
  distanciaKm: number
}

interface RaioViewProps {
  posicao: Coordenada | null
  modoDemo: boolean
  buscando: boolean
  raioKm: number
  aoMudarRaio: (km: number) => void
  /** já filtrados pelos chips E pelo raio, ordenados por distância */
  equipamentosNoRaio: EquipamentoComDistancia[]
  totalFiltrado: number
  equipamentoSelecionado: string | null
  aoSelecionarEquipamento: (id: string) => void
  aoUsarLocalizacao: () => void
  aoEntrarModoDemo: () => void
}

export function RaioView({
  posicao,
  modoDemo,
  buscando,
  raioKm,
  aoMudarRaio,
  equipamentosNoRaio,
  totalFiltrado,
  equipamentoSelecionado,
  aoSelecionarEquipamento,
  aoUsarLocalizacao,
  aoEntrarModoDemo,
}: RaioViewProps) {
  // ---- Estado sem localização: convite ----
  if (!posicao) {
    return (
      <div>
        <h2 className="titulo-secao">Encontre serviços perto de você</h2>
        <p className="texto-suave">
          Ative sua localização para ver <strong>escolas e unidades de saúde</strong> num
          raio de até 3 km, com distância e rota até cada uma.
        </p>
        <button type="button" className="cta-localizacao" onClick={aoUsarLocalizacao} disabled={buscando}>
          <IconeLocalizacao />
          {buscando ? 'Localizando…' : 'Usar minha localização'}
        </button>
        <button type="button" className="link-demo" onClick={aoEntrarModoDemo}>
          ou explorar com uma localização simulada (modo demonstração)
        </button>
        <p className="texto-suave">
          Sua localização é usada apenas no seu aparelho para o cálculo das
          distâncias — nada é enviado a servidores.
        </p>
      </div>
    )
  }

  // ---- Estado com localização: raio ativo ----
  return (
    <div>
      {modoDemo && (
        <p className="aviso" style={{ margin: '8px 0' }}>
          Modo demonstração: usando uma localização simulada no Centro de São Vicente.
        </p>
      )}

      <RadiusSlider raioKm={raioKm} aoMudar={aoMudarRaio} />

      <h2 className="titulo-secao">
        {equipamentosNoRaio.length}{' '}
        {equipamentosNoRaio.length === 1 ? 'equipamento' : 'equipamentos'} no seu raio
      </h2>

      {equipamentosNoRaio.length === 0 && (
        <p className="texto-suave">
          Nenhum equipamento com os filtros atuais dentro de{' '}
          {raioKm.toLocaleString('pt-BR')} km.{' '}
          {totalFiltrado > 0
            ? 'Experimente aumentar o raio ou ajustar os filtros.'
            : 'Experimente ajustar os filtros acima.'}
          {' '}Um raio vazio também é um dado: pode indicar um deserto de serviços.
        </p>
      )}

      {equipamentosNoRaio.map(({ feature, distanciaKm }) => (
        <EquipamentoCard
          key={feature.properties.id}
          equipamento={feature.properties}
          distanciaKm={distanciaKm}
          selecionado={feature.properties.id === equipamentoSelecionado}
          aoTocar={() => aoSelecionarEquipamento(feature.properties.id)}
        />
      ))}
    </div>
  )
}
