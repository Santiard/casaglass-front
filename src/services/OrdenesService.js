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
      cortes: payload.cortes ? payload.cortes.map(corte => ({
        productoId: parseInt(corte.productoId),
        medidaSolicitada: parseInt(corte.medidaSolicitada),
        precioUnitarioSolicitado: parseFloat(corte.precioUnitarioSolicitado),
        precioUnitarioSobrante: parseFloat(corte.precioUnitarioSobrante),
        cantidadInsula: parseInt(corte.cantidadInsula || 0),
        cantidadCentro: parseInt(corte.cantidadCentro || 0),
        cantidadPatios: parseInt(corte.cantidadPatios || 0)
      })) : []
    };
    
    console.log("📦 Payload formateado para backend:", ordenData);
    console.log("🔪 Cortes en payload formateado:", ordenData.cortes);
    console.log("🔍 Total de cortes enviados:", ordenData.cortes.length);
    
    const { data } = await api.post("ordenes/venta", ordenData);
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
      items: payload.items
        .filter(item => !item.eliminar) // Solo enviar items no eliminados
        .map(item => ({
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
