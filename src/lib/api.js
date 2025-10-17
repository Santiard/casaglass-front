import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: false, // ponlo en true si usarás cookies de sesión
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