// src/services/ReembolsosIngresoService.js
import { api } from "../lib/api.js";

const ReembolsosIngresoService = {
  // GET /api/reembolsos-ingreso
  // @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
  listarReembolsos: async (params = {}) => {
    try {
      const { data } = await api.get("reembolsos-ingreso", { params });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error listando reembolsos de ingreso:", error);
      throw error;
    }
  },

  // GET /api/reembolsos-ingreso/{id}
  obtenerReembolso: async (id) => {
    try {
      const { data } = await api.get(`reembolsos-ingreso/${id}`);
      return data;
    } catch (error) {
      console.error(`Error obteniendo reembolso ${id}:`, error);
      throw error;
    }
  },

  // GET /api/reembolsos-ingreso/ingreso/{ingresoId}
  obtenerReembolsosPorIngreso: async (ingresoId) => {
    try {
      const { data } = await api.get(`reembolsos-ingreso/ingreso/${ingresoId}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error obteniendo reembolsos del ingreso ${ingresoId}:`, error);
      throw error;
    }
  },

  // POST /api/reembolsos-ingreso
  crearReembolso: async (reembolsoData) => {
    try {
      const { data } = await api.post("reembolsos-ingreso", reembolsoData);
      return data;
    } catch (error) {
      console.error("Error creando reembolso de ingreso:", error);
      throw error;
    }
  },

  // PUT /api/reembolsos-ingreso/{id}
  // Nota: El backend no soporta PUT, por lo que actualizamos eliminando y recreando
  actualizarReembolso: async (id, reembolsoData) => {
    try {
      // Primero eliminar el reembolso existente
      await api.delete(`reembolsos-ingreso/${id}`);
      // Luego crear uno nuevo con los datos actualizados
      const { data } = await api.post("reembolsos-ingreso", reembolsoData);
      return data;
    } catch (error) {
      console.error(`Error actualizando reembolso ${id}:`, error);
      throw error;
    }
  },

  // PUT /api/reembolsos-ingreso/{id}/procesar
  procesarReembolso: async (id) => {
    try {
      const { data } = await api.put(`reembolsos-ingreso/${id}/procesar`);
      return data;
    } catch (error) {
      console.error(`Error procesando reembolso ${id}:`, error);
      throw error;
    }
  },

  // PUT /api/reembolsos-ingreso/{id}/anular
  anularReembolso: async (id) => {
    try {
      const { data } = await api.put(`reembolsos-ingreso/${id}/anular`);
      return data;
    } catch (error) {
      console.error(`Error anulando reembolso ${id}:`, error);
      throw error;
    }
  },

  // DELETE /api/reembolsos-ingreso/{id}
  eliminarReembolso: async (id) => {
    try {
      const { data } = await api.delete(`reembolsos-ingreso/${id}`);
      return data;
    } catch (error) {
      console.error(`Error eliminando reembolso ${id}:`, error);
      throw error;
    }
  }
};

export default ReembolsosIngresoService;

