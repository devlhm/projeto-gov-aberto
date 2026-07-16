/**
 * Card de equipamento público: nome, tipo, distância e botão "Traçar rota"
 * (abre o Google Maps por link — sem chave de API).
 */

import type { EquipamentoProps } from '../types'
import { formatarDistancia, urlRotaGoogleMaps } from '../lib/distancia'
import { IconeEducacao, IconeRota, IconeSaude } from './Icones'

interface EquipamentoCardProps {
  equipamento: EquipamentoProps
  /** distância em km a partir do usuário (quando o raio está ativo) */
  distanciaKm?: number
  selecionado?: boolean
  aoTocar?: () => void
}

/** Monta as etiquetas de serviço do equipamento (flags "best effort") */
function flagsDoEquipamento(eq: EquipamentoProps): string[] {
  const flags: string[] = []
  if (eq.tipo === 'saude') {
    if (eq.atende_24h) flags.push('24h')
    if (eq.ambulatorial) flags.push('Ambulatorial')
  } else {
    if (eq.educacao_infantil) flags.push('Ed. Infantil')
    if (eq.ensino_fundamental) flags.push('Fundamental')
  }
  return flags
}

export function EquipamentoCard({
  equipamento: eq,
  distanciaKm,
  selecionado,
  aoTocar,
}: EquipamentoCardProps) {
  return (
    <article
      className="card eq-card"
      onClick={aoTocar}
      style={selecionado ? { borderColor: 'var(--cor-azul)', borderWidth: 2 } : undefined}
    >
      <div className={`eq-icone ${eq.tipo}`} aria-hidden="true">
        {eq.tipo === 'saude' ? <IconeSaude tamanho={20} /> : <IconeEducacao tamanho={20} />}
      </div>

      <div className="eq-corpo">
        <h3 className="eq-nome">{eq.nome}</h3>
        <div className="eq-meta">
          {eq.subtipo} · {eq.bairro}
          <br />
          {eq.endereco}
        </div>
        <div className="eq-flags">
          {flagsDoEquipamento(eq).map((f) => (
            <span key={f} className="badge">
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="eq-lado">
        {distanciaKm !== undefined && (
          <span className="eq-distancia">{formatarDistancia(distanciaKm)}</span>
        )}
        <a
          className="btn-rota"
          href={urlRotaGoogleMaps({ lat: eq.lat, lng: eq.lng })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Traçar rota até ${eq.nome} no Google Maps`}
        >
          <IconeRota />
          Traçar rota
        </a>
      </div>
    </article>
  )
}
