import { api } from '../lib/api.js';

export async function listarBancos() {
  const { data } = await api.get('/bancos');
  return Array.isArray(data) ? data : [];
}

export async function obtenerBanco(id) {
  const { data } = await api.get(`/bancos/${id}`);
  return data;
}

export async function crearBanco(banco) {
  const { data } = await api.post('/bancos', banco);
  return data;
}

export async function actualizarBanco(id, banco) {
  const { data } = await api.put(`/bancos/${id}`, banco);
  return data;
}

export async function eliminarBanco(id) {
  const { data } = await api.delete(`/bancos/${id}`);
  return data;
}
