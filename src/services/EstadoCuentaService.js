import axios from "axios";

/**
 * Marca créditos del cliente especial como pagados
 * @param {Array<number>} creditoIds - IDs de los créditos a marcar como pagados
 * @param {string} ejecutadoPor - (opcional) Nombre de quien ejecuta la acción
 * @param {string} observaciones - (opcional) Observaciones adicionales
 * @returns {Promise<{mensaje: string, creditosPagados: number, entregaEspecialId: number, registro: Object}>}
 */
export async function marcarCreditosEspecialPagados(creditoIds, ejecutadoPor = null, observaciones = null) {
  if (!Array.isArray(creditoIds) || creditoIds.length === 0) {
    throw new Error("Debes enviar al menos un ID de crédito");
  }
  try {
    const payload = { creditoIds };
    if (ejecutadoPor) payload.ejecutadoPor = ejecutadoPor;
    if (observaciones) payload.observaciones = observaciones;
    
    const response = await axios.post('/api/creditos/cliente-especial/marcar-pagados', payload);
    return response.data;
  } catch (error) {
    if (error.response) {
      // Errores controlados del backend
      throw new Error(error.response.data?.mensaje || error.response.data?.error || 'Error al marcar créditos como pagados');
    }
    throw new Error('Error de red o inesperado');
  }
}

/**
 * Obtiene el estado de cuenta de un cliente (créditos activos con saldo pendiente > 0)
 * @param {number|string} clienteId - ID del cliente
 * @param {number|string|null} sedeId - (opcional) ID de la sede
 * @returns {Promise<{creditos: Array, resumen: {totalDeuda: number, totalAbonado: number, totalCreditos: number, cantidadCreditos: number}}>} Estado de cuenta y resumen
 */
export async function fetchEstadoCuenta(clienteId, sedeId = null) {
  const params = sedeId ? { sedeId } : {};
  const response = await axios.get(`/api/creditos/cliente/${clienteId}/estado-cuenta`, { params });
  const estadoCuenta = response.data;
  const totalDeuda = estadoCuenta.reduce((sum, c) => sum + c.saldoPendiente, 0);
  const totalAbonado = estadoCuenta.reduce((sum, c) => sum + c.totalAbonado, 0);
  const totalCreditos = estadoCuenta.reduce((sum, c) => sum + c.totalCredito, 0);
  return {
    creditos: estadoCuenta,
    resumen: {
      totalDeuda,
      totalAbonado,
      totalCreditos,
      cantidadCreditos: estadoCuenta.length
    }
  };
}

/**
 * Obtiene el estado de cuenta del cliente especial (cliente 499)
 * @param {number|string|null} sedeId - (opcional) ID de la sede
 * @returns {Promise<{creditos: Array, resumen: {totalDeuda: number, totalAbonado: number, totalCreditos: number, cantidadCreditos: number}}>} Estado de cuenta y resumen
 */
export async function fetchEstadoCuentaEspecial(sedeId = null) {
  const params = sedeId ? { sedeId } : {};
  const response = await axios.get('/api/creditos/cliente-especial/estado-cuenta', { params });
  const estadoCuenta = response.data;
  const totalDeuda = estadoCuenta.reduce((sum, c) => sum + c.saldoPendiente, 0);
  const totalAbonado = estadoCuenta.reduce((sum, c) => sum + c.totalAbonado, 0);
  const totalCreditos = estadoCuenta.reduce((sum, c) => sum + c.totalCredito, 0);
  return {
    creditos: estadoCuenta,
    resumen: {
      totalDeuda,
      totalAbonado,
      totalCreditos,
      cantidadCreditos: estadoCuenta.length
    }
  };
}

/**
 * Obtiene el historial de entregas especiales (lotes de créditos cerrados)
 * @param {string} desde - (opcional) Fecha inicial en formato YYYY-MM-DD
 * @param {string} hasta - (opcional) Fecha final en formato YYYY-MM-DD
 * @returns {Promise<Array>} Lista de entregas especiales
 */
export async function obtenerEntregasEspeciales(desde = null, hasta = null) {
  try {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    
    const response = await axios.get('/api/creditos/cliente-especial/entregas', { params });
    
    // Manejar diferentes estructuras de respuesta
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Si viene envuelta en un objeto
      return response.data.entregas || response.data.content || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error completo:', error);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    
    if (error.response) {
      const errorMsg = error.response.data?.mensaje || error.response.data?.error || `Error del servidor: ${error.response.status}`;
      throw new Error(errorMsg);
    }
    throw new Error('Error de red o inesperado');
  }
}

/**
 * Obtiene el detalle de una entrega especial por ID
 * @param {number} id - ID de la entrega especial
 * @returns {Promise<Object>} Detalle completo de la entrega con sus créditos
 */
export async function obtenerDetalleEntregaEspecial(id) {
  try {
    const response = await axios.get(`/api/creditos/cliente-especial/entregas/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.mensaje || error.response.data?.error || 'Error al obtener detalle de entrega especial');
    }
    throw new Error('Error de red o inesperado');
  }
}
