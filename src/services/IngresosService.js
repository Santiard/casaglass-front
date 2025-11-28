// src/services/IngresosService.js
import { api } from "../lib/api.js";
import { listarProductos, actualizarProducto } from "./ProductosService.js";
import { listarInventarioCompleto } from "./InventarioService.js";
import { listarCategorias } from "./CategoriasService.js";

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
  if (!form || typeof form !== "object") {
    throw new Error("Formulario vacío o inválido.");
  }

  // Intentar obtener el proveedor completo o solo el ID
  let proveedorData;
  if (form.proveedor && typeof form.proveedor === 'object' && form.proveedor.id) {
    // Si tenemos el objeto proveedor completo
    proveedorData = form.proveedor;
  } else {
    // Si solo tenemos el ID
    const proveedorIdNum = Number(form.proveedorId);
    
    if (!Number.isFinite(proveedorIdNum) || proveedorIdNum <= 0) {
      console.error("❌ Proveedor inválido:", { proveedorId: form.proveedorId, proveedorIdNum });
      throw new Error("Proveedor inválido. Debes seleccionar un proveedor.");
    }
    
    proveedorData = { id: proveedorIdNum };
  }

  const fecha = form.fecha
    ? toLocalDateString(form.fecha.length === 16 ? new Date(form.fecha) : new Date(form.fecha))
    : toLocalDateString(new Date());

  const detalles = Array.isArray(form.detalles) ? form.detalles : [];
  if (detalles.length === 0) throw new Error("Debes agregar al menos un producto.");

  const mappedDetalles = detalles.map((d, idx) => {
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
    await api.get("/ingresos");
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
  
  // IMPORTANTE: Obtener los productos con inventario ANTES de crear el ingreso para tener las cantidades correctas
  // Usamos listarInventarioCompleto porque incluye cantidadInsula, cantidadCentro, cantidadPatios
  let productosAntes = [];
  try {
    productosAntes = await listarInventarioCompleto({}, true, null);
    console.log("📦 Productos con inventario obtenidos antes de crear el ingreso");
  } catch (error) {
    console.warn("⚠️ No se pudieron obtener productos con inventario antes del ingreso, se intentará después");
  }
  
  try {
    const { data } = await api.post("/ingresos", payload);
    
    // Actualizar costos de productos usando promedio ponderado
    // Pasamos los productos obtenidos ANTES del ingreso
    try {
      await actualizarCostosProductosPromedioPonderado(payload.detalles, productosAntes);
    } catch (costoError) {
      console.error("❌ Error al actualizar costos de productos (el ingreso se creó correctamente):", costoError);
      console.error("📋 Detalles del error:", costoError?.response?.data || costoError?.message);
      // No lanzamos el error para que el ingreso se cree aunque falle la actualización de costos
    }
    
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

/**
 * Actualiza el costo de los productos usando promedio ponderado
 * Fórmula: nuevo_costo = (cantidad_actual * costo_actual + cantidad_nueva * costo_nuevo) / (cantidad_actual + cantidad_nueva)
 * @param {Array} detalles - Detalles del ingreso con producto, cantidad y costoUnitario
 * @param {Array} productosAntes - Productos obtenidos ANTES de crear el ingreso (opcional, si no se proporciona se obtienen después)
 */
async function actualizarCostosProductosPromedioPonderado(detalles, productosAntes = null) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    console.warn("⚠️ No hay detalles para actualizar costos");
    return;
  }

  console.log("🔄 Iniciando actualización de costos con promedio ponderado...");
  console.log("📦 Detalles recibidos:", detalles);

  // Usar productos obtenidos antes del ingreso, o obtenerlos ahora
  let productos;
  if (productosAntes && Array.isArray(productosAntes) && productosAntes.length > 0) {
    productos = productosAntes;
    console.log("✅ Usando productos obtenidos ANTES del ingreso");
  } else {
    productos = await listarProductos();
    console.log("⚠️ Obteniendo productos DESPUÉS del ingreso (puede haber inconsistencias)");
  }
  
  const productosMap = new Map(productos.map(p => [p.id, p]));

  // Obtener categorías una vez para formatear correctamente
  let categorias = [];
  try {
    categorias = await listarCategorias();
    console.log(`✅ Categorías obtenidas: ${categorias.length}`);
  } catch (error) {
    console.warn("⚠️ No se pudieron obtener categorías, se intentará formatear sin ellas");
  }

  // Actualizar cada producto
  const actualizaciones = detalles.map(async (detalle) => {
    const productoId = detalle.producto?.id;
    if (!productoId) {
      console.warn("⚠️ Detalle sin producto.id, saltando actualización de costo");
      return;
    }

    const producto = productosMap.get(productoId);
    if (!producto) {
      console.warn(`⚠️ Producto con ID ${productoId} no encontrado, saltando actualización de costo`);
      return;
    }

    // Calcular cantidad actual sumando las cantidades de las sedes
    // Como obtenemos el producto ANTES del ingreso, estas son las cantidades correctas
    const cantidadInsula = Number(producto.cantidadInsula || 0);
    const cantidadCentro = Number(producto.cantidadCentro || 0);
    const cantidadPatios = Number(producto.cantidadPatios || 0);
    const cantidadAntes = cantidadInsula + cantidadCentro + cantidadPatios;
    const costoActual = Number(producto.costo || 0);
    const cantidadNueva = Number(detalle.cantidad || 0);
    const costoNuevo = Number(detalle.costoUnitario || 0);

    // Debug: mostrar todas las cantidades
    console.log(`   🔍 Debug cantidades del producto:`);
    console.log(`      - cantidadInsula: ${cantidadInsula} (${producto.cantidadInsula})`);
    console.log(`      - cantidadCentro: ${cantidadCentro} (${producto.cantidadCentro})`);
    console.log(`      - cantidadPatios: ${cantidadPatios} (${producto.cantidadPatios})`);
    console.log(`      - cantidad (campo directo): ${producto.cantidad || 'no existe'}`);

    console.log(`📊 Producto ${productoId} (${producto.nombre}):`);
    console.log(`   - Cantidad antes del ingreso: ${cantidadAntes}`);
    console.log(`   - Costo actual: ${costoActual}`);
    console.log(`   - Cantidad nueva: ${cantidadNueva}`);
    console.log(`   - Costo nuevo: ${costoNuevo}`);
    console.log(`   - Cantidad total después del ingreso: ${cantidadAntes + cantidadNueva}`);

    // Validar que tenemos datos válidos
    if (cantidadNueva <= 0 || costoNuevo <= 0) {
      console.warn(`⚠️ Detalle con cantidad o costo inválido, saltando actualización de costo para producto ${productoId}`);
      return;
    }

    // Calcular nuevo costo usando promedio ponderado
    // Fórmula: nuevo_costo = (cantidad_antes * costo_actual + cantidad_nueva * costo_nuevo) / (cantidad_antes + cantidad_nueva)
    // Si no hay cantidad antes, usar directamente el costo nuevo
    let nuevoCosto;
    if (cantidadAntes <= 0) {
      nuevoCosto = costoNuevo;
      console.log(`   ✅ No había cantidad previa, usando costo nuevo: ${nuevoCosto}`);
    } else {
      const totalCostoAntes = cantidadAntes * costoActual;
      const totalCostoNuevo = cantidadNueva * costoNuevo;
      const cantidadTotal = cantidadAntes + cantidadNueva;
      nuevoCosto = (totalCostoAntes + totalCostoNuevo) / cantidadTotal;
      console.log(`   📐 Cálculo: (${cantidadAntes} * ${costoActual} + ${cantidadNueva} * ${costoNuevo}) / ${cantidadTotal}`);
      console.log(`   📐 Cálculo: (${totalCostoAntes} + ${totalCostoNuevo}) / ${cantidadTotal} = ${nuevoCosto}`);
    }

    // Redondear al entero más cercano (sin decimales)
    nuevoCosto = Math.ceil(nuevoCosto);
    console.log(`   ✅ Nuevo costo calculado (redondeado hacia arriba): ${nuevoCosto}`);

    // Preparar payload para actualizar el producto
    // Incluir todos los campos necesarios para evitar errores
    // IMPORTANTE: Formatear la categoría correctamente (el backend espera un objeto con id y nombre)
    let categoriaFormateada = null;
    if (producto.categoria) {
      if (typeof producto.categoria === 'object' && producto.categoria !== null) {
        // Si es un objeto, verificar que tenga id y nombre
        if (producto.categoria.id && producto.categoria.nombre) {
          categoriaFormateada = {
            id: producto.categoria.id,
            nombre: producto.categoria.nombre
          };
        } else if (producto.categoria.nombre) {
          // Si solo tiene nombre, buscar el id en las categorías obtenidas
          const categoriaEncontrada = categorias.find(cat => cat.nombre === producto.categoria.nombre);
          if (categoriaEncontrada) {
            categoriaFormateada = {
              id: categoriaEncontrada.id,
              nombre: categoriaEncontrada.nombre
            };
          } else {
            categoriaFormateada = { nombre: producto.categoria.nombre };
          }
        } else {
          categoriaFormateada = producto.categoria;
        }
      } else if (typeof producto.categoria === 'string') {
        // Si es un string, puede ser el nombre o el ID
        // Primero intentar buscar por nombre
        let categoriaEncontrada = categorias.find(cat => cat.nombre === producto.categoria);
        // Si no se encuentra por nombre, intentar por ID
        if (!categoriaEncontrada) {
          const categoriaId = Number(producto.categoria);
          if (!isNaN(categoriaId)) {
            categoriaEncontrada = categorias.find(cat => cat.id === categoriaId);
          }
        }
        
        if (categoriaEncontrada) {
          categoriaFormateada = {
            id: categoriaEncontrada.id,
            nombre: categoriaEncontrada.nombre
          };
        } else {
          // Si no se encuentra, crear objeto solo con nombre (o el string como nombre)
          categoriaFormateada = { nombre: producto.categoria };
        }
      }
    }

    const payloadActualizacion = {
      id: productoId, // IMPORTANTE: El backend requiere el ID para actualizar
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: categoriaFormateada,
      tipo: producto.tipo,
      color: producto.color,
      costo: nuevoCosto, // ✅ Este es el costo calculado con promedio ponderado
      precio1: producto.precio1 || 0,
      precio2: producto.precio2 || 0,
      precio3: producto.precio3 || 0,
      descripcion: producto.descripcion || "",
      posicion: producto.posicion || "",
      version: producto.version || 0
    };
    
    console.log(`   🔍 Categoría formateada:`, categoriaFormateada);
    console.log(`   🔍 Categoría original:`, producto.categoria);

    // IMPORTANTE: NO enviar las cantidades por sede porque el backend ya las actualizó al crear el ingreso
    // Si enviamos las cantidades antiguas, el backend podría sobrescribir las nuevas cantidades
    // Solo actualizamos el costo, no las cantidades
    // Las cantidades ya fueron actualizadas por el backend cuando se creó el ingreso
    
    // Obtener el producto actualizado del backend para tener las cantidades correctas
    // Pero solo si es necesario para el payload
    // Por ahora, NO incluimos las cantidades para evitar sobrescribir las que el backend ya actualizó

    // Actualizar el producto
    try {
      console.log(`   📤 Enviando actualización del producto ${productoId} con costo: ${nuevoCosto}`);
      console.log(`   📤 Payload completo:`, JSON.stringify(payloadActualizacion, null, 2));
      const resultado = await actualizarProducto(productoId, payloadActualizacion);
      console.log(`   ✅ Respuesta del backend:`, resultado);
      console.log(`✅ Costo actualizado para producto ${productoId} (${producto.nombre}): ${costoActual} → ${nuevoCosto} (cantidad antes: ${cantidadAntes} + cantidad nueva: ${cantidadNueva} = ${cantidadAntes + cantidadNueva})`);
      
      // Disparar evento personalizado para refrescar el inventario
      window.dispatchEvent(new CustomEvent('inventory-updated', { 
        detail: { productoId, nuevoCosto } 
      }));
    } catch (updateError) {
      console.error(`❌ Error al actualizar costo del producto ${productoId}:`, updateError);
      console.error(`❌ Detalles del error:`, updateError?.response?.data || updateError?.message);
      throw updateError;
    }
  });

  await Promise.all(actualizaciones);
}

export async function actualizarIngresoDesdeForm(id, form) {
  // Validar que el ID sea válido
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  const payload = mapFormAIngresoAPI(form);
  // Agregar el ID al payload como lo requiere el endpoint
  payload.id = numericId;
  
  try {
    const { data } = await api.put(`/ingresos/${id}`, payload);
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
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/procesar`);
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
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/marcar-procesado`);
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
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/reprocesar`);
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
