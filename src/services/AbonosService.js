import { api } from "../lib/api";

/**
 * Extraer todos los abonos de un array de créditos y aplanarlos
 * @param {Array} creditos - Array de créditos con sus abonos
 * @returns {Array} Array plano de todos los abonos con información del crédito y cliente
 */
function extraerAbonosDeCreditos(creditos) {
  const abonos = [];
  
  if (!Array.isArray(creditos)) return [];
  
  creditos.forEach(credito => {
    if (Array.isArray(credito.abonos) && credito.abonos.length > 0) {
      credito.abonos.forEach(abono => {
        // Agregar información del crédito y cliente al abono
        abonos.push({
          ...abono,
          creditoId: credito.id,
          cliente: credito.cliente,
          credito: {
            id: credito.id,
            estado: credito.estado,
            montoTotal: credito.montoTotal,
            saldoPendiente: credito.saldoPendiente
          }
        });
      });
    }
  });
  
  return abonos;
}

/**
 * Obtener todos los abonos
 * @param {Object} params - Parámetros de consulta (puede incluir clienteId, creditoId, fechaDesde, fechaHasta, metodoPago, sedeId, page, size)
 * @returns {Promise<Array|Object>} Lista de abonos o respuesta paginada si se proporcionan page y size
 */
export async function listarAbonos(params = {}) {
  try {
    // Usar el nuevo endpoint GET /api/abonos con filtros del backend
    const { data } = await api.get("/abonos", { params });
    
    // Si viene paginado (tiene content), retornar solo el array de abonos
    // Si no viene paginado, retornar directamente el array
    if (data && typeof data === 'object' && Array.isArray(data.content)) {
      return data.content;
    }
    
    // Compatibilidad: si viene como array directo
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error listando abonos:", error);
    throw error;
  }
}

/**
 * Obtener abonos por cliente
 * @param {number} clienteId - ID del cliente
 * @param {Object} options - Opciones adicionales (fechaDesde, fechaHasta, page, size)
 * @returns {Promise<Array>} Lista de abonos del cliente
 */
export async function listarAbonosPorCliente(clienteId, options = {}) {
  if (!clienteId) {
    throw new Error("clienteId es obligatorio para listar abonos por cliente");
  }
  try {
    return await listarAbonos({ clienteId, ...options });
  } catch (error) {
    console.error("Error listando abonos por cliente:", error);
    throw error;
  }
}

/**
 * Obtener abonos por fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD (se usa como fechaDesde y fechaHasta)
 * @param {Object} options - Opciones adicionales (clienteId, page, size)
 * @returns {Promise<Array>} Lista de abonos de la fecha
 */
export async function listarAbonosPorFecha(fecha, options = {}) {
  if (!fecha) {
    throw new Error("fecha es obligatoria para listar abonos por fecha");
  }
  try {
    // Convertir fecha única a rango fechaDesde-fechaHasta
    return await listarAbonos({ fechaDesde: fecha, fechaHasta: fecha, ...options });
  } catch (error) {
    console.error("Error listando abonos por fecha:", error);
    throw error;
  }
}

/**
 * Listar créditos pendientes de un cliente
 * 
 * Obtiene SOLO los créditos con saldo pendiente > 0
 * Incluye toda la información necesaria para la página de abonos
 * 
 * @param {number} clienteId - ID del cliente
 * @returns {Promise<Array>} Array de créditos pendientes con toda la información
 */
export async function listarCreditosPendientes(clienteId) {
  if (!clienteId) {
    throw new Error("clienteId es obligatorio para listar créditos pendientes");
  }
  
  try {
    const { data } = await api.get(`/creditos/cliente/${clienteId}/pendientes`);
    console.log(`Créditos pendientes obtenidos: ${data.length}`);
    return data;
  } catch (error) {
    console.error('Error obteniendo créditos pendientes:', error);
    throw error;
  }
}

/**
 * Listar TODOS los créditos de un cliente (histórico completo)
 * Incluye créditos abiertos, cerrados, anulados - sin filtros
 * 
 * @param {number} clienteId - ID del cliente
 * @param {Object} options - Opciones de filtrado
 * @param {string} options.fechaDesde - Fecha desde (YYYY-MM-DD, opcional)
 * @param {string} options.fechaHasta - Fecha hasta (YYYY-MM-DD, opcional)
 * @returns {Promise<Array>} Array con todos los créditos del cliente
 */
export async function listarCreditosCliente(clienteId, options = {}) {
  if (!clienteId) {
    throw new Error("clienteId es obligatorio para listar créditos");
  }
  
  try {
    // Construir query params
    const params = {};
    if (options.fechaDesde) {
      params.fechaDesde = options.fechaDesde;
    }
    if (options.fechaHasta) {
      params.fechaHasta = options.fechaHasta;
    }
    
    const { data } = await api.get(`/creditos/cliente/${clienteId}`, { params });
    console.log(`Créditos totales obtenidos: ${data.length}`);
    return data;
  } catch (error) {
    console.error('Error obteniendo créditos del cliente:', error);
    throw error;
  }
}

