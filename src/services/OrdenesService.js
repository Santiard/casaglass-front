import { api } from "../lib/api";

/* ================================================
   📦 ÓRDENES - CRUD PRINCIPAL
   ================================================ */

// GET /api/ordenes/tabla → datos optimizados
export async function listarOrdenesTabla(params = {}) {
  const { data } = await api.get("/ordenes/tabla", { params });
  return data || [];
}

// GET /api/ordenes/{id}
export async function obtenerOrden(id) {
  const { data } = await api.get(`/ordenes/${id}`);
  return data;
}

// POST /api/ordenes
export async function crearOrden(payload) {
  const { data } = await api.post("/ordenes", payload);
  return data;
}

// ✅ PUT /api/ordenes/tabla/{id} (endpoint correcto del backend)
export async function actualizarOrden(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  const { data } = await api.put(`/ordenes/tabla/${id}`, payload);
  return data;
}

// DELETE /api/ordenes/{id}
export async function eliminarOrden(id) {
  await api.delete(`/ordenes/${id}`);
  return true;
}

// GET /api/ordenes/proximo-numero
export async function obtenerProximoNumero() {
  const { data } = await api.get("/ordenes/proximo-numero");
  return data;
}

/* ================================================
   🧩 ÍTEMS DE ORDEN
   ================================================ */
export async function listarItems(ordenId) {
  const { data } = await api.get(`/ordenes/${ordenId}/items`);
  return data || [];
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
  return true;
}
