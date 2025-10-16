// src/services/OrdenesService.js
import { api } from "../lib/api";

// === ÓRDENES ===

// GET /api/ordenes?clienteId=&sedeId=&venta=&credito=
export async function listarOrdenes(params = {}) {
  const { data } = await api.get("/ordenes", { params });
  return data;
}

// GET /api/ordenes/tabla - Obtener datos optimizados para la tabla
export async function listarOrdenesTabla(params = {}) {
  const { data } = await api.get("/ordenes/tabla", { params });
  return data;
}

export async function obtenerOrden(id) {
  const { data } = await api.get(`/ordenes/${id}`);
  return data;
}

export async function crearOrden(payload) {
  const { data } = await api.post("/ordenes", payload);
  return data;
}

export async function actualizarOrden(id, payload) {
  const { data } = await api.put(`/ordenes/${id}`, payload);
  return data;
}

export async function eliminarOrden(id) {
  await api.delete(`/ordenes/${id}`);
}

export async function obtenerProximoNumero() {
  const { data } = await api.get("/ordenes/proximo-numero");
  return data;
}

// === ÍTEMS ===

export async function listarItems(ordenId) {
  const { data } = await api.get(`/ordenes/${ordenId}/items`);
  return data;
}

export async function crearItem(ordenId, item) {
  const { data } = await api.post(`/ordenes/${ordenId}/items`, item);
  return data;
}

export async function actualizarItem(ordenId, itemId, item) {
  const { data } = await api.put(`/ordenes/${ordenId}/items/${itemId}`, item);
  return data;
}

export async function eliminarItem(ordenId, itemId) {
  await api.delete(`/ordenes/${ordenId}/items/${itemId}`);
}
