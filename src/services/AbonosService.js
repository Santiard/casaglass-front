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
 * @param {Object} params - Parámetros de consulta (puede incluir clienteId, fecha, sedeId)
 * @returns {Promise<Array>} Lista de abonos
 */
export async function listarAbonos(params = {}) {
  try {
    // Obtener todos los créditos (que incluyen sus abonos)
    const { data: creditos } = await api.get("/creditos", { params });
    
    // Extraer y aplanar todos los abonos
    let abonos = extraerAbonosDeCreditos(creditos || []);
    
    // Filtrar por cliente si se especifica
    if (params.clienteId) {
      abonos = abonos.filter(abono => 
        abono.cliente?.id === Number(params.clienteId) || 
        abono.credito?.cliente?.id === Number(params.clienteId)
      );
    }
    
    // Filtrar por fecha si se especifica
    if (params.fecha) {
      const fechaStr = typeof params.fecha === 'string' ? params.fecha : new Date(params.fecha).toISOString().slice(0, 10);
      abonos = abonos.filter(abono => {
        if (!abono.fecha) return false;
        const fechaAbono = new Date(abono.fecha).toISOString().slice(0, 10);
        return fechaAbono === fechaStr;
      });
    }
    
    return abonos;
  } catch (error) {
    console.error("Error listando abonos:", error);
    throw error;
  }
}

/**
 * Obtener abonos por cliente
 * @param {number} clienteId - ID del cliente
 * @returns {Promise<Array>} Lista de abonos del cliente
 */
export async function listarAbonosPorCliente(clienteId) {
  if (!clienteId) {
    throw new Error("clienteId es obligatorio para listar abonos por cliente");
  }
  try {
    return await listarAbonos({ clienteId });
  } catch (error) {
    console.error("Error listando abonos por cliente:", error);
    throw error;
  }
}

/**
 * Obtener abonos por fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Lista de abonos de la fecha
 */
export async function listarAbonosPorFecha(fecha) {
  if (!fecha) {
    throw new Error("fecha es obligatoria para listar abonos por fecha");
  }
  try {
    return await listarAbonos({ fecha });
  } catch (error) {
    console.error("Error listando abonos por fecha:", error);
    throw error;
  }
}

