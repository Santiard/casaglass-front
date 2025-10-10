// src/services/SedesService.js
import { api } from "../lib/api.js";

/* ================================================
   📦 CRUD y búsquedas para el recurso "Sede"
   ================================================ */

// 🔹 GET /api/sedes
export async function listarSedes(params = {}) {
  // params opcionales: { q, ciudad }
  const { data } = await api.get("/sedes", { params });
  return data || [];
}

// 🔹 GET /api/sedes/{id}
export async function obtenerSede(id) {
  const { data } = await api.get(`/sedes/${id}`);
  return data;
}

// 🔹 GET /api/sedes/nombre/{nombre}
export async function obtenerSedePorNombre(nombre) {
  const { data } = await api.get(`/sedes/nombre/${encodeURIComponent(nombre)}`);
  return data;
}

// 🔹 GET /api/sedes/{id}/trabajadores
export async function obtenerTrabajadoresDeSede(id) {
  const { data } = await api.get(`/sedes/${id}/trabajadores`);
  return data || [];
}

// 🔹 POST /api/sedes
export async function crearSede(payload) {
  // payload: { nombre, direccion?, ciudad? }
  const { data } = await api.post("/sedes", payload);
  return data;
}

// 🔹 PUT /api/sedes/{id}
export async function actualizarSede(id, payload) {
  const { data } = await api.put(`/sedes/${id}`, payload);
  return data;
}

// 🔹 DELETE /api/sedes/{id}
export async function eliminarSede(id) {
  await api.delete(`/sedes/${id}`);
}
