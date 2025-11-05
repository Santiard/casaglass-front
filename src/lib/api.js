import axios from "axios";

/**
 * Configuración de la URL base de la API
 * 
 * Lógica:
 * - En desarrollo (DEV): usa el proxy de Vite '/api' configurado en vite.config.js
 *   o directamente VITE_API_URL si está definida en .env.development
 * - En producción: usa VITE_API_URL si está definida, sino '/api' (mismo dominio)
 * 
 * Opciones de despliegue:
 * 1. Subdominio: VITE_API_URL=https://api.midominio.com
 * 2. Mismo dominio: VITE_API_URL vacío o no definido → usa '/api'
 * 
 * Desarrollo actual: http://148.230.87.167:8080 (configurado en .env.development)
 */
const getBaseURL = () => {
  // Priorizar VITE_API_URL si está definida (desarrollo o producción)
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.trim() !== "") {
    return apiUrl;
  }
  
  // Si no hay VITE_API_URL definida:
  // - En desarrollo: usa el proxy de Vite '/api' configurado en vite.config.js
  // - En producción: usa '/api' (mismo dominio con proxy reverso)
  return "/api";
};

export const API_BASE = getBaseURL();

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
    return Promise.reject(error);
  }
);