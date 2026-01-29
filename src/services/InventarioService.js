// src/services/inventario.js
import { api } from "../lib/api";

/**
 * Transforma el DTO del backend al formato esperado por el frontend
 * @param {Array} productos - Array de productos del backend
 * @param {boolean} isAdmin - Si el usuario es administrador
 * @param {number} userSedeId - ID de la sede del usuario (solo para vendedores)
 * @returns {Array} Productos transformados
 */
function transformarInventarioDTO(productos, isAdmin = true, userSedeId = null, categoriasMap = null) {
  // categoriasMap: Map de nombre de categoría -> { id, nombre } para mapear nombres a IDs
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
    
    //  DEBUG: Log completo de productos vidrio para identificar el ID correcto
    if (esVidrio) {
      // console.log(" Producto VIDRIO detectado - OBJETO COMPLETO del backend:", producto);
      // console.log(" Todos los campos disponibles:", Object.keys(producto));
    }

    // Normalizar categoría: ahora TODOS los productos (normales y vidrios) vienen con objeto {id, nombre}
    //  Backend unificado: categoria siempre es { id: X, nombre: "..." }
    let categoriaId = null;
    let categoriaNombre = null;
    
    if (producto.categoria && typeof producto.categoria === 'object') {
      // Todos los productos ahora vienen con categoria como objeto {id, nombre}
      categoriaNombre = producto.categoria.nombre || null;
      categoriaId = producto.categoria.id || null;
    } else if (typeof producto.categoria === 'string') {
      // Compatibilidad: si aún llega como string (por si acaso)
      categoriaNombre = producto.categoria;
      // Intentar obtener el ID usando el mapa de categorías
      if (categoriasMap) {
        const catInfo = categoriasMap[categoriaNombre] || categoriasMap[categoriaNombre.toUpperCase()] || categoriasMap[categoriaNombre.toLowerCase()];
        if (catInfo) {
          categoriaId = catInfo.id;
        }
      }
    }
    
    return {
      id: producto.productoId || producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      posicion: producto.posicion,
      tipo: producto.tipo,
      color: producto.color,
      categoria: categoriaNombre || (producto.categoria?.nombre) || null, // Nombre de categoría para filtros (compatibilidad)
      categoriaId: categoriaId || producto.categoria?.id || producto.categoriaId || producto.categoria_id, // ID para filtros por ID
      categoriaObj: producto.categoria, // Objeto completo {id, nombre} - formato unificado del backend
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
      // Calcular m² (metros cuadrados) = (m1 * m2) / 10000 (si m1 y m2 están en cm)
      m1m2: producto.m1m2 || 
            (producto.m1 && producto.m2 ? ((producto.m1 * producto.m2) / 10000).toFixed(2) : null) || 
            (producto.largoCm && producto.anchoCm ? ((producto.largoCm * producto.anchoCm) / 10000).toFixed(2) : null),
      // Compatibilidad con formato antiguo
      largoCm: producto.largoCm || producto.m1 || null,
      anchoCm: producto.anchoCm || producto.m2 || null,
      grosorMm: producto.grosorMm || producto.mm || null,
      laminas: producto.laminas || null
    };
  });
}

/**
 * Obtiene inventario completo con productos y cantidades por sede
 * GET /api/inventario-completo (retorna todos los productos: normales y vidrios)
 * @param {Object} categoriasMap - Mapa de nombres de categoría a {id, nombre} para mapear IDs
 */
export async function listarInventarioCompleto(params = {}, isAdmin = true, userSedeId = null, categoriasMap = null) {
  try {
    // El endpoint /inventario-completo retorna todos los productos (normales y vidrios)
    const { data } = await api.get("/inventario-completo", { params });
    
    // console.log(` Inventario completo - Productos obtenidos: ${data?.length || 0}`);
    
    const transformados = transformarInventarioDTO(data || [], isAdmin, userSedeId, categoriasMap);
    
    return transformados;
  } catch (error) {
    throw error;
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

/**
 * Actualizar inventario de un producto por productoId y sedeId
 * PUT /api/inventario/{productoId}/{sedeId}
 * @param {number} productoId - ID del producto
 * @param {number} sedeId - ID de la sede (1: Ínsula, 2: Centro, 3: Patios)
 * @param {number} cantidad - Nueva cantidad
 */
export async function actualizarInventarioPorSede(productoId, sedeId, cantidad) {
  const { data } = await api.put(`/inventario/${productoId}/${sedeId}`, { cantidad });
  return data;
}

/**
 * Actualizar inventario de un producto para múltiples sedes
 * PUT /api/inventario/producto/{productoId}
 * @param {number} productoId - ID del producto
 * @param {Object} inventario - Objeto con cantidades por sede
 * @param {number} inventario.cantidadInsula - Cantidad para sede Ínsula (ID: 1)
 * @param {number} inventario.cantidadCentro - Cantidad para sede Centro (ID: 2)
 * @param {number} inventario.cantidadPatios - Cantidad para sede Patios (ID: 3)
 */
export async function actualizarInventarioPorProducto(productoId, inventario) {
  const payload = {
    cantidadInsula: inventario.cantidadInsula || 0,
    cantidadCentro: inventario.cantidadCentro || 0,
    cantidadPatios: inventario.cantidadPatios || 0
  };
  const { data } = await api.put(`/inventario/producto/${productoId}`, payload);
  return data;
}
