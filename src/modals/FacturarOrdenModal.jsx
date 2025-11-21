import React, { useState, useEffect } from "react";
import "../styles/FacturarOrdenModal.css";
import { useToast } from "../context/ToastContext.jsx";
import { getBusinessSettings } from "../services/businessSettingsService.js";

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
  const creditoPendiente = Boolean(orden?.credito) && Number(orden?.creditoDetalle?.saldoPendiente || 0) > 0;
  const isAnulada = String(orden?.estado || "").toUpperCase() === "ANULADA";

  // Cargar configuración de impuestos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      getBusinessSettings().then((settings) => {
        if (settings) {
          setIvaRate(Number(settings.ivaRate) || 19);
          setRetefuenteRate(Number(settings.retefuenteRate) || 2.5);
          setRetefuenteThreshold(Number(settings.retefuenteThreshold) || 1000000);
        }
      });
    }
  }, [isOpen]);

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
      
      // Calcular retención: Solo si la base (sin IVA) supera el umbral
      const subtotalSinIva = baseInicial - ivaCalculado;
      const aplicaRetencion = subtotalSinIva >= (retefuenteThreshold || 0);

      setForm({
        ordenId: orden.id,
        fecha: new Date().toISOString().split("T")[0],
        subtotal,
        descuentos: descuentosOrden || "",
        iva: ivaRate || 0, // Usar el porcentaje de IVA desde configuración
        retencionFuente: aplicaRetencion ? (retefuenteRate || 0) : 0, // Usar el porcentaje de retención si aplica
        formaPago: "EFECTIVO",
        observaciones: `Factura generada desde orden #${orden.numero}`,
      });
    }
  }, [isOpen, orden, ivaRate, retefuenteRate, retefuenteThreshold]);

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
      const payloadToSend = {
        ...form,
        descuentos: form.descuentos === "" ? 0 : form.descuentos,
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
    <div className="modal-overlay">
      <div className="modal-container">
        {/* CABECERA */}
        <header className="modal-header">
          <h2>Facturar Orden #{orden?.numero}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* CONTENIDO */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* SECCIÓN RESUMEN */}
          <section className="section-card">
            <h3>Resumen de la Orden</h3>
            <div className="info-grid">
              <div>
                <label>ID Orden:</label>
                <input type="text" value={orden?.id || ""} disabled />
              </div>
              <div>
                <label>Cliente:</label>
                <input type="text" value={orden?.cliente?.nombre || "—"} disabled />
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
              
              // Calcular retención: Solo si la base (sin IVA) supera el umbral
              const aplicaRetencion = subtotalSinIva >= (retefuenteThreshold || 0);
              const retencionPorcentaje = aplicaRetencion ? (Number(form.retencionFuente) || 0) : 0;
              const reteVal = aplicaRetencion 
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
                      {!aplicaRetencion && (
                        <small style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          No aplica (umbral: ${retefuenteThreshold.toLocaleString('es-CO')})
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
          <footer className="modal-footer">
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
    </div>
  );
}
