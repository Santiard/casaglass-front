// src/services/CortesService.js
import { api } from "../lib/api";

const base = "/cortes";

/**
 * Listar todos los cortes
 * GET /api/cortes
 */
export async function listarCortes(params = {}) {
  const { data } = await api.get(base, { params });
  return data;
}

/**
 * Crear un nuevo corte
 * POST /api/cortes
 */
export async function crearCorte(payload) {
  try {
    const { data } = await api.post(base, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    console.error("Error en crearCorte:", error);
    console.error("Response data:", error.response?.data);
    throw error;
  }
}

/**
 * Actualizar un corte existente
 * PUT /api/cortes/{id}
 */
export async function actualizarCorte(id, payload) {
  try {
    const { data } = await api.put(`${base}/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    console.error("Error en actualizarCorte:", error);
    console.error("Response data:", error.response?.data);
    throw error;
  }
}

/**
 * Eliminar un corte
 * DELETE /api/cortes/{id}
 */
export async function eliminarCorte(id) {
  try {
    await api.delete(`${base}/${id}`);
  } catch (error) {
    console.error("Error en eliminarCorte:", error);
    console.error("Response data:", error.response?.data);
    throw error;
  }
}