import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/web/',
  server: {
    proxy: {
      '/api': {
        // En desarrollo, el proxy apunta a localhost:8080 (backend local)
        // El backend SÍ espera el prefijo /api, así que lo mantenemos
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // NO eliminamos el prefijo /api porque el backend lo espera
      }
    }
  },
  build: {
    // Output directory para producción
    outDir: 'dist',
    // Asegurar que las variables de entorno se incluyan en el build
    emptyOutDir: true,
  }
})
