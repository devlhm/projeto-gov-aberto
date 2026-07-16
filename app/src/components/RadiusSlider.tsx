/**
 * Slider do "Raio de Cidadania": 0,5 km a 3 km (padrão 1 km).
 * O mapa e a lista filtram em tempo real conforme o valor.
 */

export const RAIO_MIN_KM = 0.5
export const RAIO_MAX_KM = 3
export const RAIO_PASSO_KM = 0.25
export const RAIO_PADRAO_KM = 1

interface RadiusSliderProps {
  raioKm: number
  aoMudar: (km: number) => void
}

export function RadiusSlider({ raioKm, aoMudar }: RadiusSliderProps) {
  return (
    <div className="card raio-controle">
      <div className="raio-cabecalho">
        <label htmlFor="slider-raio" style={{ fontWeight: 700, fontSize: 14 }}>
          Raio de busca
        </label>
        <span className="raio-valor">{raioKm.toLocaleString('pt-BR')} km</span>
      </div>
      <input
        id="slider-raio"
        className="raio-slider"
        type="range"
        min={RAIO_MIN_KM}
        max={RAIO_MAX_KM}
        step={RAIO_PASSO_KM}
        value={raioKm}
        onChange={(e) => aoMudar(Number(e.target.value))}
        aria-valuetext={`${raioKm.toLocaleString('pt-BR')} quilômetros`}
      />
      <div className="raio-legenda">
        <span>0,5 km</span>
        <span>3 km</span>
      </div>
    </div>
  )
}
