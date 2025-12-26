import { api } from '../lib/api';

const EntregasService = {
  // Listar todas las entregas con filtros opcionales
  obtenerEntregas: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filtros.sedeId) params.append('sedeId', filtros.sedeId);
      if (filtros.empleadoId) params.append('empleadoId', filtros.empleadoId);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);

      const queryString = params.toString();
      const url = queryString ? `entregas-dinero?${queryString}` : 'entregas-dinero';
      
      const response = await api.get(url);
      
      // Manejar diferentes estructuras de respuesta
      if (response.data && typeof response.data === 'object') {
        // Si viene como {value: [...], Count: number}
        if (Array.isArray(response.data.value)) {
          return response.data.value;
        }
        // Si viene como array directo
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      
      // Fallback a array vacío
      return [];
    } catch (error) {
      // Error obteniendo entregas
        // Error response data
        // Error response status
        // Error response headers
      throw error;
    }
  },

  // Obtener una entrega específica por ID
  obtenerEntregaPorId: async (id) => {
    try {
      const response = await api.get(`entregas-dinero/${id}`);
      return response.data;
    } catch (error) {
      // Error obteniendo entrega
      throw error;
    }
  },

  // Obtener entregas por sede
  obtenerEntregasPorSede: async (sedeId) => {
    try {
      const response = await api.get(`entregas-dinero/sede/${sedeId}`);
      return response.data;
    } catch (error) {
      // Error obteniendo entregas de sede
      throw error;
    }
  },

  // Obtener entregas con diferencias (para auditoría)
  obtenerEntregasConDiferencias: async () => {
    try {
      const response = await api.get('entregas-dinero/con-diferencias');
      return response.data;
    } catch (error) {
      // Error obteniendo entregas con diferencias
      throw error;
    }
  },

  // Obtener órdenes disponibles para entrega
  obtenerOrdenesDisponibles: async (sedeId, fechaDesde, fechaHasta) => {
    try {
      const params = new URLSearchParams({
        sedeId: sedeId,
        desde: fechaDesde,
        hasta: fechaHasta
      });
      
      const response = await api.get(`entregas-dinero/ordenes-disponibles?${params}`);
      return response.data;
    } catch (error) {
      // Error obteniendo órdenes disponibles
      throw error;
    }
  },

  // Crear nueva entrega
  crearEntrega: async (entregaData) => {
    try {
      // DEBUG: Ver exactamente qué se está enviando
      // EntregasService.crearEntrega - Payload enviado
      
      const response = await api.post('entregas-dinero', entregaData);
      
      // DEBUG: Ver qué retorna el backend
      // EntregasService.crearEntrega - Respuesta del backend
      
      return response.data;
    } catch (error) {
      // Error creando entrega
      // Error response data
      // Error response status
      // Error response headers
      throw error;
    }
  },

  // Actualizar entrega (para guardar desgloses antes de confirmar)
  actualizarEntrega: async (id, entregaData) => {
    try {
      const response = await api.put(`entregas-dinero/${id}`, entregaData);
      return response.data;
    } catch (error) {
      // Error actualizando entrega
      throw error;
    }
  },

  // Confirmar entrega (modelo simplificado: solo cambia el estado, sin montoEntregado ni observaciones)
  confirmarEntrega: async (id) => {
    try {
      const response = await api.put(`entregas-dinero/${id}/confirmar`);
      return response.data;
    } catch (error) {
      // Error confirmando entrega
      throw error;
    }
  },

  // Cancelar entrega
  cancelarEntrega: async (id, motivo) => {
    try {
      const params = new URLSearchParams({
        motivo: motivo
      });
      
      const response = await api.put(`entregas-dinero/${id}/cancelar?${params}`);
      return response.data;
    } catch (error) {
      // Error cancelando entrega
      throw error;
    }
  },

  // Eliminar entrega
  eliminarEntrega: async (id) => {
    try {
      const response = await api.delete(`entregas-dinero/${id}`);
      return response.data;
    } catch (error) {
      // Error eliminando entrega
      throw error;
    }
  },

  // Reportes y totales
  obtenerTotalEntregadoPorSede: async (sedeId, fechaDesde, fechaHasta) => {
    try {
      const params = new URLSearchParams({
        desde: fechaDesde,
        hasta: fechaHasta
      });
      
      const response = await api.get(`entregas-dinero/sede/${sedeId}/total-entregado?${params}`);
      return response.data;
    } catch (error) {
      // Error obteniendo total entregado
      throw error;
    }
  },

  // obtenerTotalGastosPorSede eliminado - ya no se usan gastos en entregas

  obtenerResumenPorEmpleado: async (sedeId, fechaDesde, fechaHasta) => {
    try {
      const params = new URLSearchParams({
        sedeId: sedeId,
        desde: fechaDesde,
        hasta: fechaHasta
      });
      
      const response = await api.get(`entregas-dinero/resumen/empleado?${params}`);
      return response.data;
    } catch (error) {
      // Error obteniendo resumen por empleado
      throw error;
    }
  },

  // Obtener el siguiente número de comprobante para una entrega
  obtenerSiguienteNumeroComprobante: async () => {
    try {
      // Obtener todas las entregas para encontrar la última
      const response = await api.get('entregas-dinero');
      
      // Manejar diferentes estructuras de respuesta
      let entregas = [];
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.value)) {
          entregas = response.data.value;
        } else if (Array.isArray(response.data)) {
          entregas = response.data;
        }
      }
      
      if (!Array.isArray(entregas) || entregas.length === 0) {
        // Si no hay entregas, empezar con ENT-1
        return 'ENT-1';
      }
      
      // Encontrar el ID más alto
      const maxId = Math.max(...entregas.map(e => Number(e.id) || 0));
      
      // Calcular el siguiente número
      const siguienteNumero = maxId + 1;
      
      return `ENT-${siguienteNumero}`;
    } catch (error) {
      // Error obteniendo siguiente número de comprobante
      // En caso de error, retornar un número basado en timestamp como fallback
      return `ENT-${Date.now()}`;
    }
  }
};

export default EntregasService;