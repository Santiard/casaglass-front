// src/services/TrabajadoresService.js
import { api } from "../lib/api";

/** Lista de todos los trabajadores (con filtros opcionales) */
export async function listarTrabajadores(params = {}) {
  const { data } = await api.get("trabajadores", { params });
  return Array.isArray(data) ? data : [];
}

/** Obtener trabajador por ID */
export async function obtenerTrabajador(id) {
  const { data } = await api.get(`trabajadores/${id}`);
  return data;
}

/** Listado resumido para tabla: id, username, nombre, rol */
export async function listarTrabajadoresTabla(params = {}) {
  const { data } = await api.get("trabajadores/tabla", { params });
  return Array.isArray(data) ? data : [];
}

/** Cambiar contraseña de un trabajador */
export async function cambiarPasswordTrabajador(id, password) {
  const { data } = await api.put(`trabajadores/${id}/password`, { password });
  return data;
}

/** Crear trabajador */
export async function crearTrabajador(payload) {
  // payload: { nombre, correo, username, password, rol, sede: { id } }
  const { data } = await api.post("trabajadores", payload);
  return data;
}