import { api } from "../lib/api";

// GET /api/business-settings
export async function getBusinessSettings() {
  try {
    const { data } = await api.get("/business-settings");
    // Mapear nombres del backend a nombres del frontend
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate, // Backend usa reteRate, frontend usa retefuenteRate
      retefuenteThreshold: data.reteThreshold, // Backend usa reteThreshold, frontend usa retefuenteThreshold
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error obteniendo configuración de negocio:", error);
    // Valores por defecto si falla la petición
    return { ivaRate: 19, retefuenteRate: 2.5, retefuenteThreshold: 1000000 };
  }
}

// PUT /api/business-settings
export async function updateBusinessSettings(payload) {
  const { ivaRate, retefuenteRate, retefuenteThreshold } = payload || {};
  
  // Validación mínima
  if (ivaRate < 0 || ivaRate > 100) throw new Error('IVA inválido');
  if (retefuenteRate < 0 || retefuenteRate > 100) throw new Error('Retención inválida');
  if (retefuenteThreshold < 0) throw new Error('Umbral inválido');
  
  try {
    // Mapear nombres del frontend a nombres del backend
    const backendPayload = {
      ivaRate: ivaRate,
      reteRate: retefuenteRate, // Frontend usa retefuenteRate, backend usa reteRate
      reteThreshold: retefuenteThreshold // Frontend usa retefuenteThreshold, backend usa reteThreshold
    };
    
    const { data } = await api.put("/business-settings", backendPayload);
    
    // Mapear respuesta del backend a nombres del frontend
    return {
      id: data.id,
      ivaRate: data.ivaRate,
      retefuenteRate: data.reteRate,
      retefuenteThreshold: data.reteThreshold,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error actualizando configuración de negocio:", error);
    throw error;
  }
}

// POST /api/business-settings (crear)
export async function crearBusinessSettings(payload) {
  const { ivaRate, retefuenteRate, retefuenteThreshold } = payload || {};
  
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
    console.error("Error creando configuración de negocio:", error);
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
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error("Error obteniendo configuración de negocio por ID:", error);
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
      updatedAt: item.updatedAt
    })) : [];
  } catch (error) {
    console.error("Error listando configuraciones de negocio:", error);
    return [];
  }
}

// DELETE /api/business-settings/{id}
export async function eliminarBusinessSettings(id) {
  try {
    await api.delete(`/business-settings/${id}`);
    return { ok: true };
  } catch (error) {
    console.error("Error eliminando configuración de negocio:", error);
    throw error;
  }
}
