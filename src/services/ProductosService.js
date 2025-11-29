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
 */
export async function listarTodosLosProductos(params = {}) {
  try {
    // Obtener productos normales y vidrios en paralelo
    const [productosNormales, productosVidrio] = await Promise.all([
      api.get("/productos", { params }).then(res => res.data || []),
      api.get("/inventario-completo/vidrios", { params }).then(res => res.data || []).catch(() => [])
    ]);
    
    // Combinar ambos arrays
    const todosLosProductos = [...(productosNormales || []), ...(productosVidrio || [])];
    
    console.log(`📦 listarTodosLosProductos: ${productosNormales?.length || 0} normales + ${productosVidrio?.length || 0} vidrios = ${todosLosProductos.length} total`);
    
    return todosLosProductos;
  } catch (error) {
    console.error("Error obteniendo todos los productos:", error);
    // Si falla, intentar solo con productos normales (comportamiento anterior)
    try {
      const { data } = await api.get("/productos", { params });
      return data || [];
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);
      throw fallbackError;
    }
  }
}

export async function crearProducto(payload) {
  try {
    const { data } = await api.post("/productos", payload, {
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
    const { data } = await api.put(`/productos/${id}`, payload, {
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