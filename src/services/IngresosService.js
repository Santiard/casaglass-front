// src/services/IngresosService.js
import { api } from "../lib/api.js";
import { listarProductos, actualizarProducto, actualizarCostoProducto } from "./ProductosService.js";
import { listarInventarioCompleto } from "./InventarioService.js";
import { listarCategorias } from "./CategoriasService.js";
import { toLocalDateOnly } from "../lib/dateUtils.js";

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
      // Proveedor inválido
      throw new Error("Proveedor inválido. Debes seleccionar un proveedor.");
    }
    
    proveedorData = { id: proveedorIdNum };
  }

  const fecha = form.fecha
    ? toLocalDateOnly(form.fecha)
    : toLocalDateOnly(new Date());

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
      costoUnitarioPonderado: costoUnitario, // Usar el mismo costo como ponderado por defecto
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
// @param {Object} params - Parámetros de consulta (puede incluir sedeId para filtrar por sede)
export async function listarIngresos(params = {}) {
  const { data } = await api.get("/ingresos", { params });
  return data;
}

// Función de prueba para verificar conectividad
export async function probarConectividad() {
  try {
    await api.get("/ingresos");
    return true;
  } catch (error) {
    // Error de conectividad
    return false;
  }
}

export async function obtenerIngreso(id) {
  const { data } = await api.get(`/ingresos/${id}`);
  // Respuesta del backend para ingreso
  // Detalles del ingreso
  if (data?.detalles && data.detalles.length > 0) {
    // Primer detalle completo
    // Producto del primer detalle
  }
  return data;
}

export async function crearIngresoDesdeForm(form) {
  // IMPORTANTE: Obtener los productos con inventario ANTES de crear el ingreso para calcular el promedio ponderado
  // Usamos listarInventarioCompleto porque incluye cantidadInsula, cantidadCentro, cantidadPatios
  let productosAntes = [];
  try {
    productosAntes = await listarInventarioCompleto({}, true, null);
    // Productos con inventario obtenidos antes de crear el ingreso
  } catch (error) {
    // No se pudieron obtener productos con inventario antes del ingreso
  }
  
  // Calcular el costo ponderado para cada producto ANTES de crear el ingreso
  const detallesConCostoCalculado = calcularCostosPonderados(form.detalles, productosAntes);
  
  // Crear el payload base
  const payload = mapFormAIngresoAPI(form);
  
  // IMPORTANTE: Los detalles ahora tienen:
  // - costoUnitario: Costo ORIGINAL del ingreso (para calcular el total del ingreso y trazabilidad)
  // - costoUnitarioPonderado: Costo calculado con promedio ponderado (para actualizar el producto en inventario)
  // - totalLinea: Ya está calculado con el costo original (costoUnitario × cantidad)
  
  // Calcular totalCosto usando el costoUnitario ORIGINAL (no el ponderado)
  // Esto asegura que el total del ingreso refleje exactamente lo que se pagó
  let totalCostoOriginal = 0;
  detallesConCostoCalculado.forEach((detalle) => {
    // Usar costoUnitario que ahora contiene el costo ORIGINAL del ingreso
    const costoOriginal = Number(detalle.costoUnitario) || 0;
    const cantidad = Number(detalle.cantidad) || 0;
    totalCostoOriginal += cantidad * costoOriginal;
  });
  
  // Actualizar el payload con los detalles que tienen ambos costos
  payload.detalles = detallesConCostoCalculado.map(d => {
    // Mantener costoUnitario (original) y costoUnitarioPonderado (para actualizar producto)
    return {
      ...d,
      // Asegurar que totalLinea use el costo original
      totalLinea: (Number(d.cantidad) || 0) * (Number(d.costoUnitario) || 0)
    };
  });
  payload.totalCosto = totalCostoOriginal; // Total del ingreso usando costos originales
  payload.procesado = false;
  
  // console.log("Payload del ingreso preparado con costos ponderados para actualizar productos");
  
  try {
    const { data } = await api.post("/ingresos", payload);
    // console.log("Ingreso creado. El backend debería haber actualizado el costo del producto con el promedio ponderado.");
    return data;
  } catch (error) {
    // console.error("Error completo al crear ingreso:", {
    //   message: error.message,
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   data: error.response?.data,
    //   headers: error.response?.headers,
    //   config: {
    //     url: error.config?.url,
    //     method: error.config?.method,
    //     data: error.config?.data
    //   }
    // });
    throw error;
  }
}

/**
 * Calcula los costos ponderados para cada producto ANTES de crear el ingreso
 * Retorna los detalles con el costoUnitario reemplazado por el costo calculado
 * @param {Array} detalles - Detalles del ingreso con producto, cantidad y costoUnitario
 * @param {Array} productosAntes - Productos obtenidos ANTES de crear el ingreso
 * @returns {Array} Detalles con costoUnitario actualizado al costo ponderado calculado
 */
function calcularCostosPonderados(detalles, productosAntes = []) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return detalles;
  }

  if (!Array.isArray(productosAntes) || productosAntes.length === 0) {
    return detalles;
  }

  const productosMap = new Map(productosAntes.map(p => [p.id, p]));

  const detallesConCostoCalculado = detalles.map((detalle, idx) => {
    const productoId = detalle.producto?.id;
    if (!productoId) {
      return detalle;
    }

    const producto = productosMap.get(productoId);
    if (!producto) {
      return detalle;
    }

    // Calcular cantidad actual sumando las cantidades de las sedes
    const cantidadInsula = Number(producto.cantidadInsula || 0);
    const cantidadCentro = Number(producto.cantidadCentro || 0);
    const cantidadPatios = Number(producto.cantidadPatios || 0);
    const cantidadAntes = cantidadInsula + cantidadCentro + cantidadPatios;
    const costoActual = Number(producto.costo || 0);
    const cantidadNueva = Number(detalle.cantidad || 0);
    const costoNuevoIngreso = Number(detalle.costoUnitario || 0); // Costo original del ingreso

    // Validar que tenemos datos válidos
    if (cantidadNueva <= 0 || costoNuevoIngreso <= 0) {
      return detalle;
    }

    // Calcular nuevo costo usando promedio ponderado
    let nuevoCosto;
    if (cantidadAntes <= 0) {
      nuevoCosto = costoNuevoIngreso;
    } else {
      const totalCostoAntes = cantidadAntes * costoActual;
      const totalCostoNuevo = cantidadNueva * costoNuevoIngreso;
      const cantidadTotal = cantidadAntes + cantidadNueva;
      nuevoCosto = (totalCostoAntes + totalCostoNuevo) / cantidadTotal;
    }

    // Redondear a número entero (sin decimales)
    nuevoCosto = Math.round(nuevoCosto);

    // Crear nuevo detalle con el costo calculado
    // IMPORTANTE: Mantenemos costoUnitario con el costo ORIGINAL del ingreso (para calcular el total del ingreso)
    // Enviamos costoUnitarioPonderado para que el backend actualice el costo del producto en inventario
    const totalLineaOriginal = detalle.cantidad * costoNuevoIngreso;
    const detalleActualizado = {
      ...detalle,
      costoUnitario: costoNuevoIngreso, // Mantener el costo ORIGINAL del ingreso (para trazabilidad y total del ingreso)
      costoUnitarioPonderado: nuevoCosto, // Costo calculado con promedio ponderado (para actualizar el producto en inventario)
      totalLinea: totalLineaOriginal, // Mantener el totalLinea original del ingreso (costoUnitario × cantidad)
    };

    return detalleActualizado;
  });

  return detallesConCostoCalculado;
}

/**
 * Actualiza el costo de los productos usando promedio ponderado
 * Fórmula: nuevo_costo = (cantidad_actual * costo_actual + cantidad_nueva * costo_nuevo) / (cantidad_actual + cantidad_nueva)
 * @param {Array} detalles - Detalles del ingreso con producto, cantidad y costoUnitario
 * @param {Array} productosAntes - Productos obtenidos ANTES de crear el ingreso (opcional, si no se proporciona se obtienen después)
 * @deprecated Esta función ya no se usa, los costos se calculan antes de crear el ingreso
 */
async function actualizarCostosProductosPromedioPonderado(detalles, productosAntes = null) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return;
  }

  // Usar productos obtenidos antes del ingreso, o obtenerlos ahora
  let productos;
  if (productosAntes && Array.isArray(productosAntes) && productosAntes.length > 0) {
    productos = productosAntes;
  } else {
    productos = await listarProductos();
  }
  
  const productosMap = new Map(productos.map(p => [p.id, p]));

  // Obtener categorías una vez para formatear correctamente
  let categorias = [];
  try {
    categorias = await listarCategorias();
  } catch (error) {
  }

  // Actualizar cada producto
  const actualizaciones = detalles.map(async (detalle) => {
    const productoId = detalle.producto?.id;
    if (!productoId) {
      return;
    }

    const producto = productosMap.get(productoId);
    if (!producto) {
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

    // Validar que tenemos datos válidos
    if (cantidadNueva <= 0 || costoNuevo <= 0) {
      return;
    }

    // Calcular nuevo costo usando promedio ponderado
    // Fórmula: nuevo_costo = (cantidad_antes * costo_actual + cantidad_nueva * costo_nuevo) / (cantidad_antes + cantidad_nueva)
    // Si no hay cantidad antes, usar directamente el costo nuevo
    let nuevoCosto;
    if (cantidadAntes <= 0) {
      nuevoCosto = costoNuevo;
    } else {
      const totalCostoAntes = cantidadAntes * costoActual;
      const totalCostoNuevo = cantidadNueva * costoNuevo;
      const cantidadTotal = cantidadAntes + cantidadNueva;
      nuevoCosto = (totalCostoAntes + totalCostoNuevo) / cantidadTotal;
    }

    // Redondear al entero más cercano (sin decimales) - SIEMPRE número entero
    nuevoCosto = Math.ceil(nuevoCosto);
    // Asegurarse de que sea un número entero (sin decimales)
    nuevoCosto = Math.round(nuevoCosto);

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
      costo: nuevoCosto, // Este es el costo calculado con promedio ponderado
      precio1: producto.precio1 || 0,
      precio2: producto.precio2 || 0,
      precio3: producto.precio3 || 0,
      descripcion: producto.descripcion || "",
      posicion: producto.posicion || "",
      version: producto.version || 0
    };
    
    // IMPORTANTE: Obtener el producto actualizado del backend DESPUÉS de crear el ingreso
    // para tener las cantidades correctas (ya actualizadas por el backend)
    // El backend podría requerir las cantidades actualizadas para guardar el costo correctamente
    let productoActualizado = null;
    try {
      // Obtener el producto actualizado del inventario completo
      const productosActualizados = await listarInventarioCompleto({}, true, null);
      productoActualizado = productosActualizados.find(p => p.id === productoId);
      
      if (productoActualizado) {
        // Incluir las cantidades actualizadas en el payload
        payloadActualizacion.cantidadInsula = Number(productoActualizado.cantidadInsula || 0);
        payloadActualizacion.cantidadCentro = Number(productoActualizado.cantidadCentro || 0);
        payloadActualizacion.cantidadPatios = Number(productoActualizado.cantidadPatios || 0);
      } else {
        // Si no podemos obtener el producto actualizado, calcular las cantidades nuevas
        // basándonos en las cantidades anteriores + la cantidad nueva del ingreso
        // Pero necesitamos saber a qué sede se hizo el ingreso...
        // Por ahora, no incluimos las cantidades si no podemos obtenerlas actualizadas
      }
    } catch (error) {
      // Continuar sin las cantidades actualizadas
    }

    // Actualizar SOLO el costo del producto usando endpoint específico
    // IMPORTANTE: Asegurarse de que el costo sea un número entero (sin decimales)
    const costoEntero = Math.ceil(nuevoCosto);
    
    try {
      // Intentar primero con el endpoint específico para actualizar solo el costo
      const resultado = await actualizarCostoProducto(productoId, costoEntero);
      
      // Verificar que el costo se guardó correctamente
      if (resultado.costo !== costoEntero) {
      }
      
      // Esperar un momento antes de disparar el evento para asegurar que el backend guardó el cambio
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Disparar evento personalizado para refrescar el inventario
      window.dispatchEvent(new CustomEvent('inventory-updated', { 
        detail: { productoId, nuevoCosto: costoEntero } 
      }));
    } catch (updateError) {
      // Si el endpoint específico no existe, intentar con el método completo como fallback
      if (updateError.response?.status === 404) {
        try {
          const resultado = await actualizarProducto(productoId, payloadActualizacion);
        } catch (fallbackError) {
          throw fallbackError;
        }
      } else {
        throw updateError;
      }
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
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const response = await api.delete(`/ingresos/${numericId}`);
    // El backend retorna 204 No Content cuando se elimina correctamente
    return response;
  } catch (error) {
    // Manejar errores específicos según la documentación
    if (error.response?.status === 404) {
      throw new Error('Ingreso no encontrado');
    }
    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.error || error.message || 'Error al revertir inventario';
      throw new Error(errorMessage);
    }
    throw error;
  }
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
    throw error;
  }
}

export async function desprocesarIngreso(id) {
  // Validar ID
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error(`ID de ingreso inválido: ${id}`);
  }
  
  try {
    const { data } = await api.put(`/ingresos/${numericId}/desprocesar`);
    return data;
  } catch (error) {
    // Manejar errores específicos según la documentación
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error || 'El ingreso no está procesado';
      throw new Error(errorMessage);
    }
    if (error.response?.status === 404) {
      throw new Error('Ingreso no encontrado');
    }
    throw error;
  }
}
