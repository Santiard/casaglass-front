import React, { useEffect, useState } from "react";
import "../styles/FacturarOrdenModal.css";
import { listarClientes } from "../services/ClientesService";
import { listarSedes } from "../services/SedesService";
import { listarTrabajadores } from "../services/TrabajadoresService";
import { crearOrdenVenta } from "../services/OrdenesService";
import { useAuth } from "../context/AuthContext.jsx";

export default function FacturarOrdenModal({ 
  isOpen, 
  onClose, 
  productosCarrito = [],
  onFacturacionExitosa
}) {
  const { user, sedeId } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [sedes, setSedes] = useState([]);

  const [form, setForm] = useState({
    clienteId: "",
    sedeId: "",
    trabajadorId: "",
    obra: "",
    credito: false,
    incluidaEntrega: false,
  });

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [ordenProcesada, setOrdenProcesada] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  // Resetear formulario cuando se cierre el modal
  const resetForm = () => {
    setForm({
      clienteId: "",
      sedeId: sedeId || "", // Preseleccionar sede del usuario logueado
      trabajadorId: user?.id || "", // Preseleccionar trabajador (usuario logueado)
      obra: "",
      credito: false,
      incluidaEntrega: false,
    });
    setMensaje("");
    setOrdenProcesada(false);
    setReintentos(0);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    (async () => {
      try {
        const [cli, sed, trab] = await Promise.all([
          listarClientes(),
          listarSedes(),
          listarTrabajadores(),
        ]);
        setClientes(cli || []);
        setSedes(sed || []);
        setTrabajadores(trab || []);
        
        // Preseleccionar sede y trabajador después de cargar los datos
        console.log("🔍 Usuario logueado:", user);
        console.log("🔍 Sede ID del usuario:", sedeId);
        
        setForm(prev => ({
          ...prev,
          sedeId: sedeId || "",
          trabajadorId: user?.id || "",
        }));
        
        console.log("✅ Formulario preseleccionado:", {
          sedeId: sedeId || "",
          trabajadorId: user?.id || "",
        });
      } catch (e) {
        console.error("Error cargando catálogos:", e);
      }
    })();
  }, [isOpen, sedeId, user?.id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const calcularTotal = () => {
    return productosCarrito.reduce(
      (acc, item) => acc + (item.precioUsado || 0) * (item.cantidadVender || 0),
      0
    );
  };

  const validarFormulario = () => {
    const errores = [];
    
    if (!form.clienteId) errores.push("Cliente es obligatorio");
    if (!form.trabajadorId) errores.push("Trabajador es obligatorio");
    if (!form.sedeId) errores.push("Sede es obligatoria");
    if (productosCarrito.length === 0) errores.push("Debe haber al menos un producto");
    
    // Validar que todos los productos tengan cantidad y precio válidos
    const productosInvalidos = productosCarrito.filter(p => 
      !p.cantidadVender || p.cantidadVender <= 0 || !p.precioUsado || p.precioUsado <= 0
    );
    
    if (productosInvalidos.length > 0) {
      errores.push("Todos los productos deben tener cantidad y precio válidos");
    }
    
    // Log para debugging
    console.log("🔍 Validación del formulario:", {
      clienteId: form.clienteId,
      trabajadorId: form.trabajadorId,
      sedeId: form.sedeId,
      productosCarrito: productosCarrito.length,
      errores: errores.length
    });
    
    return errores;
  };

  const handleFacturar = async () => {
    // Prevenir procesamiento duplicado
    if (ordenProcesada) {
      setMensaje("⚠️ Esta orden ya fue procesada. Por favor, cierre el modal y abra uno nuevo.");
      return;
    }

    const errores = validarFormulario();
    
    if (errores.length > 0) {
      alert("Errores de validación:\n• " + errores.join("\n• "));
      return;
    }

    console.log("🛒 Productos en carrito (antes de procesar):", productosCarrito);
    
    // Formato actualizado para el backend
    const payload = {
      obra: form.obra || "",
      credito: Boolean(form.credito),
      incluidaEntrega: Boolean(form.incluidaEntrega),
      clienteId: Number(form.clienteId),
      sedeId: Number(form.sedeId),
      trabajadorId: Number(form.trabajadorId),
      items: productosCarrito.map((p, index) => {
        console.log(`📦 Procesando item ${index}:`, p);
        
        // Buscar el ID del producto en diferentes campos posibles
        let productoId = p.id || p.productoId || p.codigo;
        
        // Si el código es string como "P004", intentar extraer solo el número
        if (typeof productoId === 'string' && productoId.startsWith('P')) {
          const numeroExtraido = productoId.substring(1); // Quita la "P"
          if (!isNaN(numeroExtraido)) {
            productoId = Number(numeroExtraido);
          }
        }
        
        console.log(`🔍 ID encontrado para ${p.nombre}:`, {
          original_id: p.id,
          productoId_campo: p.productoId,
          codigo: p.codigo,
          id_final: productoId
        });
        
        const item = {
          productoId: Number(productoId),
          descripcion: String(p.nombre || ""),
          cantidad: Number(p.cantidadVender),
          precioUnitario: Number(p.precioUsado),
        };
        
        // Si el productoId sigue siendo NaN, usar el código como string
        if (isNaN(item.productoId) && p.codigo) {
          console.log(`⚠️ Usando código como string para ${p.nombre}: ${p.codigo}`);
          item.productoId = p.codigo; // Enviar como string
        }
        
        console.log(`✅ Item procesado ${index}:`, item);
        return item;
      }),
    };

    console.log("📋 Payload completo:", payload);
    console.log("🎯 Campos preseleccionados:", {
      sedeId: payload.sedeId,
      trabajadorId: payload.trabajadorId,
      sedeNombre: sedes.find(s => s.id === payload.sedeId)?.nombre,
      trabajadorNombre: trabajadores.find(t => t.id === payload.trabajadorId)?.nombre
    });

    // Validar que todos los números sean válidos
    if (isNaN(payload.clienteId) || isNaN(payload.sedeId) || isNaN(payload.trabajadorId)) {
      setMensaje("⚠️ Error en los IDs de cliente, sede o trabajador");
      return;
    }

    // Validar items con más detalle
    const itemsInvalidos = payload.items.filter((item, index) => {
      const productoIdValido = !isNaN(item.productoId) || (typeof item.productoId === 'string' && item.productoId.length > 0);
      const esInvalido = !productoIdValido || isNaN(item.cantidad) || isNaN(item.precioUnitario) ||
        item.cantidad <= 0 || item.precioUnitario <= 0;
      
      if (esInvalido) {
        console.log(`❌ Item ${index} es inválido:`, {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          productoId_valido: productoIdValido,
          esNaN_cantidad: isNaN(item.cantidad),
          esNaN_precio: isNaN(item.precioUnitario),
          cantidad_menor_cero: item.cantidad <= 0,
          precio_menor_cero: item.precioUnitario <= 0
        });
      }
      
      return esInvalido;
    });

    if (itemsInvalidos.length > 0) {
      console.error("❌ Items inválidos:", itemsInvalidos);
      setMensaje("⚠️ Hay productos con datos inválidos en el carrito");
      return;
    }

    console.log("🧾 Enviando payload de factura:", payload);
    console.log("📦 Items detallados:", payload.items);
    setLoading(true);
    setMensaje("");

    try {
      const response = await crearOrdenVenta(payload);
      console.log("✅ Respuesta del backend:", response);
      
      // Acceder a los datos de la nueva estructura de respuesta
      const orden = response.orden;
      const numero = response.numero;
      const mensaje = response.mensaje;
      
      // Mensaje personalizado según el tipo de orden
      let mensajeCompleto = `✅ ${mensaje} (N° ${numero})`;
      
      // Si es orden a crédito, mostrar información del crédito
      if (orden.credito && orden.creditoDetalle) {
        const credito = orden.creditoDetalle;
        console.log('💳 Crédito creado:', {
          id: credito.id,
          totalCredito: credito.totalCredito,
          saldoPendiente: credito.saldoPendiente,
          estado: credito.estado
        });
        
        mensajeCompleto += `\n💳 Crédito por $${credito.totalCredito.toLocaleString('es-CO')}`;
        mensajeCompleto += `\nSaldo pendiente: $${credito.saldoPendiente.toLocaleString('es-CO')}`;
      } else {
        mensajeCompleto += `\n💰 Venta de contado - Total: $${orden.total?.toLocaleString('es-CO')}`;
      }
      
      setMensaje(mensajeCompleto);
      setOrdenProcesada(true); // Marcar como procesada para prevenir duplicados
      
      // Limpiar carrito cuando la facturación sea exitosa
      if (onFacturacionExitosa) {
        onFacturacionExitosa();
      }
      
      // Cerrar modal después de un tiempo
      setTimeout(() => {
        onClose();
      }, 3000); // 3 segundos para leer el mensaje completo
      
    } catch (e) {
      console.error("❌ Error al facturar orden:", e);
      console.error("📄 Detalles del error:", {
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        data: e?.response?.data,
        config: e?.config
      });
      
      let msg = "Error al crear la orden de venta";
      
      if (e?.response?.data?.message) {
        const errorMsg = e.response.data.message;
        
        // Detectar errores específicos del backend
        if (errorMsg.includes("Transaction silently rolled back")) {
          msg = "Error de transacción: La operación fue cancelada por el servidor. Verifica que todos los datos sean válidos.";
        } else if (errorMsg.includes("Duplicate entry") && errorMsg.includes("uk_inventario_producto_sede")) {
          msg = "Error: Este producto ya existe en el inventario de esta sede. El backend necesita actualizar el inventario en lugar de crear una nueva entrada.";
        } else if (errorMsg.includes("could not execute statement")) {
          msg = "Error de base de datos: " + errorMsg.split("] [")[0].split("[")[1];
        } else if (errorMsg.includes("Ya existe un crédito para esta orden")) {
          msg = "⚠️ Ya existe un crédito para esta orden. Cada orden solo puede tener un crédito.\n\n💡 Solución: Cierre este modal y abra uno nuevo para crear otra orden.";
        } else {
          msg = errorMsg;
        }
      } else if (e?.response?.data?.tipo && e?.response?.data?.error) {
        // Nueva estructura de errores del backend
        if (e.response.data.codigo === "CONFLICTO_STOCK") {
          msg = `⚠️ Conflicto de Stock: Otro usuario está vendiendo el mismo producto al mismo tiempo.\n\n💡 Solución: Espere unos segundos e intente nuevamente, o verifique el stock disponible.\n\n🔄 Reintentos realizados: ${reintentos}/3\n\n🔍 Debug Info:\n- Status: ${e.response.status}\n- Código: ${e.response.data.codigo}\n- Tipo: ${e.response.data.tipo}`;
        } else {
          msg = `Error ${e.response.data.tipo}: ${e.response.data.error}`;
        }
      } else if (e?.response?.data?.error) {
        msg = e.response.data.error;
      } else if (e?.response?.status === 400) {
        msg = "Datos inválidos en la solicitud. Revisa que todos los campos sean correctos.";
      } else if (e?.response?.status === 404) {
        msg = "Endpoint no encontrado. El servidor podría no tener implementado este servicio.";
      } else if (e?.response?.status === 500) {
        msg = "Error interno del servidor. Revisa la consola del backend.";
      } else if (e?.message) {
        msg = e.message;
      }
      
      setMensaje("⚠️ " + msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const total = calcularTotal();

  return (
    <div className="modal-overlay factura">
      <div className="modal-container modal-wide">
        <div className="factura-header">
          <h2>🧾 Facturar Orden de Venta</h2>
          <button className="btn-cerrar" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Mensaje informativo */}
        {(form.sedeId || form.trabajadorId) && (
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '1px solid #28a745',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '16px',
            fontSize: '0.9em',
            color: '#155724'
          }}>
            ℹ️ <strong>Campos preseleccionados:</strong> La sede y trabajador se han seleccionado automáticamente según tu usuario logueado. Puedes cambiarlos si es necesario.
          </div>
        )}

        <div className="factura-grid">
          {/* 🔹 Panel Izquierdo - Datos de la orden */}
          <div className="factura-form">
            <label>
              Cliente
              <select
                value={form.clienteId}
                onChange={(e) => handleChange("clienteId", e.target.value)}
              >
                <option value="">Selecciona cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Trabajador / Vendedor {form.trabajadorId && <span style={{color: '#28a745', fontSize: '0.8em'}}>✓ Preseleccionado</span>}
              <select
                value={form.trabajadorId}
                onChange={(e) => handleChange("trabajadorId", e.target.value)}
              >
                <option value="">Selecciona trabajador...</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sede {form.sedeId && <span style={{color: '#28a745', fontSize: '0.8em'}}>✓ Preseleccionada</span>}
              <select
                value={form.sedeId}
                onChange={(e) => handleChange("sedeId", e.target.value)}
              >
                <option value="">Selecciona sede...</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Obra
              <input
                type="text"
                placeholder="Ej. Casa Familia Pérez"
                value={form.obra}
                onChange={(e) => handleChange("obra", e.target.value)}
              />
            </label>

            <div className="factura-checks">
              <label>
                <input
                  type="checkbox"
                  checked={form.credito}
                  onChange={(e) => handleChange("credito", e.target.checked)}
                />
                Venta a crédito
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.incluidaEntrega}
                  onChange={(e) => handleChange("incluidaEntrega", e.target.checked)}
                />
                Incluir entrega
              </label>
            </div>

            <div className="factura-total">
              <h3>Total: ${total.toLocaleString("es-CO")}</h3>
            </div>
          </div>

          {/* 🔹 Panel Derecho - Productos */}
          <div className="factura-items">
            <h3>Productos en la Orden</h3>
            <div className="factura-items-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {productosCarrito.map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td>{p.nombre}</td>
                      <td>{p.cantidadVender}</td>
                      <td>${p.precioUsado?.toLocaleString("es-CO")}</td>
                      <td>
                        ${(p.precioUsado * p.cantidadVender).toLocaleString("es-CO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🔹 Footer */}
        <div className="factura-footer">
          {mensaje && (
            <div className="factura-msg">
              {mensaje.split('\n').map((linea, index) => (
                <div key={index}>{linea}</div>
              ))}
              {mensaje.includes("Ya existe un crédito") && (
                <div style={{ marginTop: '10px' }}>
                  <button 
                    className="btn-cancelar" 
                    onClick={onClose}
                    style={{ fontSize: '0.9em', padding: '5px 10px' }}
                  >
                    Cerrar Modal
                  </button>
                </div>
              )}
              {mensaje.includes("Conflicto de Stock") && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-guardar" 
                    onClick={() => {
                      if (reintentos < 3) {
                        setMensaje("");
                        setOrdenProcesada(false);
                        setReintentos(prev => prev + 1);
                        handleFacturar();
                      } else {
                        setMensaje("⚠️ Máximo de reintentos alcanzado. Por favor, cierre el modal y verifique el stock disponible.");
                      }
                    }}
                    style={{ fontSize: '0.9em', padding: '5px 10px' }}
                    disabled={loading || reintentos >= 3}
                  >
                    🔄 Reintentar ({reintentos}/3)
                  </button>
                  <button 
                    className="btn-cancelar" 
                    onClick={onClose}
                    style={{ fontSize: '0.9em', padding: '5px 10px' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="factura-actions">
            <button className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-guardar"
              onClick={handleFacturar}
              disabled={loading || productosCarrito.length === 0 || ordenProcesada}
            >
              {loading ? "Facturando..." : ordenProcesada ? "Orden Procesada" : "Confirmar Factura"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
