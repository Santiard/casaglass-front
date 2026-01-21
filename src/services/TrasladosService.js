// src/services/TrasladosService.js
import { api } from "../lib/api.js";

const base = "/traslados";

/* ========= CABECERA ========= */

// @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
// Si sedeId se envía, retorna traslados donde el usuario esté en sedeOrigen o sedeDestino
export async function listarTraslados(params = {}) {
  const { data } = await api.get("/traslados-movimientos", { params });
  return data;
}

export async function obtenerTraslado(id) {
  const { data } = await api.get(`${base}/${id}`);
  return data;
}

/** payload:
 * {
 *   fecha: "YYYY-MM-DD",
 *   sedeOrigen: { id },
 *   sedeDestino: { id },
 *   detalles?: [{ producto:{id}, cantidad }]
 * }
 */
export async function crearTraslado(payload) {
  try {
    const { data } = await api.post("/traslados", payload);
    return data;
  } catch (error) {
    console.error(" Error completo al crear traslado:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw error;
  }
}

/** Actualiza SOLO cabecera */
export async function actualizarCabecera(id, payload) {
  const { data } = await api.put(`/traslados/${id}`, payload);
  return data;
}

export async function eliminarTraslado(id) {
  await api.delete(`/traslados/${id}`);
}

export async function confirmarTraslado(id, trabajadorId) {
  const { data } = await api.put(`/traslados-movimientos/${id}/confirmar`, {
    trabajadorId: trabajadorId
  });
  return data;
}

/* ========= DETALLES ========= */

export async function listarDetalles(trasladoId) {
  const { data } = await api.get(`${base}/${trasladoId}/detalles`);
  return data;
}

export async function agregarDetalle(trasladoId, payload) {
  const { data } = await api.post(`${base}/${trasladoId}/detalles`, payload);
  return data;
}

export async function actualizarDetalle(trasladoId, detalleId, payload) {
  const { data } = await api.put(`${base}/${trasladoId}/detalles/${detalleId}`, payload);
  return data;
}

export async function eliminarDetalle(trasladoId, detalleId) {
  await api.delete(`${base}/${trasladoId}/detalles/${detalleId}`);
}

/**
 * Actualiza múltiples detalles en una sola transacción atómica
 * @param {number} trasladoId - ID del traslado
 * @param {Object} payload - Objeto con arrays de cambios
 * @param {Array} payload.crear - Array de objetos { productoId, cantidad }
 * @param {Array} payload.actualizar - Array de objetos { detalleId, cantidad, productoId? }
 * @param {Array} payload.eliminar - Array de IDs de detalles a eliminar
 */
export async function actualizarDetallesBatch(trasladoId, payload) {
  const { data } = await api.put(`${base}/${trasladoId}/detalles/batch`, payload);
  return data;
}