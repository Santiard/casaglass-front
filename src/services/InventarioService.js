// src/services/inventario.js
import { api } from "../lib/api";

/**
 * Obtiene inventario completo con productos y cantidades por sede unificado
 * GET /api/inventario-completo
 */
export async function listarInventarioCompleto(params = {}) {
  const { data } = await api.get("/inventario-completo", { params });
  return data;
}

/**
 * Obtiene inventario completo de cortes con cantidades por sede
 * GET /api/cortes-inventario-completo
 */
export async function listarCortesInventarioCompleto(params = {}) {
  const { data } = await api.get("/cortes-inventario-completo", { params });
  return data;
}

/**
 * Obtiene inventario agrupado por producto (con cantidades por sede)
 * GET /api/inventario/agrupado
 */
export async function listarInventarioAgrupado() {
  const { data } = await api.get("/inventario/agrupado");
  return data;
}

/**
 * Opcional: obtener inventario por sede
 * GET /api/inventario?sedeId={id}
 */
export async function listarInventarioPorSede(sedeId) {
  const { data } = await api.get(`/inventario?sedeId=${sedeId}`);
  return data;
}

/**
 * Opcional: actualizar cantidad en inventario
 * PUT /api/inventario/{id}
 */
export async function actualizarInventario(id, payload) {
  const { data } = await api.put(`/inventario/${id}`, payload);
  return data;
}
