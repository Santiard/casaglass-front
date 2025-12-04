import React, { useState, useEffect } from "react";
import "../styles/FacturarOrdenModal.css";
import "../styles/Table.css";
import { useToast } from "../context/ToastContext.jsx";
import { getBusinessSettings } from "../services/businessSettingsService.js";
import { listarClientes } from "../services/ClientesService.js";
import { api } from "../lib/api.js";
import { actualizarOrdenVenta, actualizarOrden, obtenerOrden } from "../services/OrdenesService.js";

export default function FacturarOrdenModal({ isOpen, onClose, onSave, orden }) {
  const { showError } = useToast();
  const [form, setForm] = useState({
    ordenId: "",
    fecha: new Date().toISOString().split("T")[0],
    subtotal: 0,
    descuentos: "",
    iva: 0,
    retencionFuente: 0,
    formaPago: "EFECTIVO",
    observaciones: "",
  });

  const [loading, setLoading] = useState(false);
  const [subtotalOrden, setSubtotalOrden] = useState(0);
  const [validationMsg, setValidationMsg] = useState("");
  const [ivaRate, setIvaRate] = useState(19); // Porcentaje de IVA desde configuración
  const [retefuenteRate, setRetefuenteRate] = useState(2.5); // Porcentaje de retención desde configuración
  const [retefuenteThreshold, setRetefuenteThreshold] = useState(1000000); // Umbral de retención desde configuración
  const [clientes, setClientes] = useState([]);
  const [clienteFacturaId, setClienteFacturaId] = useState(""); // Cliente al que se factura (opcional)
  const [clienteFactura, setClienteFactura] = useState(null); // Objeto completo del cliente seleccionado
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [tieneRetencion, setTieneRetencion] = useState(false); // Checkbox para marcar si la orden tiene retefuente
  const creditoPendiente = Boolean(orden?.credito) && Number(orden?.creditoDetalle?.saldoPendiente || 0) > 0;
  const isAnulada = String(orden?.estado || "").toUpperCase() === "ANULADA";
  const esCredito = Boolean(orden?.credito); // Verificar si la orden es a crédito

  // Cargar configuración de impuestos y clientes al abrir el modal
  useEffect(() => {
    console.log("🔍 [FacturarOrdenModal] useEffect ejecutado - isOpen:", isOpen, "orden:", orden ? { id: orden.id, numero: orden.numero } : null);
    
    if (isOpen && orden) {
      console.log("🔍 [FacturarOrdenModal] Modal abierto, orden recibida:", {
        id: orden.id,
        numero: orden.numero,
        tieneCliente: !!orden.cliente,
        clienteId: orden.clienteId || orden.cliente?.id,
        ordenCompleta: orden
      });
      
      getBusinessSettings().then((settings) => {
        if (settings) {
          setIvaRate(Number(settings.ivaRate) || 19);
          setRetefuenteRate(Number(settings.retefuenteRate) || 2.5);
          setRetefuenteThreshold(Number(settings.retefuenteThreshold) || 1000000);
        }
      });
      
      // Cargar datos de forma asíncrona
      const cargarDatos = async () => {
        try {
          // 1. Cargar clientes
          const clientesData = await listarClientes();
          const clientesArray = Array.isArray(clientesData) ? clientesData : [];
          setClientes(clientesArray);
          console.log("✅ [FacturarOrdenModal] Clientes cargados:", clientesArray.length);
          
          // 2. Si la orden no tiene cliente completo, obtener la orden completa del backend
          let ordenCompleta = orden;
          if (!orden.cliente && orden.id) {
            try {
              ordenCompleta = await obtenerOrden(orden.id);
              console.log("✅ [FacturarOrdenModal] Orden completa obtenida del backend:", ordenCompleta);
            } catch (err) {
              console.warn("⚠️ [FacturarOrdenModal] No se pudo obtener orden completa, usando la inicial:", err);
            }
          }
          
          // 3. Inicializar cliente
          if (ordenCompleta?.cliente) {
            // Si la orden tiene el objeto cliente completo, usarlo
            const clienteCompleto = clientesArray.find(c => c.id === ordenCompleta.cliente.id) || ordenCompleta.cliente;
            console.log("✅ [FacturarOrdenModal] Cliente seteado:", clienteCompleto);
            setClienteFactura(clienteCompleto);
            setClienteFacturaId(String(clienteCompleto.id));
          } else if (ordenCompleta?.clienteId) {
            // Si solo tiene clienteId, buscar el cliente en la lista cargada
            const clienteEncontrado = clientesArray.find(c => c.id === ordenCompleta.clienteId);
            if (clienteEncontrado) {
              console.log("✅ [FacturarOrdenModal] Cliente seteado desde clienteId:", clienteEncontrado);
              setClienteFactura(clienteEncontrado);
              setClienteFacturaId(String(clienteEncontrado.id));
            } else {
              console.warn("⚠️ [FacturarOrdenModal] Cliente no encontrado con ID:", ordenCompleta.clienteId);
              setClienteFactura(null);
              setClienteFacturaId("");
            }
          } else {
            console.warn("⚠️ [FacturarOrdenModal] Orden sin cliente ni clienteId");
            setClienteFactura(null);
            setClienteFacturaId("");
          }
          
          // 4. Buscar retefuente en los abonos de la orden (solo para órdenes a crédito)
          if (ordenCompleta?.credito && ordenCompleta?.creditoDetalle?.creditoId) {
            buscarRetefuenteEnAbonos(ordenCompleta.creditoDetalle.creditoId);
          } else {
            setTieneRetencion(false);
          }
        } catch (err) {
          console.error("❌ [FacturarOrdenModal] Error cargando datos:", err);
          setClientes([]);
          // Fallback: intentar usar cliente de la orden si existe
          if (orden?.cliente) {
            setClienteFactura(orden.cliente);
            setClienteFacturaId(String(orden.cliente.id));
          } else if (orden?.clienteId) {
            setClienteFacturaId(String(orden.clienteId));
          }
        }
      };
      
      cargarDatos();
    }
  }, [isOpen, orden]);

  // Función para buscar si hay retefuente en los abonos del crédito
  const buscarRetefuenteEnAbonos = async (creditoId) => {
    try {
      // Obtener los abonos del crédito
      const response = await api.get(`/creditos/${creditoId}/abonos`);
      const abonos = Array.isArray(response.data) ? response.data : [];
      
      // Buscar en el campo metodoPago de cada abono si contiene "RETEFUENTE" o "RETENCION EN LA FUENTE"
      const tieneRetefuente = abonos.some(abono => {
        const metodoPago = String(abono.metodoPago || "").toUpperCase();
        return metodoPago.includes("RETEFUENTE") || metodoPago.includes("RETENCION EN LA FUENTE");
      });
      
      setTieneRetencion(tieneRetefuente);
    } catch (error) {
      console.error("Error buscando abonos para verificar retefuente:", error);
      // Si hay error, dejar el checkbox desmarcado
      setTieneRetencion(false);
    }
  };

  useEffect(() => {
    if (isOpen && orden) {
      // Usar subtotal del backend si existe, sino calcular desde items
      const subtotal =
        typeof orden.subtotal === "number" && !isNaN(orden.subtotal)
          ? orden.subtotal
          : Array.isArray(orden.items)
          ? orden.items.reduce(
              (acc, it) => acc + (Number(it.totalLinea) || 0),
              0
            )
          : 0;

      // Usar descuentos de la orden si existen
      const descuentosOrden = typeof orden.descuentos === "number" && !isNaN(orden.descuentos)
        ? orden.descuentos
        : 0;

      setSubtotalOrden(subtotal);

      // Calcular base (subtotal - descuentos)
      const baseInicial = subtotal - descuentosOrden;
      
      // Calcular IVA: Si el precio incluye IVA, extraer el IVA del precio
      // IVA = precio * (tasa / (100 + tasa))
      const ivaCalculado = (ivaRate && ivaRate > 0) 
        ? (baseInicial * ivaRate) / (100 + ivaRate) 
        : 0;
      
      // Calcular retención: Solo si está marcada la orden para retención Y la base (sin IVA) supera el umbral
      const subtotalSinIva = baseInicial - ivaCalculado;
      // Para órdenes a crédito, solo aplicar si está marcado el checkbox
      // Para órdenes a contado, aplicar automáticamente si supera el umbral (comportamiento actual)
      const debeAplicarRetencion = esCredito 
        ? (tieneRetencion && subtotalSinIva >= (retefuenteThreshold || 0))
        : (subtotalSinIva >= (retefuenteThreshold || 0));

      setForm({
        ordenId: orden.id,
        fecha: new Date().toISOString().split("T")[0],
        subtotal,
        descuentos: descuentosOrden || "",
        iva: ivaRate || 0, // Usar el porcentaje de IVA desde configuración
        retencionFuente: debeAplicarRetencion ? (retefuenteRate || 0) : 0, // Usar el porcentaje de retención si aplica
        formaPago: "EFECTIVO",
        observaciones: `Factura generada desde orden #${orden.numero}`,
      });
      
      // La inicialización del cliente se hace en el useEffect anterior
      // después de cargar la lista de clientes para tener todos los datos
    }
  }, [isOpen, orden, ivaRate, retefuenteRate, retefuenteThreshold, tieneRetencion, esCredito]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      if (name === "descuentos") {
        setForm((prev) => ({
          ...prev,
          [name]: value === "" ? "" : parseFloat(value) || 0,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          [name]: parseFloat(value) || 0,
        }));
      }
    } else {
      // Campos de texto se convierten a mayúsculas
      const processedValue = value.toUpperCase();
      setForm((prev) => ({ ...prev, [name]: processedValue }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.ordenId) {
      showError("Error: No se puede crear la factura sin una orden.");
      return;
    }

    if (creditoPendiente) {
      showError("Esta orden es a crédito y tiene saldo pendiente. No se puede facturar hasta completar el pago.");
      return;
    }

    if (isAnulada) {
      showError("Esta orden está anulada. No se puede facturar.");
      return;
    }

    setLoading(true);
    try {
      // Primero, actualizar la orden con tieneRetencionFuente si es necesario
      // Solo actualizar si la orden es a crédito y el valor ha cambiado
      if (esCredito && orden?.venta) {
        try {
          // Construir payload para actualizar la orden con tieneRetencionFuente
          const ordenUpdatePayload = {
            fecha: orden.fecha,
            obra: orden.obra || "",
            descripcion: orden.descripcion || null,
            venta: orden.venta,
            credito: orden.credito,
            incluidaEntrega: orden.incluidaEntrega || false,
            tieneRetencionFuente: tieneRetencion, // Actualizar con el valor del checkbox
            descuentos: Number(orden.descuentos || 0),
            clienteId: Number(orden.clienteId || orden.cliente?.id),
            sedeId: Number(orden.sedeId || orden.sede?.id),
            ...(orden.trabajadorId || orden.trabajador?.id ? { trabajadorId: Number(orden.trabajadorId || orden.trabajador?.id) } : {}),
            items: (Array.isArray(orden.items) ? orden.items : []).map(item => ({
              id: item.id ?? null,
              productoId: Number(item.productoId || item.producto?.id),
              descripcion: item.descripcion ?? "",
              cantidad: Number(item.cantidad ?? 1),
              precioUnitario: Number(item.precioUnitario ?? 0),
              totalLinea: Number(item.totalLinea ?? 0),
              ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: Number(item.reutilizarCorteSolicitadoId) } : {})
            }))
          };
          
          // Actualizar la orden usando el endpoint correcto según si es venta o no
          if (orden.venta) {
            await actualizarOrdenVenta(orden.id, ordenUpdatePayload);
          } else {
            await actualizarOrden(orden.id, ordenUpdatePayload);
          }
        } catch (updateError) {
          console.warn("⚠️ No se pudo actualizar tieneRetencionFuente en la orden:", updateError?.response?.data || updateError?.message);
          // Continuar con la facturación aunque falle la actualización del campo
        }
      }
      
      const payloadToSend = {
        ...form,
        descuentos: form.descuentos === "" ? 0 : form.descuentos,
        // Si se seleccionó un cliente diferente, incluir clienteId
        // Si no se seleccionó ninguno (clienteFacturaId === ""), no se envía y el backend usa el cliente de la orden
        ...(clienteFacturaId && clienteFacturaId !== "" ? { clienteId: Number(clienteFacturaId) } : {}),
        // No enviar estado: el backend lo ignora y crea PENDIENTE
      };
      await onSave(payloadToSend, false);
      onClose();
    } catch (error) {
      console.error("Error creando factura:", error);
      showError(error?.message || "No se pudo crear la factura.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="facturar-modal-overlay">
      <div className="facturar-modal-container">
        {/* CABECERA */}
        <header className="facturar-modal-header">
          <h2>Facturar Orden #{orden?.numero}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* CONTENIDO */}
        <form onSubmit={handleSubmit} className="facturar-modal-body">
          {/* SECCIÓN RESUMEN */}
          <section className="section-card">
            <h3>Resumen de la Orden</h3>
            <div className="info-grid">
              <div>
                <label>ID Orden:</label>
                <input type="text" value={orden?.id || ""} disabled />
              </div>
              <div>
                <label>Cliente de la Orden:</label>
                <input type="text" value={orden?.cliente?.nombre || "—"} disabled />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Cliente para Facturación:</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSearchModal("");
                      setShowClienteModal(true);
                    }}
                    className="btn-save"
                    style={{
                      whiteSpace: "nowrap",
                      padding: "0.5rem 1rem",
                      fontSize: "0.9rem"
                    }}
                  >
                    Cambiar Cliente
                  </button>
                  {clienteFactura && clienteFactura.id !== orden?.cliente?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (orden?.cliente) {
                          setClienteFactura(orden.cliente);
                          setClienteFacturaId(String(orden.cliente.id));
                        } else {
                          setClienteFactura(null);
                          setClienteFacturaId("");
                        }
                      }}
                      className="btn-cancel"
                      style={{
                        whiteSpace: "nowrap",
                        padding: "0.5rem 1rem",
                        fontSize: "0.9rem"
                      }}
                    >
                      Usar Cliente de la Orden
                    </button>
                  )}
                </div>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
                  gap: "1.5rem",
                  padding: "2rem",
                  backgroundColor: "#f8f9ff",
                  border: "1px solid #e6e8f0",
                  borderRadius: "12px"
                }}>
                  <div>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>Nombre:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.nombre || orden?.cliente?.nombre || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>NIT:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.nit || orden?.cliente?.nit || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>Correo:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.correo || orden?.cliente?.correo || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>Ciudad:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.ciudad || orden?.cliente?.ciudad || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>Dirección:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.direccion || orden?.cliente?.direccion || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.5rem", display: "block", fontWeight: "500" }}>Teléfono:</label>
                    <input 
                      type="text" 
                      value={clienteFactura?.telefono || orden?.cliente?.telefono || "—"} 
                      disabled 
                      style={{ 
                        fontSize: "1.1rem", 
                        padding: "0.8rem 1rem",
                        minHeight: "48px",
                        width: "100%"
                      }} 
                    />
                  </div>
                </div>
                {clienteFactura && clienteFactura.id !== orden?.cliente?.id && (
                  <small style={{ display: "block", color: "#1f2a5c", fontSize: "0.75rem", marginTop: "0.5rem", fontStyle: "italic" }}>
                    ⚠️ La factura se emitirá a un cliente diferente al de la orden
                  </small>
                )}
              </div>
              <div>
                <label>Fecha:</label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Sede:</label>
                <input type="text" value={orden?.sede?.nombre || "—"} disabled />
              </div>
              <div>
                <label>Vendedor:</label>
                <input type="text" value={orden?.trabajador?.nombre || "—"} disabled />
              </div>
            </div>
          </section>

          {/* SECCIÓN ÍTEMS */}
          <section className="section-card">
            <h3>Ítems de la Orden</h3>
            <div className="table-scroll">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(orden?.items) && orden.items.length > 0 ? (
                    orden.items.map((i, idx) => (
                      <tr key={i.id || idx}>
                        <td>{i.producto?.nombre ?? i.descripcion ?? '-'}</td>
                        <td className="tx-center">{i.cantidad}</td>
                        <td className="tx-right">${(i.precioUnitario || 0).toLocaleString('es-CO')}</td>
                        <td className="tx-right">${(i.totalLinea || 0).toLocaleString('es-CO')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="empty">Sin ítems</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECCIÓN CÁLCULOS */}
          <section className="section-card">
            <h3>Totales y Descuentos</h3>
            {isAnulada && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B',
                padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.5rem'
              }}>
                Esta orden se encuentra ANULADA. No es posible facturar una orden anulada.
              </div>
            )}
            {creditoPendiente && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B',
                padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.5rem'
              }}>
                Orden a crédito con saldo pendiente de ${Number(orden?.creditoDetalle?.saldoPendiente || 0).toLocaleString('es-CO')}. No se puede facturar hasta que el crédito esté pagado.
              </div>
            )}
            <div className="calculo-grid">
              <div>
                <label>Subtotal:</label>
                <input type="number" value={subtotalOrden} disabled />
              </div>
              <div>
                <label>Descuentos:</label>
                <input
                  type="number"
                  name="descuentos"
                  value={form.descuentos}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div>
                <label>IVA (%):</label>
                <input
                  type="number"
                  name="iva"
                  value={form.iva}
                  onChange={handleChange}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled
                />
                <small style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Valor desde configuración: {ivaRate}%
                </small>
              </div>
              <div>
                <label>Retención (%):</label>
                <input
                  type="number"
                  name="retencionFuente"
                  value={form.retencionFuente}
                  onChange={handleChange}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled
                />
                <small style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Valor desde configuración: {retefuenteRate}% {form.retencionFuente > 0 ? `(umbral: ${retefuenteThreshold.toLocaleString('es-CO')})` : '(no aplica)'}
                </small>
              </div>
            </div>
            
            {/* Checkbox para marcar si la orden tiene retefuente (solo para órdenes a crédito) */}
            {(() => {
              // Calcular subtotal sin IVA para el mensaje del checkbox
              const baseTemp = Math.max(0, subtotalOrden - (parseFloat(form.descuentos) || 0));
              const ivaPorcentajeTemp = Number(form.iva) || 0;
              const ivaValTemp = (ivaPorcentajeTemp && ivaPorcentajeTemp > 0) 
                ? (baseTemp * ivaPorcentajeTemp) / (100 + ivaPorcentajeTemp) 
                : 0;
              const subtotalSinIvaTemp = baseTemp - ivaValTemp;
              
              return esCredito ? (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e0e0e0' 
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}>
                    <input
                      type="checkbox"
                      checked={tieneRetencion}
                      onChange={(e) => setTieneRetencion(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span>Esta orden tiene retención en la fuente (retefuente)</span>
                  </label>
                  <small style={{ 
                    display: 'block', 
                    color: '#666', 
                    fontSize: '0.75rem', 
                    marginTop: '0.5rem',
                    marginLeft: '28px'
                  }}>
                    Marque esta opción si el cliente es autoretenedor y debe aplicarse retención en la fuente.
                    {subtotalSinIvaTemp < retefuenteThreshold && (
                      <span style={{ display: 'block', color: '#dc3545', marginTop: '0.25rem' }}>
                        ⚠️ El subtotal sin IVA (${subtotalSinIvaTemp.toLocaleString('es-CO')}) no supera el umbral (${retefuenteThreshold.toLocaleString('es-CO')}), por lo que no se aplicará retención aunque esté marcado.
                      </span>
                    )}
                  </small>
                </div>
              ) : null;
            })()}
            {(() => {
              const base = Math.max(0, subtotalOrden - (parseFloat(form.descuentos) || 0));
              
              // Calcular IVA: Si el precio incluye IVA, extraer el IVA del precio
              // IVA = precio * (tasa / (100 + tasa))
              const ivaPorcentaje = Number(form.iva) || 0;
              const ivaVal = (ivaPorcentaje && ivaPorcentaje > 0) 
                ? (base * ivaPorcentaje) / (100 + ivaPorcentaje) 
                : 0;
              
              // Calcular subtotal sin IVA
              const subtotalSinIva = base - ivaVal;
              
              // Calcular retención: 
              // - Para órdenes a crédito: solo si está marcado el checkbox Y supera el umbral
              // - Para órdenes a contado: solo si supera el umbral (comportamiento automático)
              const debeAplicarRetencion = esCredito
                ? (tieneRetencion && subtotalSinIva >= (retefuenteThreshold || 0))
                : (subtotalSinIva >= (retefuenteThreshold || 0));
              
              const retencionPorcentaje = debeAplicarRetencion ? (Number(form.retencionFuente) || 0) : 0;
              const reteVal = debeAplicarRetencion 
                ? (subtotalSinIva * retencionPorcentaje) / 100 
                : 0;
              
              // Total final: base (con IVA incluido) - retención
              const total = base - reteVal;
              
              const invalid = (parseFloat(form.descuentos) || 0) > subtotalOrden || base < 0;
              const money = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;
              
              if (invalid && validationMsg !== "Descuento supera el subtotal") setValidationMsg("Descuento supera el subtotal");
              if (!invalid && validationMsg) setValidationMsg("");
              
              return (
                <>
                  <div className="calculo-grid">
                    <div>
                      <label>Base (Subtotal - Descuentos):</label>
                      <input type="text" value={money(base)} disabled />
                    </div>
                    <div>
                      <label>IVA (valor):</label>
                      <input type="text" value={money(ivaVal)} disabled />
                    </div>
                    <div>
                      <label>Subtotal sin IVA:</label>
                      <input type="text" value={money(subtotalSinIva)} disabled />
                    </div>
                    <div>
                      <label>Retención (valor):</label>
                      <input type="text" value={money(reteVal)} disabled />
                      {!debeAplicarRetencion && (
                        <small style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {esCredito 
                            ? (!tieneRetencion 
                                ? "No aplica (no marcada para retención)" 
                                : `No aplica (umbral: ${retefuenteThreshold.toLocaleString('es-CO')})`)
                            : `No aplica (umbral: ${retefuenteThreshold.toLocaleString('es-CO')})`}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="total-final">
                    <span>Total a Facturar:</span>
                    <strong>{money(total)}</strong>
                  </div>
                </>
              );
            })()}
            {validationMsg && (
              <div style={{ color: '#b91c1c', marginTop: '0.25rem' }}>{validationMsg}</div>
            )}
          </section>

          {/* SECCIÓN PAGO */}
          <section className="section-card">
            <h3>Forma de Pago</h3>
            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </section>

          {/* SECCIÓN OBSERVACIONES */}
          <section className="section-card">
            <h3>Observaciones</h3>
            <textarea
              name="observaciones"
              rows="3"
              value={form.observaciones}
              onChange={handleChange}
            ></textarea>
          </section>

          {/* FOOTER */}
          <footer className="facturar-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={
                loading ||
                !form.ordenId ||
                (parseFloat(form.descuentos) || 0) > subtotalOrden ||
                (Number(form.iva) || 0) < 0 ||
                (Number(form.retencionFuente) || 0) < 0 ||
                creditoPendiente ||
                isAnulada
              }
            >
              {loading ? "Guardando..." : "Guardar Factura"}
            </button>
          </footer>
        </form>
      </div>

      {/* Modal de selección de clientes */}
      {showClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 100001 }}>
          <div className="modal-container" style={{ 
            maxWidth: '900px', 
            width: '95vw', 
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <header className="modal-header">
              <h2>Seleccionar Cliente</h2>
              <button className="close-btn" onClick={() => {
                setClienteSearchModal("");
                setShowClienteModal(false);
              }}>
                ✕
              </button>
            </header>
            
            <div style={{ marginBottom: '1rem', flexShrink: 0, padding: '1.2rem' }}>
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  padding: '0.5rem',
                  border: '1px solid #d2d5e2',
                  borderRadius: '5px'
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              border: '1px solid #e6e8f0',
              borderRadius: '8px',
              margin: '0 1.2rem',
              marginBottom: '1.2rem'
            }}>
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                
                // Ordenar alfabéticamente
                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                });
                
                if (sorted.length === 0) {
                  return (
                    <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                      No se encontraron clientes
                    </div>
                  );
                }
                
                return (
                  <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Nombre</th>
                          <th style={{ width: '15%' }}>NIT</th>
                          <th style={{ width: '25%' }}>Correo</th>
                          <th style={{ width: '15%' }}>Ciudad</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td title={c.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {c.nombre || '-'}
                            </td>
                            <td title={c.nit || '-'}>
                              {c.nit || '-'}
                            </td>
                            <td title={c.correo || '-'}>
                              {c.correo || '-'}
                            </td>
                            <td title={c.ciudad || '-'}>
                              {c.ciudad || '-'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteFactura(c);
                                  setClienteFacturaId(String(c.id));
                                  setClienteSearchModal("");
                                  setShowClienteModal(false);
                                }}
                                className="btn-save"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            
            <div className="modal-footer" style={{ marginTop: 0 }}>
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setClienteSearchModal("");
                  setShowClienteModal(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
