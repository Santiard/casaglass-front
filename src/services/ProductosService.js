// src/services/ProductosService.js
import{api} from "../lib/api";

const base = "/productos";

export async function getCategorias() {
  const { data } = await api.get(`${base}/categorias`);
  return data || [];
}

// GET /api/productos?categoria=Vidrio&q=templado
// NOTA: Este endpoint solo retorna productos normales, NO incluye vidrios
export async function listarProductos(params = {}) {
  const { data } = await api.get("/productos", { params });
  return data;
}

/**
 * Obtiene TODOS los productos (normales + vidrios) combinados
 * Útil para catálogos donde se necesitan ambos tipos
 * NOTA: Usa /inventario-completo que retorna todos los productos (normales y vidrios)
 */
export async function listarTodosLosProductos(params = {}) {
  try {
    // El endpoint /inventario-completo retorna todos los productos (normales y vidrios)
    const { data } = await api.get("/inventario-completo", { params });
    
    console.log(` listarTodosLosProductos: ${data?.length || 0} productos totales (normales + vidrios)`);
    
    //  LOG: Verificar estructura de productos retornados
    if (data && data.length > 0) {
      const primeros3 = data.slice(0, 3);
      console.log(" Estructura de productos del endpoint /inventario-completo:", primeros3.map(p => ({
        id: p.id,
        productoId: p.productoId,
        codigo: p.codigo,
        nombre: p.nombre,
        tieneId: !!(p.id || p.productoId),
        esVidrio: p.esVidrio,
        categoria: p.categoria
      })));
      
      // Verificar productos sin ID
      const sinId = data.filter(p => !p.id && !p.productoId);
      if (sinId.length > 0) {
        console.warn(` ${sinId.length} productos sin ID encontrados en /inventario-completo:`, sinId.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre
        })));
      }
    }
    
    return data || [];
  } catch (error) {
    console.error("Error obteniendo todos los productos:", error);
    // Si falla, intentar solo con productos normales (comportamiento anterior)
    try {
      const { data } = await api.get("/productos", { params });
      console.log(" Fallback a /productos:", data?.length || 0, "productos");
      return data || [];
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Crea un nuevo producto
 * @param {Object} payload - Datos del producto a crear
 * @param {string|number|null|undefined} payload.posicion - Posición donde insertar el producto (opcional)
 *   - Si es un número > 0, se convierte a String y se envía
 *   - Si es null, undefined, "" o 0, no se incluye en el payload (se inserta al final automáticamente)
 * @returns {Promise<Object>} Producto creado
 */
export async function crearProducto(payload) {
  try {
    // Procesar el campo posicion según la documentación
    const processedPayload = { ...payload };
    
    // Manejar el campo posicion
    if (processedPayload.posicion !== undefined && processedPayload.posicion !== null) {
      // Si es un número, convertirlo a String
      if (typeof processedPayload.posicion === 'number') {
        if (processedPayload.posicion > 0) {
          processedPayload.posicion = String(processedPayload.posicion);
        } else {
          // Si es 0 o negativo, no incluir el campo (se inserta al final)
          delete processedPayload.posicion;
        }
      } else if (typeof processedPayload.posicion === 'string') {
        // Si es string, validar que no esté vacío
        const posicionTrimmed = processedPayload.posicion.trim();
        if (posicionTrimmed === '' || posicionTrimmed === '0') {
          // Si está vacío o es "0", no incluir el campo (se inserta al final)
          delete processedPayload.posicion;
        } else {
          // Validar que sea un número válido
          const posicionNum = Number(posicionTrimmed);
          if (isNaN(posicionNum) || posicionNum <= 0) {
            // Si no es un número válido o es <= 0, no incluir el campo
            delete processedPayload.posicion;
          } else {
            // Asegurar que sea String
            processedPayload.posicion = String(posicionNum);
          }
        }
      }
    } else {
      // Si es undefined o null, no incluir el campo (se inserta al final)
      delete processedPayload.posicion;
    }
    
    const { data } = await api.post("/productos", processedPayload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    console.error("Error en crearProducto:", error);
    console.error("Response data:", error.response?.data);
    throw error;
  }
}
export async function actualizarProducto(id, payload) {
  try {
    const processedPayload = { ...payload };

    // Procesar el campo posicion según la documentación (igual que en crearProducto)
    if (processedPayload.posicion !== undefined && processedPayload.posicion !== null) {
      if (typeof processedPayload.posicion === 'number') {
        if (processedPayload.posicion > 0) {
          processedPayload.posicion = String(processedPayload.posicion);
        } else {
          // Si es 0 o negativo, no incluir posicion
          delete processedPayload.posicion;
        }
      } else if (typeof processedPayload.posicion === 'string') {
        const posicionTrimmed = processedPayload.posicion.trim();
        if (posicionTrimmed === '' || posicionTrimmed === '0') {
          // Si es string vacío o "0", no incluir posicion
          delete processedPayload.posicion;
        } else {
          const posicionNum = Number(posicionTrimmed);
          if (isNaN(posicionNum) || posicionNum <= 0) {
            // Si no es un número válido o es <= 0, no incluir posicion
            delete processedPayload.posicion;
          } else {
            // Si es un número válido y positivo, convertir a string
            processedPayload.posicion = String(posicionNum);
          }
        }
      }
    } else {
      // Si es null o undefined, no incluir posicion
      delete processedPayload.posicion;
    }

    const { data } = await api.put(`/productos/${id}`, processedPayload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    console.error("Response data:", error.response?.data);
    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    throw error;
  }
}
export async function eliminarProducto(id) {
  await api.delete(`/productos/${id}`);
}

/**
 * Obtiene la lista de productos con solo los campos necesarios para mostrar posiciones
 * @param {Object} params - Parámetros opcionales (categoriaId para filtrar)
 * @returns {Promise<Array>} Lista de productos con id, codigo, nombre, color, posicion, categoria
 */
export async function listarProductosPosiciones(params = {}) {
  try {
    const { data } = await api.get("/productos/posiciones", { params });
    return data || [];
  } catch (error) {
    console.error("Error obteniendo productos para posiciones:", error);
    throw error;
  }
}

/**
 * Actualiza SOLO el costo de un producto
 * Intenta usar PATCH /productos/{id}/costo primero, si no existe usa PUT /productos/{id}/costo
 * @param {number} id - ID del producto
 * @param {number} costo - Nuevo costo del producto
 */
export async function actualizarCostoProducto(id, costo) {
  try {
    // Intentar primero con un endpoint específico para actualizar solo el costo
    // PUT /productos/{id}/costo
    const payload = { costo: Number(costo) };
    const { data } = await api.put(`/productos/${id}/costo`, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    // Si el endpoint específico no existe, intentar con PATCH
    if (error.response?.status === 404) {
      try {
        const payload = { costo: Number(costo) };
        const { data } = await api.patch(`/productos/${id}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        return data;
      } catch (patchError) {
        console.error("Error en actualizarCostoProducto (PATCH):", patchError);
        console.error("Response data:", patchError.response?.data);
        throw patchError;
      }
    }
    console.error("Error en actualizarCostoProducto:", error);
    console.error("Response data:", error.response?.data);
    console.error("Status:", error.response?.status);
    throw error;
  }
}