// src/services/IngresosService.js
import { api } from "../lib/api.js";

// === Utils ===
export function toLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Convierte el form del modal al payload que espera el backend
function mapFormAIngresoAPI(form = {}) {
  console.log("🔍 mapFormAIngresoAPI - Formulario recibido:", form);
  
  if (!form || typeof form !== "object") {
    throw new Error("Formulario vacío o inválido.");
  }

  console.log("🔍 proveedorId del form:", form.proveedorId, "tipo:", typeof form.proveedorId);
  console.log("🔍 proveedor completo del form:", form.proveedor);
  
  // Intentar obtener el proveedor completo o solo el ID
  let proveedorData;
  if (form.proveedor && typeof form.proveedor === 'object' && form.proveedor.id) {
    // Si tenemos el objeto proveedor completo
    proveedorData = form.proveedor;
    console.log("✅ Usando proveedor completo:", proveedorData);
  } else {
    // Si solo tenemos el ID
    const proveedorIdNum = Number(form.proveedorId);
    console.log("🔍 proveedorIdNum convertido:", proveedorIdNum);
    
    if (!Number.isFinite(proveedorIdNum) || proveedorIdNum <= 0) {
      console.error("❌ Proveedor inválido:", { proveedorId: form.proveedorId, proveedorIdNum });
      throw new Error("Proveedor inválido. Debes seleccionar un proveedor.");
    }
    
    proveedorData = { id: proveedorIdNum };
    console.log("✅ Usando solo ID de proveedor:", proveedorData);
  }

  const fecha = form.fecha
    ? toLocalDateString(form.fecha.length === 16 ? new Date(form.fecha) : new Date(form.fecha))
    : toLocalDateString(new Date());

  const detalles = Array.isArray(form.detalles) ? form.detalles : [];
  if (detalles.length === 0) throw new Error("Debes agregar al menos un producto.");

  const mappedDetalles = detalles.map((d, idx) => {
    console.log(`🔍 Procesando detalle #${idx + 1}:`, d);
    console.log(`🔍 Producto del detalle:`, d?.producto);
    
    const prodId = Number(d?.producto?.id);
    const cantidad = Number(d?.cantidad);
    const costoUnitario = Number(d?.costoUnitario);
    const totalLinea = cantidad * costoUnitario;

    if (!Number.isFinite(prodId) || prodId <= 0) {
      throw new Error(`Detalle #${idx + 1}: producto inválido. Producto recibido: ${JSON.stringify(d?.producto)}`);
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      throw new Error(`Detalle #${idx + 1}: cantidad debe ser ≥ 1.`);
    }
    if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
      throw new Error(`Detalle #${idx + 1}: costo unitario debe ser > 0.`);
    }

    const detalleMapeado = {
      producto: { 
        id: prodId
      },
      cantidad,
      costoUnitario,
      totalLinea
    };
    
    console.log(`✅ Detalle #${idx + 1} mapeado:`, detalleMapeado);
    return detalleMapeado;
  });

  // Calcular totalCosto
  const totalCosto = mappedDetalles.reduce((sum, detalle) => sum + detalle.totalLinea, 0);

  const payload = {
    fecha,
    proveedor: proveedorData,
    numeroFactura: (form.numeroFactura || "").trim(),
    observaciones: (form.observaciones || "").trim(),
    detalles: mappedDetalles,
    totalCosto,
    procesado: false // Las actualizaciones siempre son no procesadas para permitir edición
  };

  console.log("✅ Payload final para enviar al backend:", payload);
  return payload;
}

// === API CRUD ===
export async function listarIngresos() {
  const { data } = await api.get("/ingresos");
  return data;
}

// Función de prueba para verificar conectividad
export async function probarConectividad() {
  try {
    console.log("🧪 Probando conectividad con el backend...");
    const response = await api.get("/ingresos");
    console.log("✅ Conectividad OK:", response.status);
    return true;
  } catch (error) {
    console.error("❌ Error de conectividad:", error);
    return false;
  }
}

export async function obtenerIngreso(id) {
  const { data } = await api.get(`/ingresos/${id}`);
  return data;
}

export async function crearIngresoDesdeForm(form) {
  const payload = mapFormAIngresoAPI(form);
  // Al crear un ingreso nuevo, siempre va procesado: false
  payload.procesado = false;
  console.log("✅ Creando ingreso con procesado: false", payload);
  
  try {
    const { data } = await api.post("/ingresos", payload);
    console.log("✅ Ingreso creado exitosamente:", data);
    return data;
  } catch (error) {
    console.error("❌ Error completo al crear ingreso:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw error;
  }
}

export async function actualizarIngresoDesdeForm(id, form) {
  console.log("🔍 actualizarIngresoDesdeForm - ID recibido:", id, "tipo:", typeof id);
  console.log("🔍 actualizarIngresoDesdeForm - Form recibido:", form);
  
  // Validar que el ID sea válido
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  const payload = mapFormAIngresoAPI(form);
  // Agregar el ID al payload como lo requiere el endpoint
  payload.id = numericId;
  
  const fullUrl = `${api.defaults.baseURL}/ingresos/${id}`;
  console.log("🔍 URL completa para PUT:", fullUrl);
  console.log("✅ Payload con ID para actualización:", payload);
  
  try {
    const { data } = await api.put(`/ingresos/${id}`, payload);
    console.log("✅ Respuesta exitosa del PUT:", data);
    return data;
  } catch (error) {
    console.error("❌ Error en PUT /ingresos/{id}:", {
      url: fullUrl,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    console.error("📋 Detalle completo del error del backend:", error.response?.data);
    
    // Manejar error específico de ingreso procesado
    if (error.response?.status === 404 && 
        typeof error.response?.data === 'string' && 
        error.response.data.includes('ya procesado')) {
      const customError = new Error('No se puede modificar un ingreso que ya ha sido procesado');
      customError.isProcessedIngreso = true;
      throw customError;
    }
    
    throw error;
  }
}

export async function eliminarIngreso(id) {
  await api.delete(`/ingresos/${id}`);
}

export async function procesarIngreso(id) {
  console.log(`🔄 Procesando ingreso ID: ${id} (actualización completa de inventario)`);
  
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/procesar`);
    console.log(`✅ Ingreso ${numericId} procesado correctamente:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error al procesar ingreso ${numericId}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    console.error("📋 Detalle completo del error del backend:", error.response?.data);
    throw error;
  }
}

export async function marcarProcesado(id) {
  console.log(`🔄 Marcando como procesado ingreso ID: ${id} (sin actualizar inventario)`);
  
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/marcar-procesado`);
    console.log(`✅ Ingreso ${numericId} marcado como procesado:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error al marcar ingreso ${numericId} como procesado:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    console.error("📋 Detalle completo del error del backend:", error.response?.data);
    throw error;
  }
}

export async function reprocesarIngreso(id) {
  console.log(`🔄 Reprocesando ingreso ID: ${id} (corrección de procesamiento previo)`);
  
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/reprocesar`);
    console.log(`✅ Ingreso ${numericId} reprocesado correctamente:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error al reprocesar ingreso ${numericId}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    console.error("📋 Detalle completo del error del backend:", error.response?.data);
    throw error;
  }
}
