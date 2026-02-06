import { api } from "../lib/api";

// GET /api/business-settings
export async function getBusinessSettings() {
  try {
    const { data } = await api.get("/business-settings");
    console.log('[getBusinessSettings] Respuesta del backend:', data);
    console.log('[getBusinessSettings] Campos ICA recibidos - icaRate:', data.icaRate, 'icaThreshold:', data.icaThreshold);
    
    // Mapear nombres del backend a nombres del frontend
    const mapped = {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate, // Backend usa reteRate, frontend usa retefuenteRate
      retefuenteThreshold: data.reteThreshold, // Backend usa reteThreshold, frontend usa retefuenteThreshold
      icaRate: data.icaRate,
      icaThreshold: data.icaThreshold,
      updatedAt: data.updatedAt
    };
    
    console.log('[getBusinessSettings] Datos mapeados:', mapped);
    return mapped;
  } catch (error) {
    console.error('[getBusinessSettings] Error obteniendo configuración:', error);
    // Error obteniendo configuración de negocio
    // Valores por defecto si falla la petición
    return { ivaRate: 19, retefuenteRate: 2.5, retefuenteThreshold: 1000000, icaRate: 0.48, icaThreshold: 1000000 };
  }
}

// PUT /api/business-settings
export async function updateBusinessSettings(payload) {
  const { ivaRate, retefuenteRate, retefuenteThreshold, icaRate, icaThreshold } = payload || {};
  
  // Validación mínima
  if (ivaRate < 0 || ivaRate > 100) throw new Error('IVA inválido');
  if (retefuenteRate < 0 || retefuenteRate > 100) throw new Error('Retención inválida');
  if (retefuenteThreshold < 0) throw new Error('Umbral inválido');
  if (icaRate !== undefined && (icaRate < 0 || icaRate > 100)) throw new Error('ICA inválido');
  if (icaThreshold !== undefined && icaThreshold < 0) throw new Error('Umbral ICA inválido');
  
  try {
    // Mapear nombres del frontend a nombres del backend
    // Incluir todos los campos, incluso los de ICA
    const backendPayload = {
      ivaRate: ivaRate,
      reteRate: retefuenteRate, // Frontend usa retefuenteRate, backend usa reteRate
      reteThreshold: retefuenteThreshold, // Frontend usa retefuenteThreshold, backend usa reteThreshold
      icaRate: icaRate,
      icaThreshold: icaThreshold
    };
    
    console.log('[updateBusinessSettings] Payload recibido:', payload);
    console.log('[updateBusinessSettings] Valores ICA - icaRate:', icaRate, 'icaThreshold:', icaThreshold);
    console.log('[updateBusinessSettings] Payload a enviar al backend:', backendPayload);
    
    const { data } = await api.put("/business-settings", backendPayload);
    console.log('[updateBusinessSettings] Respuesta del backend después de guardar:', data);
    console.log('[updateBusinessSettings] Campos ICA en respuesta - icaRate:', data.icaRate, 'icaThreshold:', data.icaThreshold);
    
    // Mapear respuesta del backend a nombres del frontend
    const mapped = {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      icaRate: data.icaRate,
      icaThreshold: data.icaThreshold,
      updatedAt: data.updatedAt
    };
    
    console.log('[updateBusinessSettings] Datos mapeados de respuesta:', mapped);
    return mapped;
  } catch (error) {
    // Error actualizando configuración de negocio
    throw error;
  }
}

// POST /api/business-settings (crear)
export async function crearBusinessSettings(payload) {
  const { ivaRate, retefuenteRate, retefuenteThreshold, icaRate, icaThreshold } = payload || {};
  
  try {
    const backendPayload = {
      ivaRate: ivaRate,
      reteRate: retefuenteRate,
      reteThreshold: retefuenteThreshold,
      icaRate: icaRate,
      icaThreshold: icaThreshold
    };
    
    const { data } = await api.post("/business-settings", backendPayload);
    
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      icaRate: data.icaRate,
      icaThreshold: data.icaThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    // Error creando configuración de negocio
    throw error;
  }
}

// GET /api/business-settings/{id}
export async function obtenerBusinessSettingsPorId(id) {
  try {
    const { data } = await api.get(`/business-settings/${id}`);
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      icaRate: data.icaRate,
      icaThreshold: data.icaThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    // Error obteniendo configuración de negocio por ID
    throw error;
  }
}

// GET /api/business-settings/listar
export async function listarBusinessSettings() {
  try {
    const { data } = await api.get("/business-settings/listar");
    return Array.isArray(data) ? data.map(item => ({
      id: item.id,
      ivaRate: item.ivaRate,
      retefuenteRate: item.reteRate,
      retefuenteThreshold: item.reteThreshold,
      icaRate: item.icaRate,
      icaThreshold: item.icaThreshold,
      updatedAt: item.updatedAt
    })) : [];
  } catch (error) {
    // Error listando configuraciones de negocio
    return [];
  }
}

// DELETE /api/business-settings/{id}
export async function eliminarBusinessSettings(id) {
  try {
    await api.delete(`/business-settings/${id}`);
return { ok: true };
  } catch (error) {
    // Error eliminando configuración de negocio
    throw error;
  }
}
