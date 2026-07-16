/**
 * Selo de status da escala semântica de alertas:
 * verde = adequado · laranja = atenção · vermelho terroso = crítico.
 */

import { INFO_STATUS, type Status } from '../lib/metricas'

export function SeloStatus({ status }: { status: Status }) {
  const info = INFO_STATUS[status]
  return (
    <span className="selo" style={{ background: info.corVar }}>
      {info.rotulo}
    </span>
  )
}

/** Versão mínima: só a bolinha colorida (usada no ranking e nas listas) */
export function PontoStatus({ status }: { status: Status }) {
  const info = INFO_STATUS[status]
  return (
    <span
      className="ponto-status"
      style={{ background: info.corVar }}
      role="img"
      aria-label={`Status: ${info.rotulo}`}
    />
  )
}
