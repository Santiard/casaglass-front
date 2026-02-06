// src/services/ProveedoresService.js
import { api } from "../lib/api.js";

/** GET /api/proveedores */
export async function listarProveedores() {
  const { data } = await api.get("proveedores");
  return data;
}

/** GET /api/proveedores/{id} */
export async function obtenerProveedor(id) {
  const { data } = await api.get(`proveedores/${id}`);
  return data;
}

/** POST /api/proveedores */
export async function crearProveedor(payload) {
  const { data } = await api.post("proveedores", payload);
  return data;
}

/** PUT /api/proveedores/{id} */
export async function actualizarProveedor(id, payload) {
  const { data } = await api.put(`proveedores/${id}`, payload);
  return data;
}

/** DELETE /api/proveedores/{id} */
export async function eliminarProveedor(id) {
  const { data } = await api.delete(`proveedores/${id}`);
  return data;
}