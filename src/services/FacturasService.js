// src/services/FacturasService.js
import { api } from "../lib/api";

export async function listarFacturas() {
  const { data } = await api.get("facturas");
  return Array.isArray(data) ? data : [];
}

// @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
export async function listarFacturasTabla(params = {}) {
  const { data } = await api.get("facturas/tabla", { params });
  return Array.isArray(data) ? data : [];
}

export async function obtenerCantidadFacturas() {
  const facturas = await listarFacturas();
  return facturas.length;
}

export async function obtenerNumeroFacturaSiguiente() {
  const cantidad = await obtenerCantidadFacturas();
  return `F-${cantidad + 1}`;
}

export async function listarFacturasPorCliente(clienteId) {
  const { data } = await api.get(`facturas/cliente/${clienteId}`);
  return Array.isArray(data) ? data : [];
}

export async function obtenerFactura(id) {
  const { data } = await api.get(`facturas/${id}`);
  return data;
}

export async function obtenerFacturaPorNumero(numeroFactura) {
  const { data } = await api.get(`facturas/numero/${numeroFactura}`);
  return data;
}

export async function obtenerFacturaPorOrden(ordenId) {
  const { data } = await api.get(`facturas/orden/${ordenId}`);
  return data;
}

export async function listarFacturasPorEstado(estado) {
  const { data } = await api.get(`facturas/estado/${estado}`);
  return Array.isArray(data) ? data : [];
}

export async function listarFacturasPorFecha(fecha) {
  const { data } = await api.get(`facturas/fecha/${fecha}`);
  return Array.isArray(data) ? data : [];
}

export async function listarFacturasPorRangoFechas(desde, hasta) {
  const { data } = await api.get(`facturas/fecha?desde=${desde}&hasta=${hasta}`);
  return Array.isArray(data) ? data : [];
}

export async function crearFactura(factura) {
  const { data } = await api.post("facturas", factura);
  return data;
}

export async function actualizarFactura(id, factura) {
  const { data } = await api.put(`facturas/${id}`, factura);
  return data;
}

export async function marcarFacturaComoPagada(id, fechaPago) {
  const { data } = await api.put(`facturas/${id}/pagar`, { fechaPago });
  return data;
}

export async function anularFactura(id) {
  const { data } = await api.put(`facturas/${id}/anular`);
  return data;
}

export async function eliminarFactura(id) {
  await api.delete(`facturas/${id}`);
  return true;
}
