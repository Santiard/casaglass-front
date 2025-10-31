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

    return {
      id: producto.productoId || producto.id,
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
      cantidadInsula,
      cantidadCentro,
      cantidadPatios,
      cantidadTotal: producto.cantidadTotal || (cantidadInsula + cantidadCentro + cantidadPatios),
      // Campos para vidrios
      largoCm: producto.largoCm,
      anchoCm: producto.anchoCm,
      grosorMm: producto.grosorMm,
      esVidrio: producto.esVidrio,
      // Compatibilidad
      mm: producto.mm || producto.grosorMm,
      m1m2: producto.m1m2 || (producto.largoCm && producto.anchoCm ? (producto.largoCm * producto.anchoCm / 10000).toFixed(2) : null),
      laminas: producto.laminas
    };
  });
}

/**
 * Obtiene inventario completo con productos y cantidades por sede unificado
 * GET /api/inventario-completo
 */
export async function listarInventarioCompleto(params = {}, isAdmin = true, userSedeId = null) {
  const { data } = await api.get("/inventario-completo", { params });
  console.log("Datos del endpoint /api/inventario-completo:", data);
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
  console.log("📥 Datos RAW del endpoint /api/cortes-inventario-completo:", data);
  console.log("📊 Total de cortes RAW:", data?.length || 0);
  
  // Log detallado de los primeros 5 cortes para ver el stock que viene del backend
  if (data && data.length > 0) {
    console.log("🔍 Primeros 5 cortes RAW (stock del backend):");
    data.slice(0, 5).forEach((c, idx) => {
      console.log(`   Corte ${idx + 1} - ID: ${c.id}, Código: ${c.codigo}, Largo: ${c.largoCm}cm`);
      console.log(`      Stock Insula: ${c.cantidadInsula || 0}, Centro: ${c.cantidadCentro || 0}, Patios: ${c.cantidadPatios || 0}`);
    });
    
    // Buscar el corte más reciente (el que debería tener stock)
    const cortesRecientes = data.slice(-3);
    console.log("🆕 Últimos 3 cortes (más recientes):");
    cortesRecientes.forEach((c, idx) => {
      console.log(`   Corte ${data.length - 3 + idx + 1} - ID: ${c.id}, Código: ${c.codigo}, Largo: ${c.largoCm}cm`);
      console.log(`      Stock Insula: ${c.cantidadInsula || 0}, Centro: ${c.cantidadCentro || 0}, Patios: ${c.cantidadPatios || 0}`);
    });
    
    // Buscar cortes que empiecen con "ANG-NAT-8025" y tengan largo 340 (el sobrante recién creado)
    const cortesSobranteEsperado = data.filter(c => {
      const codigo = (c.codigo || "").toString();
      const largo = Number(c.largoCm || 0);
      return codigo.startsWith("ANG-NAT-8025") && largo === 340;
    });
    if (cortesSobranteEsperado.length > 0) {
      console.log("🎯 Corte sobrante esperado (ANG-NAT-8025, 340cm):");
      cortesSobranteEsperado.forEach(c => {
        console.log(`   ID: ${c.id}, Código: ${c.codigo}`);
        console.log(`   Stock Insula: ${c.cantidadInsula || 0}, Centro: ${c.cantidadCentro || 0}, Patios: ${c.cantidadPatios || 0}`);
      });
    } else {
      console.log("⚠️ No se encontró el corte sobrante (ANG-NAT-8025, 340cm) - puede que no se haya creado");
    }
  }
  
  const transformados = transformarCortesDTO(data || [], isAdmin, userSedeId);
  console.log("📤 Datos transformados de cortes:", transformados?.length || 0, "cortes");
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
