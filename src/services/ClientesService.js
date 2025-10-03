import { api } from "../lib/api"; // el api.js que creamos antes

export async function listarClientes() {
  const { data } = await api.get("/clientes");
  // data es un array [{id, nit, nombre, ...}]
  return Array.isArray(data) ? data : [];
}

export async function crearCliente(cliente) {
  // cliente: { nit, nombre, direccion, telefono, ciudad, correo, credito: true|false }
  const { data } = await api.post("/clientes", cliente);
  return data;
}

export async function actualizarCliente(id, cliente) {
  const { data } = await api.put(`/clientes/${id}`, cliente);
  return data;
}

export async function eliminarCliente(id) {
  await api.delete(`/clientes/${id}`);
  return true;
}