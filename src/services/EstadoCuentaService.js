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
