import { api } from "../lib/api";

/* ================================================
   📦 ÓRDENES - CRUD PRINCIPAL
   ================================================ */

// GET /api/ordenes → datos básicos  
export async function listarOrdenes(params = {}) {
  const { data } = await api.get("ordenes", { params });
  return data || [];
}

// GET /api/ordenes/tabla → datos optimizados
export async function listarOrdenesTabla(params = {}) {
  const { data } = await api.get("ordenes/tabla", { params });
  return data || [];
}

// GET /api/ordenes/{id}
export async function obtenerOrden(id) {
  try {
    const response = await api.get(`ordenes/${id}`);
    // Asegurar que data sea un objeto, no un string
    let data = response.data;
    if (typeof data === 'string') {
      console.warn("⚠️ Response.data es string, parseando...");
      data = JSON.parse(data);
    }
    
    return data;
  } catch (error) {
    console.error("❌ Error en obtenerOrden:", error);
    throw error;
  }
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

    // Formato correcto para el backend actualizado
    const ordenData = {
      obra: payload.obra || "",
      descripcion: payload.descripcion || null,
      venta: Boolean(payload.venta ?? false),
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      descuentos: parseFloat(payload.descuentos || 0),
      clienteId: parseInt(payload.clienteId), // OBLIGATORIO
      sedeId: parseInt(payload.sedeId), // OBLIGATORIO
      // trabajadorId es opcional según la documentación
      ...(payload.trabajadorId ? { trabajadorId: parseInt(payload.trabajadorId) } : {}),
      items: payload.items.map(item => ({
        productoId: parseInt(item.productoId),
        cantidad: parseInt(item.cantidad),
        descripcion: String(item.descripcion || ""),
        precioUnitario: parseFloat(item.precioUnitario),
        // reutilizarCorteSolicitadoId es opcional
        ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: parseInt(item.reutilizarCorteSolicitadoId) } : {})
      })),
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
          // Indicar que solo el SOBRANTE debe incrementar stock (el solicitado se vende inmediatamente)
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

// ✅ PUT /api/ordenes/tabla/{id} (endpoint correcto del backend)
export async function actualizarOrden(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  const { data } = await api.put(`ordenes/tabla/${id}`, payload);
  return data;
}

// ✅ Confirmar venta (cambiar venta de false a true)
export async function confirmarVenta(id, ordenCompleta) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  
  // Construir payload con todos los campos necesarios, cambiando solo venta a true
  const payload = {
    fecha: ordenCompleta.fecha,
    obra: ordenCompleta.obra || "",
    descripcion: ordenCompleta.descripcion || null,
    venta: true, // Cambiar a true
    credito: Boolean(ordenCompleta.credito),
    descuentos: Number(ordenCompleta.descuentos ?? 0),
    clienteId: ordenCompleta.clienteId || ordenCompleta.cliente?.id ? Number(ordenCompleta.clienteId || ordenCompleta.cliente?.id) : null,
    sedeId: ordenCompleta.sedeId || ordenCompleta.sede?.id ? Number(ordenCompleta.sedeId || ordenCompleta.sede?.id) : null,
    trabajadorId: ordenCompleta.trabajadorId || ordenCompleta.trabajador?.id ? Number(ordenCompleta.trabajadorId || ordenCompleta.trabajador?.id) : null,
    items: (Array.isArray(ordenCompleta.items) ? ordenCompleta.items : []).map(item => ({
      id: item.id ?? null,
      productoId: Number(item.productoId || item.producto?.id),
      descripcion: item.descripcion ?? "",
      cantidad: Number(item.cantidad ?? 1),
      precioUnitario: Number(item.precioUnitario ?? 0),
      totalLinea: Number(item.totalLinea ?? 0),
      ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: Number(item.reutilizarCorteSolicitadoId) } : {})
    }))
  };
  
  const { data } = await api.put(`ordenes/tabla/${id}`, payload);
  return data;
}

// ✅ PUT /api/ordenes/venta/{id} - Actualizar orden de venta específica (maneja inventario)
export async function actualizarOrdenVenta(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  
  try {
    // Calcular el total de la orden
    const itemsValidos = payload.items.filter(item => !item.eliminar);
    const totalOrden = itemsValidos.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
    
    // Validar campos obligatorios según la documentación
    if (!payload.clienteId) {
      throw new Error("clienteId es obligatorio para actualizar la orden");
    }
    if (!payload.sedeId) {
      throw new Error("sedeId es obligatorio para actualizar la orden");
    }
    if (!itemsValidos || itemsValidos.length === 0) {
      throw new Error("La orden debe tener al menos 1 item");
    }
    
    // Formato exacto para el nuevo endpoint PUT /api/ordenes/venta/{id}
    const ordenData = {
      fecha: payload.fecha,
      obra: payload.obra || "",
      descripcion: payload.descripcion || null,
      venta: Boolean(payload.venta ?? false),
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      descuentos: parseFloat(payload.descuentos || 0),
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
   📄 ORDENES - FACTURACIÓN
   ================================================ */

// PUT /api/ordenes/{id}/facturar
export async function marcarOrdenComoFacturada(ordenId, facturada = true) {
  const { data } = await api.put(`ordenes/${ordenId}/facturar`, { facturada });
  return data;
}
