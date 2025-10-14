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
  const { data } = await api.post("/traslados-movimientos", payload);
  return data;
}

/** Actualiza SOLO cabecera */
export async function actualizarCabecera(id, payload) {
  const { data } = await api.put(`/traslados-movimientos/${id}`, payload);
  return data;
}

export async function eliminarTraslado(id) {
  await api.delete(`/traslados-movimientos/${id}`);
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
