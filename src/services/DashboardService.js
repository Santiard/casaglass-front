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
    const mapTraslado = (traslado, tipo, referencia, direccion) => {
      // Si el backend ya envía los campos, usarlos; si no, calcularlos
      let totalVidrio = traslado.totalProductosVidrio ?? 0;
      let totalOtros = traslado.totalProductosOtros ?? 0;
      if ((totalVidrio === 0 && totalOtros === 0) && Array.isArray(traslado.detalles)) {
        traslado.detalles.forEach(det => {
          const esVidrio = (det.producto?.categoria || '').toLowerCase() === 'vidrio' || det.producto?.esVidrio;
          if (esVidrio) {
            totalVidrio += Number(det.cantidad) || 0;
          } else {
            totalOtros += Number(det.cantidad) || 0;
          }
        });
      }
      return {
        id: `${direccion[0]}-${traslado.trasladoId}`,
        tipo,
        referencia,
        fechaEntrega: traslado.fecha,
        estado: 'PENDIENTE',
        totalProductosVidrio: totalVidrio,
        totalProductosOtros: totalOtros,
        trasladoId: traslado.trasladoId,
        direccion
      };
    };
    const trasladosFormateados = [
      ...trasladosRecibir.map(traslado => mapTraslado(traslado, 'RECEPCIÓN', `De ${traslado.sedeOrigen}`, 'ENTRADA')),
      ...trasladosEnviar.map(traslado => mapTraslado(traslado, 'ENVÍO', `A ${traslado.sedeDestino}`, 'SALIDA')),
    ];
    return trasladosFormateados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
  },

  async getDashboardCompleto(desde = null, hasta = null) {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await api.get('dashboard/completo', { params });
    return data;
  },

  async getDashboardTrabajador(trabajadorId, desde = null, hasta = null) {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await api.get(`trabajadores/${trabajadorId}/dashboard`, { params });
    return data;
  },
};


