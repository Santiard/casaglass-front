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
    console.log("🔄 Intentando crear orden con endpoint ordenes/venta...");
    
    // Formato correcto para el backend actualizado
    const ordenData = {
      obra: payload.obra || "",
      venta: true, // Siempre true para órdenes de venta
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      clienteId: parseInt(payload.clienteId),
      trabajadorId: parseInt(payload.trabajadorId),
      sedeId: parseInt(payload.sedeId),
      items: payload.items.map(item => ({
        productoId: parseInt(item.productoId),
        cantidad: parseInt(item.cantidad),
        descripcion: String(item.descripcion || ""),
        precioUnitario: parseFloat(item.precioUnitario)
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
    
    console.log("📦 Payload formateado para backend:", ordenData);
    console.log("🔪 Cortes en payload formateado:", ordenData.cortes);
    console.log("🔍 Total de cortes enviados:", ordenData.cortes.length);
    
    // Log detallado de cada corte para debugging
    ordenData.cortes.forEach((corte, index) => {
      console.log(`📋 Corte ${index + 1} - Detalles completos:`, JSON.stringify(corte, null, 2));
      console.log(`   - productoId: ${corte.productoId}`);
      console.log(`   - medidaSolicitada: ${corte.medidaSolicitada}cm (corte solicitado)`);
      console.log(`   - medidaSobrante: ${corte.medidaSobrante || 'NO ENVIADO'}cm (corte sobrante)`);
      console.log(`   - cantidad: ${corte.cantidad}`);
      console.log(`   - esSobrante: ${corte.esSobrante ? 'true ✅ (cantidadesPorSede se aplicarán SOLO al sobrante)' : 'false (no se aplicará incremento de stock)'}`);
      console.log(`   - cantidadesPorSede:`, JSON.stringify(corte.cantidadesPorSede || []));
      console.log(`   - reutilizarCorteId: ${corte.reutilizarCorteId || 'NO ENVIADO (se creará nuevo corte sobrante)'}`);
    });
    
    const { data } = await api.post("ordenes/venta", ordenData);
    console.log("✅ Respuesta del backend:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.warn("⚠️ Endpoint ordenes/venta falló:", error.response?.status, error.response?.data?.message);
    
    // Solo hacer fallback si es 404 (endpoint no existe), no en otros errores
    if (error.response?.status === 404) {
      console.log("🔄 Usando endpoint fallback ordenes...");
      const { data } = await api.post("ordenes", payload);
      return data;
    }
    
    // Para errores 400, 500 etc, no hacer fallback, propagar el error
    throw error;
  }
}

// Función alternativa para probar directamente con el endpoint original
export async function crearOrdenOriginal(payload) {
  console.log("🔄 Creando orden con endpoint original ordenes...");
  const { data } = await api.post("ordenes", payload);
  return data;
}

// ✅ PUT /api/ordenes/tabla/{id} (endpoint correcto del backend)
export async function actualizarOrden(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  const { data } = await api.put(`ordenes/tabla/${id}`, payload);
  return data;
}

// ✅ PUT /api/ordenes/venta/{id} - Actualizar orden de venta específica (maneja inventario)
export async function actualizarOrdenVenta(id, payload) {
  if (!id) throw new Error("ID de la orden no proporcionado");
  
  try {
    console.log("🔄 Intentando actualizar orden de venta con endpoint ordenes/venta...");
    
    // Calcular el total de la orden
    const itemsValidos = payload.items.filter(item => !item.eliminar);
    const totalOrden = itemsValidos.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
    
    // Formato exacto para el nuevo endpoint PUT /api/ordenes/venta/{id}
    const ordenData = {
      fecha: payload.fecha,
      obra: payload.obra || "",
      venta: true, // Siempre true para órdenes de venta
      credito: Boolean(payload.credito),
      incluidaEntrega: Boolean(payload.incluidaEntrega || false),
      clienteId: parseInt(payload.clienteId),
      trabajadorId: parseInt(payload.trabajadorId),
      sedeId: parseInt(payload.sedeId),
      total: parseFloat(totalOrden), // 🆕 NUEVO: Total calculado de la orden
      items: itemsValidos.map(item => ({
        productoId: parseInt(item.productoId),
        descripcion: String(item.descripcion || ""),
        cantidad: parseInt(item.cantidad),
        precioUnitario: parseFloat(item.precioUnitario),
        totalLinea: parseFloat(item.totalLinea)
      })),
      // 🆕 NUEVO: Incluir cortes pendientes si existen
      cortes: payload.cortes ? payload.cortes.map(corte => ({
        productoId: parseInt(corte.productoId),
        medidaSolicitada: parseInt(corte.medidaSolicitada),
        cantidad: parseInt(corte.cantidad || 1),
        precioUnitarioSolicitado: parseFloat(corte.precioUnitarioSolicitado),
        precioUnitarioSobrante: parseFloat(corte.precioUnitarioSobrante)
      })) : []
    };
    
    console.log("📦 Payload formateado para actualización de venta:", ordenData);
    console.log("🔍 Total de items enviados:", ordenData.items.length);
    console.log("💰 Total calculado de la orden:", totalOrden);
    console.log("📊 Desglose de totales por item:", itemsValidos.map(item => ({
      producto: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      totalLinea: item.totalLinea
    })));
    
    const { data } = await api.put(`ordenes/venta/${id}`, ordenData);
    return data;
  } catch (error) {
    console.warn("⚠️ Error en endpoint ordenes/venta/{id}:", error.response?.status, error.response?.data?.message);
    
    // Manejo específico de errores del nuevo endpoint
    if (error.response?.status === 400) {
      const errorMsg = error.response?.data?.message || "Error de validación en la orden";
      console.error("❌ Error 400 - Validación:", errorMsg);
      throw new Error(`Error de validación: ${errorMsg}`);
    }
    
    if (error.response?.status === 409) {
      const errorMsg = error.response?.data?.message || "Conflicto de stock";
      console.error("❌ Error 409 - Concurrencia:", errorMsg);
      throw new Error(`Conflicto de stock: ${errorMsg}`);
    }
    
    if (error.response?.status === 500) {
      const errorMsg = error.response?.data?.message || "Error interno del servidor";
      console.error("❌ Error 500 - Servidor:", errorMsg);
      throw new Error(`Error interno del servidor: ${errorMsg}`);
    }
    
    // Fallback al endpoint original solo si es 404 (endpoint no existe)
    if (error.response?.status === 404) {
      console.log("🔄 Endpoint específico no existe, usando fallback ordenes/tabla/{id}...");
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
