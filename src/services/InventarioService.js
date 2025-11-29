// src/services/inventario.js
import { api } from "../lib/api";

/**
 * Transforma el DTO del backend al formato esperado por el frontend
 * @param {Array} productos - Array de productos del backend
 * @param {boolean} isAdmin - Si el usuario es administrador
 * @param {number} userSedeId - ID de la sede del usuario (solo para vendedores)
 * @returns {Array} Productos transformados
 */
function transformarInventarioDTO(productos, isAdmin = true, userSedeId = null) {
  return productos.map(producto => {
    // El backend ya devuelve cantidadInsula, cantidadCentro, cantidadPatios directamente
    // No necesitamos transformar si ya vienen en el formato correcto
    let cantidadInsula = producto.cantidadInsula || 0;
    let cantidadCentro = producto.cantidadCentro || 0; 
    let cantidadPatios = producto.cantidadPatios || 0;

    // Si por alguna razón viene con array de inventarios (compatibilidad con versiones anteriores)
    if (producto.inventarios && Array.isArray(producto.inventarios)) {
      cantidadInsula = 0;
      cantidadCentro = 0;
      cantidadPatios = 0;

      producto.inventarios.forEach(inv => {
        switch(inv.sedeId) {
          case 1:
            cantidadInsula = inv.cantidad || 0;
            break;
          case 2:
            cantidadCentro = inv.cantidad || 0;
            break;
          case 3:
            cantidadPatios = inv.cantidad || 0;
            break;
        }
      });
    }
    
    // Detectar vidrios correctamente: solo si tiene esVidrio=true O tiene campos mm/m1/m2 con valores
    const esVidrio = producto.esVidrio === true || 
                     (producto.mm != null && producto.mm !== undefined) || 
                     (producto.m1 != null && producto.m1 !== undefined);

    // Normalizar categoría: puede venir como objeto {id, nombre} o como string
    let categoriaNormalizada = producto.categoria;
    let categoriaId = null;
    let categoriaNombre = null;
    
    if (typeof producto.categoria === 'object' && producto.categoria !== null) {
      categoriaNombre = producto.categoria.nombre || producto.categoria;
      categoriaId = producto.categoria.id || null;
    } else if (typeof producto.categoria === 'string') {
      categoriaNombre = producto.categoria;
    }
    
    // Si es vidrio, asegurar que la categoría sea "VIDRIO"
    if (esVidrio && !categoriaNombre?.toLowerCase().includes('vidrio')) {
      categoriaNombre = "VIDRIO";
    }
    
    return {
      id: producto.productoId || producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      posicion: producto.posicion,
      tipo: producto.tipo,
      color: producto.color,
      categoria: categoriaNombre || categoriaNormalizada, // Nombre de categoría para filtros
      categoriaId: categoriaId || producto.categoriaId || producto.categoria_id, // ID para filtros por ID
      categoriaObj: producto.categoria, // Objeto completo si existe
      descripcion: producto.descripcion,
      costo: producto.costo,
      precio1: producto.precio1,
      precio2: producto.precio2,
      precio3: producto.precio3,
      cantidadInsula,
      cantidadCentro,
      cantidadPatios,
      cantidadTotal: producto.cantidadTotal || (cantidadInsula + cantidadCentro + cantidadPatios),
      // Campos para vidrios (del nuevo endpoint /inventario-completo/vidrios)
      esVidrio: esVidrio || producto.esVidrio === true,
      mm: producto.mm || producto.grosorMm || null,
      m1: producto.m1 || producto.largoCm || null,
      m2: producto.m2 || producto.anchoCm || null,
      m1m2: producto.m1m2 || (producto.m1 && producto.m2 ? `${producto.m1}x${producto.m2}` : null) || (producto.largoCm && producto.anchoCm ? (producto.largoCm * producto.anchoCm / 10000).toFixed(2) : null),
      // Compatibilidad con formato antiguo
      largoCm: producto.largoCm || producto.m1 || null,
      anchoCm: producto.anchoCm || producto.m2 || null,
      grosorMm: producto.grosorMm || producto.mm || null,
      laminas: producto.laminas || null
    };
  });
}

/**
 * Obtiene inventario completo de productos vidrio
 * GET /api/inventario-completo/vidrios
 */
export async function listarInventarioCompletoVidrios(params = {}, isAdmin = true, userSedeId = null) {
  try {
    const { data } = await api.get("/inventario-completo/vidrios", { params });
    return transformarInventarioDTO(data || [], isAdmin, userSedeId);
  } catch (error) {
    console.error("Error obteniendo productos vidrio:", error);
    // Si el endpoint no existe o falla, retornar array vacío
    return [];
  }
}

/**
 * Obtiene inventario completo con productos y cantidades por sede unificado
 * Combina productos normales y productos vidrio
 * GET /api/inventario-completo + GET /api/inventario-completo/vidrios
 */
export async function listarInventarioCompleto(params = {}, isAdmin = true, userSedeId = null) {
  try {
    // Obtener productos normales y vidrios en paralelo
    const [productosNormales, productosVidrio] = await Promise.all([
      api.get("/inventario-completo", { params }).then(res => res.data || []),
      api.get("/inventario-completo/vidrios", { params }).then(res => {
        console.log(`✅ Respuesta de /inventario-completo/vidrios:`, res.data?.length || 0, "productos");
        if (res.data && res.data.length > 0) {
          console.log(`  - Primer vidrio del endpoint:`, res.data[0]);
        }
        return res.data || [];
      }).catch((err) => {
        console.error("❌ Error obteniendo productos vidrio:", err);
        console.error("  - URL:", err.config?.url);
        console.error("  - Status:", err.response?.status);
        console.error("  - Data:", err.response?.data);
        return [];
      })
    ]);
    
    console.log(`📦 Inventario completo - Respuestas del backend:`);
    console.log(`  - Productos normales: ${productosNormales?.length || 0}`);
    console.log(`  - Productos vidrio: ${productosVidrio?.length || 0}`);
    
    // Combinar ambos arrays
    const todosLosProductos = [...(productosNormales || []), ...(productosVidrio || [])];
    
    const transformados = transformarInventarioDTO(todosLosProductos, isAdmin, userSedeId);
    
    return transformados;
  } catch (error) {
    console.error("Error obteniendo inventario completo:", error);
    // Si falla, intentar solo con productos normales (comportamiento anterior)
    try {
      const { data } = await api.get("/inventario-completo", { params });
      return transformarInventarioDTO(data || [], isAdmin, userSedeId);
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Transforma el DTO de cortes del backend al formato esperado por el frontend
 * @param {Array} cortes - Array de cortes del backend
 * @param {boolean} isAdmin - Si el usuario es administrador
 * @param {number} userSedeId - ID de la sede del usuario (solo para vendedores)
 * @returns {Array} Cortes transformados
 */
function transformarCortesDTO(cortes, isAdmin = true, userSedeId = null) {
  return cortes.map(corte => {
    // Si el backend ya trae cantidadInsula, cantidadCentro, cantidadPatios directamente
    let cantidadInsula = corte.cantidadInsula || 0;
    let cantidadCentro = corte.cantidadCentro || 0;
    let cantidadPatios = corte.cantidadPatios || 0;

    // Si tiene array de inventarios, mapear como en productos
    if (corte.inventarios && Array.isArray(corte.inventarios)) {
      cantidadInsula = 0;
      cantidadCentro = 0;
      cantidadPatios = 0;

      corte.inventarios.forEach(inv => {
        switch(inv.sedeId) {
          case 1:
            cantidadInsula = inv.cantidad || 0;
            break;
          case 2:
            cantidadCentro = inv.cantidad || 0;
            break;
          case 3:
            cantidadPatios = inv.cantidad || 0;
            break;
        }
      });
    }

    // Para vendedores, mostrar solo su sede
    if (!isAdmin && userSedeId) {
      const cantidadOriginal = {
        1: cantidadInsula,
        2: cantidadCentro,
        3: cantidadPatios
      };
      
      const miCantidad = cantidadOriginal[userSedeId] || 0;
      
      // Resetear todas las cantidades y mostrar solo la del vendedor
      switch(userSedeId) {
        case 1: // Insula
          cantidadInsula = miCantidad;
          cantidadCentro = 0;
          cantidadPatios = 0;
          break;
        case 2: // Centro
          cantidadInsula = 0;
          cantidadCentro = miCantidad;
          cantidadPatios = 0;
          break;
        case 3: // Patios
          cantidadInsula = 0;
          cantidadCentro = 0;
          cantidadPatios = miCantidad;
          break;
      }
    }

    return {
      id: corte.productoId || corte.id,  // Mapear productoId como id
      productoId: corte.productoId,
      codigo: corte.codigo,
      nombre: corte.nombre,
      posicion: corte.posicion,
      tipo: corte.tipo,
      color: corte.color,
      categoria: corte.categoria,
      descripcion: corte.descripcion,
      costo: corte.costo,
      largoCm: corte.largoCm,
      precio: corte.precio,
      observacion: corte.observacion,
      cantidadInsula,
      cantidadCentro,
      cantidadPatios,
      cantidadTotal: isAdmin ? corte.cantidadTotal : (cantidadInsula + cantidadCentro + cantidadPatios),
      precio1: corte.precio1,
      precio2: corte.precio2,
      precio3: corte.precio3
    };
  });
}

/**
 * Obtiene inventario completo de cortes con cantidades por sede
 * GET /api/cortes-inventario-completo
 */
export async function listarCortesInventarioCompleto(params = {}, isAdmin = true, userSedeId = null) {
  const { data } = await api.get("/cortes-inventario-completo", { params });
  const transformados = transformarCortesDTO(data || [], isAdmin, userSedeId);
  return transformados;
}

/**
 * Obtiene inventario agrupado por producto (con cantidades por sede)
 * GET /api/inventario/agrupado
 */
export async function listarInventarioAgrupado() {
  const { data } = await api.get("/inventario/agrupado");
  return data;
}

/**
 * Opcional: obtener inventario por sede
 * GET /api/inventario?sedeId={id}
 */
export async function listarInventarioPorSede(sedeId) {
  const { data } = await api.get(`/inventario?sedeId=${sedeId}`);
  return data;
}

/**
 * Opcional: actualizar cantidad en inventario
 * PUT /api/inventario/{id}
 */
export async function actualizarInventario(id, payload) {
  const { data } = await api.put(`/inventario/${id}`, payload);
  return data;
}
