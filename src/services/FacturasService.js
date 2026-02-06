// src/services/FacturasService.js
import { api } from "../lib/api";

export async function listarFacturas() {
  const { data } = await api.get("facturas");
  return Array.isArray(data) ? data : [];
}

// @param {Object} params - Parámetros de consulta (puede incluir sedeId, page, size para filtrar por sede y paginación)
export async function listarFacturasTabla(params = {}) {
  const { data } = await api.get("facturas/tabla", { params });
  // Si el backend retorna un objeto paginado (con 'content'), retornarlo tal cual
  // Si retorna un array, retornarlo como array
  if (data && typeof data === 'object' && 'content' in data) {
    return data; // Retornar objeto paginado completo
  }
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
  // Incluir retencionIca si está presente (opcional)
  const facturaData = {
    ...factura,
    ...(factura.retencionIca !== undefined && factura.retencionIca !== null 
      ? { retencionIca: parseFloat(factura.retencionIca) } 
      : {})
  };
  
  const { data } = await api.post("facturas", facturaData);
  return data;
}

export async function actualizarFactura(id, factura) {
  // Incluir retencionIca si está presente
  const facturaData = {
    ...factura,
    ...(factura.retencionIca !== undefined && factura.retencionIca !== null 
      ? { retencionIca: parseFloat(factura.retencionIca) } 
      : {})
  };
  
  const { data } = await api.put(`facturas/${id}`, facturaData);
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
