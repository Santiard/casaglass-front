import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // En desarrollo, el proxy apunta a localhost:8080 (backend local)
        // El backend NO espera el prefijo /api, así que lo eliminamos con rewrite
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // Elimina /api del path
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
