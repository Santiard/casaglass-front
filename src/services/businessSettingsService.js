import { api } from "../lib/api";

/**
 * Obtener la configuración actual de negocio desde el backend
 * @returns {Promise<Object>} Configuración con valores por defecto si no existe
 */
export async function getBusinessSettings() {
  try {
    const { data } = await api.get("/business-settings");
    
    // Mapear nombres del backend al frontend para mantener compatibilidad
    return {
      id: data.id,
      ivaRate: data.ivaRate || 19,
      retefuenteRate: data.reteRate || 2.5, // Backend usa reteRate, frontend usa retefuenteRate
      retefuenteThreshold: data.reteThreshold || 1000000, // Backend usa reteThreshold, frontend usa retefuenteThreshold
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.warn("Error obteniendo configuración del backend, usando valores por defecto:", error);
    // Retornar valores por defecto si hay error
    return { 
      ivaRate: 19, 
      retefuenteRate: 2.5, 
      retefuenteThreshold: 1000000 
    };
  }
}

/**
 * Actualizar la configuración de negocio en el backend
 * @param {Object} payload - Configuración a actualizar
 * @param {number} payload.ivaRate - Porcentaje de IVA (0-100)
 * @param {number} payload.retefuenteRate - Porcentaje de retención (0-100)
 * @param {number} payload.retefuenteThreshold - Umbral mínimo en COP
 * @returns {Promise<Object>} Configuración actualizada
 */
export async function updateBusinessSettings(payload) {
  // Validación mínima (el backend también valida)
  const { ivaRate, retefuenteRate, retefuenteThreshold } = payload || {};
  
  if (ivaRate !== undefined && (ivaRate < 0 || ivaRate > 100)) {
    throw new Error('IVA inválido (debe estar entre 0 y 100)');
  }
  if (retefuenteRate !== undefined && (retefuenteRate < 0 || retefuenteRate > 100)) {
    throw new Error('Retención inválida (debe estar entre 0 y 100)');
  }
  if (retefuenteThreshold !== undefined && retefuenteThreshold < 0) {
    throw new Error('Umbral inválido (debe ser mayor o igual a 0)');
  }

  try {
    // Mapear nombres del frontend al backend
    const backendPayload = {
      ivaRate: ivaRate,
      reteRate: retefuenteRate, // Frontend usa retefuenteRate, backend usa reteRate
      reteThreshold: retefuenteThreshold // Frontend usa retefuenteThreshold, backend usa reteThreshold
    };

    // Usar PUT /api/business-settings (actualiza la configuración actual sin necesidad de ID)
    const { data } = await api.put("/business-settings", backendPayload);
    
    // Mapear respuesta del backend al formato del frontend
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error actualizando configuración:", error);
    const errorMessage = error?.response?.data?.error || error?.message || 'No se pudo actualizar la configuración';
    throw new Error(errorMessage);
  }
}

/**
 * Crear una nueva configuración de negocio
 * @param {Object} payload - Configuración a crear
 * @returns {Promise<Object>} Configuración creada
 */
export async function crearBusinessSettings(payload) {
  const { ivaRate, retefuenteRate, retefuenteThreshold } = payload || {};
  
  if (!ivaRate || ivaRate < 0 || ivaRate > 100) {
    throw new Error('IVA inválido (debe estar entre 0 y 100)');
  }
  if (!retefuenteRate || retefuenteRate < 0 || retefuenteRate > 100) {
    throw new Error('Retención inválida (debe estar entre 0 y 100)');
  }
  if (!retefuenteThreshold || retefuenteThreshold < 0) {
    throw new Error('Umbral inválido (debe ser mayor o igual a 0)');
  }

  try {
    const backendPayload = {
      ivaRate: ivaRate,
      reteRate: retefuenteRate,
      reteThreshold: retefuenteThreshold
    };

    const { data } = await api.post("/business-settings", backendPayload);
    
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error creando configuración:", error);
    const errorMessage = error?.response?.data?.error || error?.message || 'No se pudo crear la configuración';
    throw new Error(errorMessage);
  }
}

/**
 * Obtener configuración por ID
 * @param {number} id - ID de la configuración
 * @returns {Promise<Object>} Configuración
 */
export async function obtenerBusinessSettingsPorId(id) {
  try {
    const { data } = await api.get(`/business-settings/${id}`);
    
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error obteniendo configuración por ID:", error);
    throw error;
  }
}

/**
 * Listar todas las configuraciones (normalmente solo hay una)
 * @returns {Promise<Array>} Lista de configuraciones
 */
export async function listarBusinessSettings() {
  try {
    const { data } = await api.get("/business-settings/all");
    
    return data.map(item => ({
      id: item.id,
      ivaRate: item.ivaRate,
      retefuenteRate: item.reteRate,
      retefuenteThreshold: item.reteThreshold,
      updatedAt: item.updatedAt
    }));
  } catch (error) {
    console.error("Error listando configuraciones:", error);
    throw error;
  }
}

/**
 * Eliminar configuración por ID
 * @param {number} id - ID de la configuración a eliminar
 * @returns {Promise<void>}
 */
export async function eliminarBusinessSettings(id) {
  try {
    await api.delete(`/business-settings/${id}`);
  } catch (error) {
    console.error("Error eliminando configuración:", error);
    const errorMessage = error?.response?.data?.error || error?.message || 'No se pudo eliminar la configuración';
    throw new Error(errorMessage);
  }
}
