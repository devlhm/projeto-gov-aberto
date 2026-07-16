import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite — https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // permite testar no celular na mesma rede (npm run dev -- --host)
    host: true,
  },
})
