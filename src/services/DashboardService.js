import { api } from '../lib/api.js';

export const DashboardService = {
  // Obtener datos del dashboard para una sede específica
  getDashboardData: async (sedeId) => {
    try {
      console.log('📊 Fetching dashboard data for sede:', sedeId);
      
      const response = await api.get(`sedes/${sedeId}/dashboard`);
      
      console.log('✅ Dashboard data loaded successfully:', response.data);
      
      // Validar estructura de respuesta
      if (!response.data) {
        throw new Error('No data received from dashboard endpoint');
      }

      const { 
        sede, 
        ventasHoy, 
        faltanteEntrega, 
        creditosPendientes, 
        trasladosPendientes, 
        alertasStock 
      } = response.data;

      // Normalizar datos para mantener compatibilidad con componentes existentes
      return {
        sede: sede || {},
        ventasHoy: ventasHoy || {},
        faltanteEntrega: faltanteEntrega || {},
        creditosPendientes: creditosPendientes || {},
        trasladosPendientes: trasladosPendientes || {
          totalPendientes: 0,
          trasladosRecibir: [],
          trasladosEnviar: []
        },
        alertasStock: alertasStock || { total: 0, productosBajos: [] }
      };
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        switch (error.response.status) {
          case 404:
            throw new Error(`Sede ${sedeId} no encontrada`);
          case 403:
            throw new Error('No tienes permisos para acceder a esta sede');
          case 500:
            throw new Error('Error interno del servidor');
          default:
            throw new Error(`Error ${error.response.status}: ${error.response.statusText}`);
        }
      } else if (error.request) {
        throw new Error('Sin respuesta del servidor. Verifica tu conexión');
      } else {
        throw new Error(`Error: ${error.message}`);
      }
    }
  },

  // Función auxiliar para formatear traslados para el componente MovimientosPanel
  formatTrasladosForPanel: (trasladosPendientes) => {
    if (!trasladosPendientes) return [];
    
    const { trasladosRecibir = [], trasladosEnviar = [] } = trasladosPendientes;
    
    // Combinar traslados y formatear para compatibilidad con MovimientosPanel
    const trasladosFormateados = [
      ...trasladosRecibir.map(traslado => ({
        id: `R-${traslado.trasladoId}`,
        tipo: 'RECEPCIÓN',
        referencia: `De ${traslado.sedeOrigen}`,
        fechaEntrega: traslado.fecha,
        estado: 'PENDIENTE',
        totalProductos: traslado.totalProductos,
        trasladoId: traslado.trasladoId,
        direccion: 'ENTRADA'
      })),
      ...trasladosEnviar.map(traslado => ({
        id: `E-${traslado.trasladoId}`,
        tipo: 'ENVÍO',
        referencia: `A ${traslado.sedeDestino}`,
        fechaEntrega: traslado.fecha,
        estado: 'PENDIENTE',
        totalProductos: traslado.totalProductos,
        trasladoId: traslado.trasladoId,
        direccion: 'SALIDA'
      }))
    ];

    return trasladosFormateados.sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega));
  }
};