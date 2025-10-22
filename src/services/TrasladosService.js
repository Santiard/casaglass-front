// src/services/TrasladosService.js
import { api } from "../lib/api.js";

const base = "/traslados";

/* ========= CABECERA ========= */

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
  console.log("🔄 Creando traslado con payload:", payload);
  console.log("🔄 URL completa:", `${api.defaults.baseURL}/traslados`);
  
  try {
    const { data } = await api.post("/traslados", payload);
    console.log("✅ Traslado creado exitosamente:", data);
    return data;
  } catch (error) {
    console.error("❌ Error completo al crear traslado:", {
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
