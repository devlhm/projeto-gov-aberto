/**
 * Ponto de entrada do Raio de Cidadania.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css' // estilos do mapa (obrigatório para o Leaflet)
import './app.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
