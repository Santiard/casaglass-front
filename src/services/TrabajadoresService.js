// src/services/TrabajadoresService.js
import { api } from "../lib/api";

/** Lista de todos los trabajadores (con filtros opcionales) */
export async function listarTrabajadores(params = {}) {
  const { data } = await api.get("/trabajadores", { params });
  return Array.isArray(data) ? data : [];
}

/** Obtener trabajador por ID */
export async function obtenerTrabajador(id) {
  const { data } = await api.get(`/trabajadores/${id}`);
  return data;
}
