import { api } from "../lib/api";

/* ================================================
   ÓRDENES - CRUD PRINCIPAL
   ================================================ */

// GET /api/ordenes → datos básicos  
export async function listarOrdenes(params = {}) {
  const { data } = await api.get("ordenes", { params });
  return data || [];
}

// GET /api/ordenes/tabla → datos optimizados
// @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
export async function listarOrdenesTabla(params = {}) {
  const { data } = await api.get("ordenes/tabla", { params });
  return data || [];
}

// GET /api/ordenes/credito?clienteId=X → órdenes a crédito del cliente con creditoDetalle
export async function listarOrdenesCredito(clienteId) {
  if (!clienteId) {
    throw new Error("clienteId es obligatorio para listar órdenes a crédito");
  }
  const { data } = await api.get("ordenes/credito", { params: { clienteId } });
  return data || [];
}

// GET /api/ordenes/{id}
export async function obtenerOrden(id) {
  const { data } = await api.get(`ordenes/${id}`);
  return data;
}

// GET /api/ordenes/{id}/detalle
export async function obtenerOrdenDetalle(id) {
  const { data } = await api.get(`ordenes/${id}/detalle`);
  return data;
}

// POST /api/ordenes
export async function crearOrden(payload) {
  const { data } = await api.post("ordenes", payload);
  return data;
}

// POST /api/ordenes/venta - Crear orden de venta específica
export async function crearOrdenVenta(payload) {
  try {
    // Validar campos obligatorios según la documentación
    if (!payload.clienteId || isNaN(Number(payload.clienteId))) {
      throw new Error("clienteId es obligatorio y debe ser un número válido");
    }
    if (!payload.sedeId || isNaN(Number(payload.sedeId))) {
      throw new Error("sedeId es obligatorio y debe ser un número válido");
    }
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("La orden debe tener al menos 1 item");
    }

    // Validar que todos los items tengan datos válidos
    const itemsInvalidos = payload.items.filter(item => 
      !item.productoId || isNaN(Number(item.productoId)) || Number(item.productoId) === 0 ||
      !item.cantidad || isNaN(Number(item.cantidad)) || Number(item.cantidad) <= 0 ||
      !item.precioUnitario || isNaN(Number(item.precioUnitario)) || Number(item.precioUnitario) <= 0
    );
    if (itemsInvalidos.length > 0) {
      throw new Error("Todos los items deben tener productoId, cantidad y precioUnitario válidos (mayor a 0)");
    }

    //  LOG: Verificar payload antes de enviar
    // console.log(" Payload completo para crear orden:", {
    //   fecha: payload.fecha,
    //   clienteId: payload.clienteId,
    //   sedeId: payload.sedeId,
    //   totalItems: payload.items?.length || 0,
    //   items: payload.items?.map(item => ({
    //     productoId: item.productoId,
    //     productoIdParsed: parseInt(item.productoId),
    //     cantidad: item.cantidad,
    //     precioUnitario: item.precioUnitario
    //   })) || []
    // });
    
    // Formato correcto para el backend actualizado
    const ordenData = {
      fecha: payload.fecha, // Incluir fecha en el payload (formato YYYY-MM-DD)
      obra: payload.obra || "",
      descripcion: payload.descripcion || null,
      venta: Boolean(payload.venta ?? false),
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      tieneRetencionFuente: Boolean(payload.tieneRetencionFuente ?? false),
      retencionFuente: parseFloat(payload.retencionFuente || 0), // Valor calculado de retención en la fuente
      clienteId: parseInt(payload.clienteId), // OBLIGATORIO
      sedeId: parseInt(payload.sedeId), // OBLIGATORIO
      // trabajadorId es opcional según la documentación
      ...(payload.trabajadorId ? { trabajadorId: parseInt(payload.trabajadorId) } : {}),
      items: payload.items.map(item => {
        const productoId = parseInt(item.productoId);
        
        //  LOG: Verificar cada item antes de parsear
        if (!productoId || productoId === 0 || isNaN(productoId)) {
          console.error(" ERROR: Item con productoId inválido en crearOrdenVenta:", {
            productoId: item.productoId,
            productoIdParsed: productoId,
            item: item
          });
        }
        
        return {
          productoId: productoId,
          cantidad: parseFloat(item.cantidad),
          descripcion: String(item.descripcion || ""),
          precioUnitario: parseFloat(item.precioUnitario),
          // reutilizarCorteSolicitadoId es opcional
          ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: parseInt(item.reutilizarCorteSolicitadoId) } : {})
        };
      }),
      // 🆕 NUEVO: Incluir cortes pendientes
      cortes: payload.cortes ? payload.cortes.map(corte => {
        // Nueva estructura: cantidadesPorSede (array de {sedeId, cantidad})
        // Si viene la nueva estructura, usarla; si no, migrar de la antigua
        let cantidadesPorSede = corte.cantidadesPorSede;
        if (!cantidadesPorSede && (corte.cantidadInsula !== undefined || corte.cantidadCentro !== undefined || corte.cantidadPatios !== undefined)) {
          // Migración: convertir de formato antiguo a nuevo
          cantidadesPorSede = [
            { sedeId: 1, cantidad: parseInt(corte.cantidadInsula || 0) },
            { sedeId: 2, cantidad: parseInt(corte.cantidadCentro || 0) },
            { sedeId: 3, cantidad: parseInt(corte.cantidadPatios || 0) }
          ];
        } else if (!cantidadesPorSede) {
          // Si no viene ninguna estructura, usar cantidad general en la sede de la orden
          const sedeId = parseInt(payload.sedeId || 1);
          cantidadesPorSede = [
            { sedeId: 1, cantidad: sedeId === 1 ? parseInt(corte.cantidad || 1) : 0 },
            { sedeId: 2, cantidad: sedeId === 2 ? parseInt(corte.cantidad || 1) : 0 },
            { sedeId: 3, cantidad: sedeId === 3 ? parseInt(corte.cantidad || 1) : 0 }
          ];
        }
        
        return {
          productoId: parseInt(corte.productoId),
          medidaSolicitada: parseInt(corte.medidaSolicitada),
          cantidad: parseInt(corte.cantidad || 1),
          precioUnitarioSolicitado: parseFloat(corte.precioUnitarioSolicitado),
          precioUnitarioSobrante: parseFloat(corte.precioUnitarioSobrante),
          cantidadesPorSede: cantidadesPorSede,
          // Campo opcional para evitar duplicados de cortes
          reutilizarCorteId: corte.reutilizarCorteId ? parseInt(corte.reutilizarCorteId) : undefined,
          medidaSobrante: corte.medidaSobrante ? parseInt(corte.medidaSobrante) : undefined,
          // Campo esSobrante se mantiene por compatibilidad pero ya no se usa en el backend
          // El backend ahora incrementa inventario de AMBOS cortes (+1 cada uno)
          // Luego, al procesar la venta, decrementa el solicitado (-1)
          esSobrante: corte.esSobrante !== undefined ? Boolean(corte.esSobrante) : true, // Por defecto true para compatibilidad
        };
      }) : []
    };
    
    const { data } = await api.post("ordenes/venta", ordenData);
    
    return data;
  } catch (error) {
    // Solo hacer fallback si es 404 (endpoint no existe), no en otros errores
    if (error.response?.status === 404) {
      const { data } = await api.post("ordenes", payload);
      return data;
    }
    
    // Para errores 400, 500 etc, no hacer fallback, propagar el error
    throw error;
  }
}

// Función alternativa para probar directamente con el endpoint original
export async function crearOrdenOriginal(payload) {
  const { data } = await api.post("ordenes", payload);
  return data;
}

//  PUT /api/ordenes/tabla/{id} (endpoint correcto del backend)
export async function actualizarOrden(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  const { data } = await api.put(`ordenes/tabla/${id}`, payload);
  return data;
}

/**
 * 💰 ACTUALIZAR RETENCIÓN DE FUENTE DE UNA ORDEN
 * 
 * Endpoint especializado para actualizar SOLO la retención sin enviar todos los datos
 * 
 * @param {number} ordenId - ID de la orden
 * @param {Object} payload - Datos de retención
 * @param {boolean} payload.tieneRetencionFuente - Si tiene retención
 * @param {number} payload.retencionFuente - Valor de la retención
 * @param {number} [payload.iva] - Valor del IVA (opcional)
 * @returns {Promise<Object>} Respuesta del backend con mensaje y orden actualizada
 */
export async function actualizarRetencionFuente(ordenId, payload) {
  if (!ordenId) throw new Error("ID de la orden no proporcionado");
  
  try {
    const { data } = await api.put(`ordenes/${ordenId}/retencion-fuente`, {
      tieneRetencionFuente: payload.tieneRetencionFuente,
      retencionFuente: payload.retencionFuente,
      iva: payload.iva // Opcional
    });
    
    // El backend retorna { mensaje: "...", orden: {...} }
    return data;
  } catch (error) {
    console.error('❌ Error actualizando retención de fuente:', error);
    throw error;
  }
}

//  Confirmar venta (cambiar venta de false a true)
export async function confirmarVenta(id, ordenCompleta) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  if (!ordenCompleta) throw new Error("Datos de la orden no proporcionados");
  
  // Si la orden era una cotización (venta === false), al confirmarla como venta
  // automáticamente se convierte en crédito ya que no se pueden agregar métodos de pago
  const eraCotizacion = Boolean(ordenCompleta.venta === false);
  
  // Validar y filtrar items con productoId válido
  const itemsValidos = (Array.isArray(ordenCompleta.items) ? ordenCompleta.items : [])
    .map(item => {
      // Intentar obtener productoId de diferentes fuentes:
      // 1. item.productoId (directo)
      // 2. item.producto.id (del objeto producto - común cuando viene de /ordenes/tabla)
      let productoId = item.productoId;
      
      // Si productoId es null, undefined o 0, intentar desde el objeto producto
      if (productoId === null || productoId === undefined || productoId === 0) {
        productoId = item.producto?.id;
        // Validar que el producto tenga ID
        if (item.producto && !productoId) {
          // El producto no tiene ID válido, usar el ID del objeto producto si existe
          productoId = item.producto?.id;
        }
      }
      
      // Convertir a número y validar (solo si productoId tiene un valor válido)
      let productoIdNum = 0;
      if (productoId !== null && productoId !== undefined && productoId !== '' && productoId !== 0) {
        productoIdNum = Number(productoId);
        // Si la conversión falla, intentar de nuevo
        if (isNaN(productoIdNum)) {
          productoIdNum = 0;
        }
      }
      
      // Si no hay productoId válido, retornar null para filtrarlo después
      if (!productoIdNum || productoIdNum === 0 || isNaN(productoIdNum)) {
        console.warn(" Item sin productoId válido en confirmarVenta:", {
          itemId: item.id,
          productoIdOriginal: item.productoId,
          producto: item.producto,
          productoIdDesdeProducto: item.producto?.id,
          productoIdFinal: productoIdNum,
          nombre: item.nombre || item.descripcion,
          itemCompleto: item // Para debug completo
        });
        return null;
      }
      
      return {
        id: item.id ?? null,
        productoId: productoIdNum,
        descripcion: item.descripcion ?? "",
        cantidad: Number(item.cantidad ?? 1),
        precioUnitario: Number(item.precioUnitario ?? 0),
        totalLinea: Number(item.totalLinea ?? 0),
        ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: Number(item.reutilizarCorteSolicitadoId) } : {})
      };
    })
    .filter(item => item !== null); // Filtrar items inválidos
  
  // Validar que haya al menos un item válido
  if (itemsValidos.length === 0) {
    throw new Error("La orden no tiene items válidos con productoId. No se puede confirmar la venta.");
  }
  
  // Validar IDs requeridos
  const clienteId = ordenCompleta.clienteId || ordenCompleta.cliente?.id;
  const sedeId = ordenCompleta.sedeId || ordenCompleta.sede?.id;
  
  if (!clienteId) {
    throw new Error("La orden no tiene clienteId. No se puede confirmar la venta.");
  }
  
  if (!sedeId) {
    throw new Error("La orden no tiene sedeId. No se puede confirmar la venta.");
  }
  
  // Construir payload con todos los campos necesarios
  const payload = {
    fecha: ordenCompleta.fecha,
    obra: ordenCompleta.obra || "",
    descripcion: ordenCompleta.descripcion || null,
    venta: true, // Cambiar a true (confirmar como venta)
    // Si era cotización, automáticamente se convierte en crédito
    // Si ya era venta, mantener el valor de crédito que tenía
    credito: eraCotizacion ? true : Boolean(ordenCompleta.credito),
    tieneRetencionFuente: Boolean(ordenCompleta.tieneRetencionFuente ?? false),
    clienteId: Number(clienteId),
    sedeId: Number(sedeId),
    ...(ordenCompleta.trabajadorId || ordenCompleta.trabajador?.id ? { trabajadorId: Number(ordenCompleta.trabajadorId || ordenCompleta.trabajador?.id) } : {}),
    items: itemsValidos
  };
  
  const { data } = await api.put(`ordenes/tabla/${id}`, payload);
  return data;
}

//  PUT /api/ordenes/venta/{id} - Actualizar orden de venta específica (maneja inventario)
export async function actualizarOrdenVenta(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  
  try {
    // Filtrar items inválidos (eliminar items con precio 0, cantidad 0, o sin productoId)
    const itemsValidos = payload.items
      .filter(item => !item.eliminar)
      .filter(item => {
        const productoId = Number(item.productoId);
        const cantidad = Number(item.cantidad ?? 0);
        const precioUnitario = Number(item.precioUnitario ?? 0);
        
        return productoId > 0 && cantidad > 0 && precioUnitario > 0;
      });
    
    const totalOrden = itemsValidos.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
    
    // Validar campos obligatorios según la documentación
    if (!payload.clienteId) {
      throw new Error("clienteId es obligatorio para actualizar la orden");
    }
    if (!payload.sedeId) {
      throw new Error("sedeId es obligatorio para actualizar la orden");
    }
    if (!itemsValidos || itemsValidos.length === 0) {
      throw new Error("La orden debe tener al menos 1 item válido");
    }
    
    // Formato exacto para el nuevo endpoint PUT /api/ordenes/venta/{id}
    const ordenData = {
      fecha: payload.fecha,
      obra: payload.obra || "",
      descripcion: payload.descripcion || null,
      venta: Boolean(payload.venta ?? false),
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      tieneRetencionFuente: Boolean(payload.tieneRetencionFuente ?? false),
      clienteId: parseInt(payload.clienteId), // OBLIGATORIO
      sedeId: parseInt(payload.sedeId), // OBLIGATORIO
      // trabajadorId es opcional según la documentación
      ...(payload.trabajadorId ? { trabajadorId: parseInt(payload.trabajadorId) } : {}),
      items: itemsValidos.map(item => {
        const itemData = {
          productoId: parseInt(item.productoId),
          descripcion: String(item.descripcion || ""),
          cantidad: parseInt(item.cantidad),
          precioUnitario: parseFloat(item.precioUnitario),
        };
        
        // Incluir ID del item si existe (para items existentes que se están modificando)
        if (item.id) {
          itemData.id = parseInt(item.id);
        }
        
        // reutilizarCorteSolicitadoId es opcional
        if (item.reutilizarCorteSolicitadoId) {
          itemData.reutilizarCorteSolicitadoId = parseInt(item.reutilizarCorteSolicitadoId);
        }
        
        return itemData;
      }),
      // 🆕 NUEVO: Incluir cortes pendientes si existen
      cortes: payload.cortes ? payload.cortes.map(corte => ({
        productoId: parseInt(corte.productoId),
        medidaSolicitada: parseInt(corte.medidaSolicitada),
        cantidad: parseInt(corte.cantidad || 1),
        precioUnitarioSolicitado: parseFloat(corte.precioUnitarioSolicitado),
        precioUnitarioSobrante: parseFloat(corte.precioUnitarioSobrante)
      })) : []
    };
    
    const { data } = await api.put(`ordenes/venta/${id}`, ordenData);
    return data;
  } catch (error) {
    // Manejo específico de errores del nuevo endpoint
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.message || "Error de validación en la orden";
      throw new Error(`Error de validación: ${errorMsg}`);
    }
    
    if (error.response?.status === 409) {
      const errorMsg = error.response?.data?.message || "Conflicto de stock";
      throw new Error(`Conflicto de stock: ${errorMsg}`);
    }
    
    if (error.response?.status === 500) {
      const errorMsg = error.response?.data?.message || "Error interno del servidor";
      throw new Error(`Error interno del servidor: ${errorMsg}`);
    }
    
    // Fallback al endpoint original solo si es 404 (endpoint no existe)
    if (error.response?.status === 404) {
      const { data } = await api.put(`ordenes/tabla/${id}`, payload);
      return data;
    }
    
    // Para otros errores (500, etc), propagar el error original
    throw error;
  }
}

// DELETE /api/ordenes/{id}
export async function eliminarOrden(id) {
  await api.delete(`ordenes/${id}`);
  return true;
}

// PUT /api/ordenes/{id}/anular
export async function anularOrden(id) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  const { data } = await api.put(`ordenes/${id}/anular`);
  return data;
}

// GET /api/ordenes/proximo-numero
export async function obtenerProximoNumero() {
  const { data } = await api.get("ordenes/proximo-numero");
  return data;
}

/* ================================================
   🧩 ÍTEMS DE ORDEN
   ================================================ */
export async function listarItems(ordenId) {
  const { data } = await api.get(`ordenes/${ordenId}/items`);
  return data || [];
}

export async function crearItem(ordenId, item) {
  const { data } = await api.post(`ordenes/${ordenId}/items`, item);
  return data;
}

export async function actualizarItem(ordenId, itemId, item) {
  const { data } = await api.put(`ordenes/${ordenId}/items/${itemId}`, item);
  return data;
}

export async function eliminarItem(ordenId, itemId) {
  await api.delete(`ordenes/${ordenId}/items/${itemId}`);
  return true;
}

/* ================================================
   ORDENES - VENTAS DEL DÍA
   ================================================ */

// GET /api/ordenes/ventas-dia/sede/{sedeId} → Ventas del día por sede
export async function obtenerVentasDiaSede(sedeId) {
  if (!sedeId) {
    throw new Error("sedeId es obligatorio para obtener ventas del día por sede");
  }
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  
  const { data } = await api.get(`ordenes/ventas-dia/sede/${sedeId}`, {
    params: { fecha: fechaHoy }
  });
  
  return data || [];
}

// GET /api/ordenes/ventas-dia/todas → Ventas del día en todas las sedes
export async function obtenerVentasDiaTodasSedes() {
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  
  const { data } = await api.get("ordenes/ventas-dia/todas", {
    params: { fecha: fechaHoy }
  });
  
  return data || [];
}

/* ================================================
   ORDENES - FACTURACIÓN
   ================================================ */

// PUT /api/ordenes/{id}/facturar
export async function marcarOrdenComoFacturada(ordenId, facturada = true) {
  const { data } = await api.put(`ordenes/${ordenId}/facturar`, { facturada });
  return data;
}
