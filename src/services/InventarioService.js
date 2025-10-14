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
    // Mapear inventarios a cantidades por sede (IDs fijos: 1=Insula, 2=Centro, 3=Patios)
    const inventarios = producto.inventarios || [];
    let cantidadInsula = 0;
    let cantidadCentro = 0; 
    let cantidadPatios = 0;

    inventarios.forEach(inv => {
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

    // Para vendedores, mostrar solo su sede
    if (!isAdmin && userSedeId) {
      const miInventario = inventarios.find(inv => inv.sedeId === userSedeId);
      const miCantidad = miInventario?.cantidad || 0;
      
      // Resetear todas las cantidades y mostrar solo la del vendedor en la sede correspondiente
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
      id: producto.productoId,
      codigo: producto.codigo,
      nombre: producto.nombre,
      posicion: producto.posicion,
      tipo: producto.tipo,
      color: producto.color,
      categoria: producto.categoria,
      descripcion: producto.descripcion,
      costo: producto.costo,
      precio1: producto.precio1,
      precio2: producto.precio2,
      precio3: producto.precio3,
      precioEspecial: producto.precioEspecial,
      cantidadInsula,
      cantidadCentro,
      cantidadPatios,
      cantidadTotal: isAdmin ? producto.cantidadTotal : (cantidadInsula + cantidadCentro + cantidadPatios),
      // Campos para vidrios
      largoCm: producto.largoCm,
      anchoCm: producto.anchoCm,
      grosorMm: producto.grosorMm,
      // Compatibilidad
      mm: producto.grosorMm,
      m1m2: producto.largoCm && producto.anchoCm ? (producto.largoCm * producto.anchoCm / 10000).toFixed(2) : null
    };
  });
}

/**
 * Obtiene inventario completo con productos y cantidades por sede unificado
 * GET /api/inventario-completo
 */
export async function listarInventarioCompleto(params = {}, isAdmin = true, userSedeId = null) {
  const { data } = await api.get("/inventario-completo", { params });
  return transformarInventarioDTO(data || [], isAdmin, userSedeId);
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
      id: corte.id,
      codigo: corte.codigo,
      nombre: corte.nombre,
      categoria: corte.categoria,
      largoCm: corte.largoCm,
      precio: corte.precio,
      observacion: corte.observacion,
      cantidadInsula,
      cantidadCentro,
      cantidadPatios,
      cantidadTotal: isAdmin ? corte.cantidadTotal : (cantidadInsula + cantidadCentro + cantidadPatios),
      precio1: corte.precio1,
      precio2: corte.precio2,
      precio3: corte.precio3,
      precioEspecial: corte.precioEspecial
    };
  });
}

/**
 * Obtiene inventario completo de cortes con cantidades por sede
 * GET /api/cortes-inventario-completo
 */
export async function listarCortesInventarioCompleto(params = {}, isAdmin = true, userSedeId = null) {
  const { data } = await api.get("/cortes-inventario-completo", { params });
  return transformarCortesDTO(data || [], isAdmin, userSedeId);
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
