import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // En desarrollo, el proxy apunta a localhost:8080
        // Si necesitas apuntar a otra IP, ajusta esta configuración
        // O usa directamente VITE_API_URL en .env.development
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
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
