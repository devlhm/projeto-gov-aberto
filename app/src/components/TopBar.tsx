/**
 * Barra superior discreta: selo compacto COOP CLIMA + título do app
 * + botão "Usar minha localização" (Funcionalidade 1).
 */

import { LogoCoopClima } from './LogoCoopClima'
import { IconeLocalizacao } from './Icones'

interface TopBarProps {
  posicaoAtiva: boolean
  buscando: boolean
  aoUsarLocalizacao: () => void
}

export function TopBar({ posicaoAtiva, buscando, aoUsarLocalizacao }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="marca">
        <LogoCoopClima />
        <div className="titulo-bloco">
          <h1 className="titulo-app">Raio de Cidadania</h1>
          <span className="assinatura-app">São Vicente</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-localizacao"
        data-ativo={posicaoAtiva}
        disabled={buscando}
        onClick={aoUsarLocalizacao}
        aria-label={
          posicaoAtiva ? 'Atualizar minha localização' : 'Usar minha localização'
        }
      >
        <IconeLocalizacao />
        {buscando ? 'Localizando…' : posicaoAtiva ? 'Ativa' : 'Minha localização'}
      </button>
    </header>
  )
}
