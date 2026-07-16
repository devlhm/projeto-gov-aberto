/**
 * Ícones SVG inline — leves, sem biblioteca externa.
 * Traço levemente irregular seguindo a estética "à mão" da marca.
 */

interface IconeProps {
  tamanho?: number
}

export function IconeLocalizacao({ tamanho = 18 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5c-3.9 0-7 3.1-7 6.9 0 5 6.2 11.4 6.7 11.9.2.2.5.2.7 0 .4-.5 6.6-6.9 6.6-11.9 0-3.8-3.1-6.9-7-6.9z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.4" r="2.6" fill="var(--cor-claro, #f9f3f0)" />
    </svg>
  )
}

export function IconeSaude({ tamanho = 18 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* cruz de saúde com cantos suaves */}
      <path
        d="M9.2 3.4h5.5v5.7l5.8.1v5.5l-5.8.1v5.7H9.2v-5.7l-5.7-.1V9.2l5.7-.1V3.4z"
        fill="currentColor"
      />
    </svg>
  )
}

export function IconeEducacao({ tamanho = 18 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* livro aberto */}
      <path
        d="M12 5.6C10.2 4.3 7.6 3.8 4.4 4v14.3c3.2-.2 5.8.3 7.6 1.6 1.8-1.3 4.4-1.8 7.6-1.6V4c-3.2-.2-5.8.3-7.6 1.6z"
        fill="currentColor"
      />
      <path d="M12 5.6v14.3" stroke="var(--cor-claro, #f9f3f0)" strokeWidth="1.6" />
    </svg>
  )
}

export function IconeDownload({ tamanho = 16 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.2v11m0 0l-4.4-4.2M12 14.2l4.4-4.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 17.5c2.4.9 4.9 1.3 7.5 1.3s5.1-.4 7.5-1.3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconeRota({ tamanho = 15 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* seta curva "feita à mão" */}
      <path
        d="M4 19c.5-6.5 4-10.5 12.5-10.8M13.5 4.2 17 8.1l-3.9 3.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconeRaio({ tamanho = 17 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="2.2" strokeDasharray="4 3" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}

export function IconeBairro({ tamanho = 17 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* casinha de palafita */}
      <path
        d="M4.5 11.5 12 4.8l7.5 6.7M6.5 10.5v8h11v-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 18.5v2.3M16 18.5v2.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function IconeRanking({ tamanho = 17 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* pódio */}
      <path
        d="M3.5 20v-6.2h5V20m0 0V9h7v11m0 0v-4.8h5V20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
