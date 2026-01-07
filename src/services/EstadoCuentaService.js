/**
 * Marca créditos del cliente especial como pagados
 * @param {Array<number>} creditoIds - IDs de los créditos a marcar como pagados
 * @returns {Promise<{mensaje: string, creditosPagados: number, detalles: string}>}
 */
export async function marcarCreditosEspecialPagados(creditoIds) {
  if (!Array.isArray(creditoIds) || creditoIds.length === 0) {
    throw new Error("Debes enviar al menos un ID de crédito");
  }
  try {
    const response = await axios.post('/api/creditos/cliente-especial/marcar-pagados', { creditoIds });
    return response.data;
  } catch (error) {
    if (error.response) {
      // Errores controlados del backend
      throw new Error(error.response.data?.mensaje || error.response.data?.error || 'Error al marcar créditos como pagados');
    }
    throw new Error('Error de red o inesperado');
  }
}
import axios from "axios";

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
