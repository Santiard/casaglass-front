import { api } from '../lib/api.js';

export const DashboardService = {
  async getDashboardData(sedeId) {
    // Legacy support for HomePage widgets
    const { data } = await api.get(`sedes/${sedeId}/dashboard`);
    const { sede, ventasHoy, faltanteEntrega, creditosPendientes, trasladosPendientes, alertasStock } = data || {};
    return {
      sede: sede || {},
      ventasHoy: ventasHoy || {},
      faltanteEntrega: faltanteEntrega || {},
      creditosPendientes: creditosPendientes || {},
      trasladosPendientes: trasladosPendientes || { totalPendientes: 0, trasladosRecibir: [], trasladosEnviar: [] },
      alertasStock: alertasStock || { total: 0, productosBajos: [] },
    };
  },
  async getResumen(sedeId, desde, hasta) {
    const { data } = await api.get('dashboard/resumen', { params: { sedeId, desde, hasta } });
    return data;
  },

  async getVentasPorDia(sedeId, desde, hasta) {
    const { data } = await api.get('dashboard/ventas-por-dia', { params: { sedeId, desde, hasta } });
    return data;
  },

  async getVentasPorSede(desde, hasta) {
    const { data } = await api.get('dashboard/ventas-por-sede', { params: { desde, hasta } });
    return data;
  },

  async getTopProductos(sedeId, desde, hasta, limite = 5) {
    const { data } = await api.get('dashboard/top-productos', { params: { sedeId, desde, hasta, limite } });
    return data;
  },

  async getTopClientes(sedeId, desde, hasta, limite = 5) {
    const { data } = await api.get('dashboard/top-clientes', { params: { sedeId, desde, hasta, limite } });
    return data;
  },

  async getCreditosResumen(sedeId, desde, hasta) {
    const { data } = await api.get('dashboard/creditos-resumen', { params: { sedeId, desde, hasta } });
    return data;
  },

  async getFacturacionEstado(sedeId, desde, hasta) {
    const { data } = await api.get('dashboard/facturacion-estado', { params: { sedeId, desde, hasta } });
    return data;
  },

  async getTicketPromedioPorSede(desde, hasta) {
    const { data } = await api.get('dashboard/ticket-promedio-por-sede', { params: { desde, hasta } });
    return data;
  },

  formatTrasladosForPanel(trasladosPendientes) {
    if (!trasladosPendientes) return [];
    const { trasladosRecibir = [], trasladosEnviar = [] } = trasladosPendientes;
    const trasladosFormateados = [
      ...trasladosRecibir.map(traslado => ({ id: `R-${traslado.trasladoId}`, tipo: 'RECEPCIÓN', referencia: `De ${traslado.sedeOrigen}`, fechaEntrega: traslado.fecha, estado: 'PENDIENTE', totalProductos: traslado.totalProductos, trasladoId: traslado.trasladoId, direccion: 'ENTRADA' })),
      ...trasladosEnviar.map(traslado => ({ id: `E-${traslado.trasladoId}`, tipo: 'ENVÍO', referencia: `A ${traslado.sedeDestino}`, fechaEntrega: traslado.fecha, estado: 'PENDIENTE', totalProductos: traslado.totalProductos, trasladoId: traslado.trasladoId, direccion: 'SALIDA' })),
    ];
    return trasladosFormateados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
  },
};


