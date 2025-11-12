import axios from "axios";

/**
 * Configuración de la URL base de la API
 * 
 * IMPORTANTE: El backend NO usa el prefijo /api en ninguna de sus rutas.
 * Todas las URLs deben ir directamente al backend sin prefijo.
 * 
 * Lógica:
 * - En desarrollo (DEV): usa el proxy de Vite '/api' configurado en vite.config.js
 *   que elimina el prefijo antes de enviarlo al backend, o directamente VITE_API_URL
 * - En producción: SIEMPRE usar VITE_API_URL apuntando directamente al backend
 * 
 * Opciones de despliegue:
 * 1. Mismo servidor: VITE_API_URL=http://148.230.87.167:8080 (recomendado)
 * 2. Subdominio: VITE_API_URL=https://api.midominio.com
 * 
 * Desarrollo actual: http://148.230.87.167:8080 (configurado en .env.development)
 * Producción: http://148.230.87.167:8080 (configurado en .env.production)
 */
const getBaseURL = () => {
  // Priorizar VITE_API_URL si está definida (desarrollo o producción)
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.trim() !== "") {
    return apiUrl;
  }
  
  // Si no hay VITE_API_URL definida:
  // - En desarrollo: usa el proxy de Vite '/api' que elimina el prefijo
  // - En producción: ERROR - debe definirse VITE_API_URL
  if (import.meta.env.PROD) {
    console.error("❌ ERROR: VITE_API_URL no está definida en producción. El backend NO usa el prefijo /api.");
    console.error("Por favor, crea .env.production con: VITE_API_URL=http://148.230.87.167:8080");
  }
  return "/api"; // Fallback solo para desarrollo
};

export const API_BASE = getBaseURL();

// Log para debugging en desarrollo
if (import.meta.env.DEV) {
  console.log("🔧 API_BASE configurado:", API_BASE);
  console.log("🔧 VITE_API_URL:", import.meta.env.VITE_API_URL);
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
    console.error("🚨 Error de API interceptado:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Log detallado del error del backend
    if (error.response?.data) {
      console.error("📋 Detalles del error del backend:", JSON.stringify(error.response.data, null, 2));
    }
    
    return Promise.reject(error);
  }
);