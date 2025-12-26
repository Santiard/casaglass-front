import axios from "axios";

/**
 * Configuración de la URL base de la API
 * 
 * IMPORTANTE: El backend SÍ usa el prefijo /api en TODAS sus rutas.
 * Todas las URLs deben incluir el prefijo /api.
 * 
 * Lógica:
 * - En desarrollo (DEV): usa el proxy de Vite '/api' configurado en vite.config.js
 *   que mantiene el prefijo /api, o directamente VITE_API_URL si está definida
 * - En producción: usar VITE_API_URL que debe incluir /api al final
 * 
 * Opciones de despliegue:
 * 1. Mismo servidor: VITE_API_URL=http://148.230.87.167:8080/api (recomendado)
 * 2. Subdominio: VITE_API_URL=https://api.midominio.com/api
 * 
 * Desarrollo actual: http://148.230.87.167:8080 (configurado en .env.development)
 * Producción: http://148.230.87.167:8080/api (configurado en .env.production)
 */
const getBaseURL = () => {
  // Priorizar VITE_API_URL si está definida (desarrollo o producción)
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.trim() !== "") {
    // Asegurar que termine con /api si no lo tiene
    const trimmed = apiUrl.trim();
    if (!trimmed.endsWith('/api')) {
      // Si termina con /, agregar api, sino agregar /api
      return trimmed.endsWith('/') ? trimmed + 'api' : trimmed + '/api';
    }
    return trimmed;
  }
  
  // Si no hay VITE_API_URL definida:
  // - En desarrollo: usa el proxy de Vite '/api' que mantiene el prefijo
  // - En producción: ERROR - debe definirse VITE_API_URL
  if (import.meta.env.PROD) {
    // ERROR: VITE_API_URL no está definida en producción.
    // Por favor, crea .env.production con: VITE_API_URL=http://148.230.87.167:8080/api
  }
  return "/api"; // Fallback para desarrollo (usa el proxy de Vite)
};

export const API_BASE = getBaseURL();

// Log para debugging solo en desarrollo
if (import.meta.env.DEV) {
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Habilita cookies para autenticación
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Interceptor opcional para JWT
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Interceptor para capturar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚨 Error de API interceptado
      headers: error.response?.headers
    });
    
    // Log detallado del error del backend
    if (error.response?.data) {
      // Detalles del error del backend
    }
    
    return Promise.reject(error);
  }
);