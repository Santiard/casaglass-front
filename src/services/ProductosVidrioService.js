// src/services/ProductosVidrioService.js
import {api} from "../lib/api";

/** Productos de vidrio (tienen mm, m1m2, laminas) */
export async function listarProductosVidrio({ q, mm, laminas } = {}) {
  const params = {};
  if (q) params.q = q;
  if (mm != null) params.mm = mm;
  if (laminas != null) params.laminas = laminas;
  const { data } = await api.get("/productos-vidrio", { params });
  return data;
}

export async function crearProductoVidrio(payload) {
  const { data } = await api.post("/productos-vidrio", payload);
  return data;
}

export async function actualizarProductoVidrio(id, payload) {
  const { data } = await api.put(`/productos-vidrio/${id}`, payload);
  return data;
}

export async function eliminarProductoVidrio(id) {
  await api.delete(`/productos-vidrio/${id}`);
}
