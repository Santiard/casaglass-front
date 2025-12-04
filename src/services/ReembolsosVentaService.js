// src/services/ReembolsosVentaService.js
import { api } from "../lib/api.js";

const ReembolsosVentaService = {
  // GET /api/reembolsos-venta
  // @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
  listarReembolsos: async (params = {}) => {
    try {
      const { data } = await api.get("reembolsos-venta", { params });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error listando reembolsos de venta:", error);
      throw error;
    }
  },

  // GET /api/reembolsos-venta/{id}
  obtenerReembolso: async (id) => {
    try {
      const { data } = await api.get(`reembolsos-venta/${id}`);
      return data;
    } catch (error) {
      console.error(`Error obteniendo reembolso ${id}:`, error);
      throw error;
    }
  },

  // GET /api/reembolsos-venta/orden/{ordenId}
  obtenerReembolsosPorOrden: async (ordenId) => {
    try {
      const { data } = await api.get(`reembolsos-venta/orden/${ordenId}`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error obteniendo reembolsos de la orden ${ordenId}:`, error);
      throw error;
    }
  },

  // POST /api/reembolsos-venta
  crearReembolso: async (reembolsoData) => {
    try {
      const { data } = await api.post("reembolsos-venta", reembolsoData);
      return data;
    } catch (error) {
      console.error("Error creando reembolso de venta:", error);
      throw error;
    }
  },

  // PUT /api/reembolsos-venta/{id}/procesar
  procesarReembolso: async (id) => {
    try {
      const { data } = await api.put(`reembolsos-venta/${id}/procesar`);
      return data;
    } catch (error) {
      console.error(`Error procesando reembolso ${id}:`, error);
      throw error;
    }
  },

  // PUT /api/reembolsos-venta/{id}/anular
  anularReembolso: async (id) => {
    try {
      const { data } = await api.put(`reembolsos-venta/${id}/anular`);
      return data;
    } catch (error) {
      console.error(`Error anulando reembolso ${id}:`, error);
      throw error;
    }
  },

  // DELETE /api/reembolsos-venta/{id}
  eliminarReembolso: async (id) => {
    try {
      const { data } = await api.delete(`reembolsos-venta/${id}`);
      return data;
    } catch (error) {
      console.error(`Error eliminando reembolso ${id}:`, error);
      throw error;
    }
  }
};

export default ReembolsosVentaService;

