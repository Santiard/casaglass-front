// src/services/CortesService.js
import { api } from "../lib/api";

const base = "/cortes";

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
    const msg = error?.response?.data?.message || error.message || "Error al unir cortes";
    throw new Error(msg);
  }
}

/**
 * Listar todos los cortes
 * GET /api/cortes
 */
export async function listarCortes(params = {}) {
  const { data } = await api.get(base, { params });
  return data;
}

/**
 * Un corte por id (PK en BD). GET /api/cortes/{id}
 * Útil tras crear un corte o cuando el traslado guardó producto.id = corteBdId.
 */
export async function obtenerCortePorId(id) {
  const nid = Number(id);
  if (!Number.isFinite(nid) || nid <= 0) {
    throw new Error("Id de corte inválido");
  }
  const { data } = await api.get(`${base}/${nid}`);
  return data;
}

/**
 * Resolver o crear Corte desde perfil entero (traslado Insula → 2/3).
 * POST /api/cortes/resolver-para-traslado
 * Cuerpo: { productoPerfilId, medidaCm } — el back carga categoría/color desde BD.
 * @returns {Promise<Object>} Respuesta del servidor (incluye id del Corte).
 */
export async function resolverCorteParaTraslado({ productoPerfilId, medidaCm }) {
  const pid = Number(productoPerfilId);
  const med = Number(medidaCm);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new Error("productoPerfilId inválido");
  }
  if (!Number.isFinite(med) || med <= 0) {
    throw new Error("medidaCm inválida");
  }
  const { data } = await api.post(`${base}/resolver-para-traslado`, {
    productoPerfilId: pid,
    medidaCm: med,
  });
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

/**
 * Actualizar corte incluyendo inventario por sede
 * PUT /api/cortes/{id}/completo
 */
export async function actualizarCorteCompleto(id, payload) {
  try {
    const { data } = await api.put(`${base}/${id}/completo`, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    throw error;
  }
}