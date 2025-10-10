// src/services/TrasladosService.js
import { api } from "../lib/api.js";

const base = "/traslados";

/* ========= CABECERA ========= */

export async function listarTraslados(params = {}) {
  const { data } = await api.get(base, { params });
  return data;
}

export async function obtenerTraslado(id) {
  const { data } = await api.get(`${base}/${id}`);
  return data;
}

export async function crearTraslado(payload) {
  const { data } = await api.post(base, payload);
  return data;
}

export async function actualizarCabecera(id, payload) {
  const { data } = await api.put(`${base}/${id}`, payload);
  return data;
}

export async function eliminarTraslado(id) {
  await api.delete(`${base}/${id}`);
}

export async function confirmarTraslado(id, trabajadorId) {
  const { data } = await api.post(`${base}/${id}/confirmar`, null, {
    params: { trabajadorId },
  });
  return data;
}

/* ========= DETALLES (anidados) ========= */

export async function listarDetalles(trasladoId) {
  const { data } = await api.get(`${base}/${trasladoId}/detalles`);
  return data;
}

export async function agregarDetalle(trasladoId, payload) {
  const { data } = await api.post(`${base}/${trasladoId}/detalles`, payload);
  return data;
}

export async function actualizarDetalle(trasladoId, detalleId, payload) {
  const { data } = await api.put(
    `${base}/${trasladoId}/detalles/${detalleId}`,
    payload
  );
  return data;
}

export async function eliminarDetalle(trasladoId, detalleId) {
  await api.delete(`${base}/${trasladoId}/detalles/${detalleId}`);
}

/* ========= UTILIDAD OPCIONAL ========= */
export function toLocalDateStringOnly(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return date;
  return d.toISOString().substring(0, 10);
}
