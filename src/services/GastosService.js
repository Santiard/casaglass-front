import { api } from '../lib/api';

const GastosService = {
  // Listar todos los gastos
  obtenerGastos: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filtros.sedeId) params.append('sedeId', filtros.sedeId);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);
      if (filtros.aprobado !== undefined) params.append('aprobado', filtros.aprobado);

      const queryString = params.toString();
      const url = queryString ? `gastos-sede?${queryString}` : 'gastos-sede';
      
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error obteniendo gastos:', error);
      throw error;
    }
  },

  // Obtener un gasto por ID
  obtenerGastoPorId: async (id) => {
    try {
      const response = await api.get(`gastos-sede/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo gasto ${id}:`, error);
      throw error;
    }
  },

  // Obtener gastos de una sede
  obtenerGastosPorSede: async (sedeId) => {
    try {
      const response = await api.get(`gastos-sede/sede/${sedeId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error obteniendo gastos de sede ${sedeId}:`, error);
      throw error;
    }
  },

  // Obtener gastos disponibles (sin entrega asociada)
  obtenerGastosDisponibles: async (sedeId) => {
    try {
      const response = await api.get(`gastos-sede/sede/${sedeId}/sin-entrega`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error obteniendo gastos disponibles para sede ${sedeId}:`, error);
      throw error;
    }
  },

  // Crear un nuevo gasto
  crearGasto: async (gastoData) => {
    try {
      const response = await api.post('gastos-sede', gastoData);
      return response.data;
    } catch (error) {
      console.error('Error creando gasto:', error);
      throw error;
    }
  },

  // Actualizar un gasto
  actualizarGasto: async (id, gastoData) => {
    try {
      const response = await api.put(`gastos-sede/${id}`, gastoData);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando gasto ${id}:`, error);
      throw error;
    }
  },

  // Eliminar un gasto
  eliminarGasto: async (id) => {
    try {
      const response = await api.delete(`gastos-sede/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error eliminando gasto ${id}:`, error);
      throw error;
    }
  }
};

export default GastosService;

