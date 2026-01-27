/**
 * Unir dos cortes en inventario para reconstruir una barra completa (600cm)
 * POST /api/cortes/unir
 * @param {Object} params - { corteId1, corteId2, sedeId }
 * @returns {Promise<Object>} Respuesta del backend
 */
export async function unirCortes({ corteId1, corteId2, sedeId }) {
  if (!corteId1 || !corteId2 || !sedeId) {
    throw new Error("Se requieren corteId1, corteId2 y sedeId para unir cortes");
  }
  try {
    const { data } = await api.post("/cortes/unir", { corteId1, corteId2, sedeId });
    return data;
  } catch (error) {
    // Manejo de error: devolver mensaje del backend si existe
    const msg = error?.response?.data?.message || error.message || "Error al unir cortes";
    throw new Error(msg);
  }
}
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
    // Error en crearCorte
    // Response data
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
    // Error en actualizarCorte
    // Response data
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
    // Error en eliminarCorte
    // Response data
    throw error;
  }
}