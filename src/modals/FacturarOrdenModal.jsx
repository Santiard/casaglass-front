import React, { useState, useEffect } from "react";
import "../styles/FacturarOrdenModal.css";

export default function FacturarOrdenModal({ isOpen, onClose, onSave, orden }) {
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
  const creditoPendiente = Boolean(orden?.credito) && Number(orden?.creditoDetalle?.saldoPendiente || 0) > 0;

  useEffect(() => {
    if (isOpen && orden) {
      const subtotal =
        typeof orden.total === "number" && !isNaN(orden.total)
          ? orden.total
          : Array.isArray(orden.items)
          ? orden.items.reduce(
              (acc, it) => acc + (Number(it.totalLinea) || 0),
              0
            )
          : 0;

      setSubtotalOrden(subtotal);

      setForm({
        ordenId: orden.id,
        fecha: new Date().toISOString().split("T")[0],
        subtotal,
        descuentos: "",
        iva: 0,
        retencionFuente: 0,
        formaPago: "EFECTIVO",
        observaciones: `Factura generada desde orden #${orden.numero}`,
      });
    }
  }, [isOpen, orden]);

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
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.ordenId) {
      alert("Error: No se puede crear la factura sin una orden.");
      return;
    }

    if (creditoPendiente) {
      alert("Esta orden es a crédito y tiene saldo pendiente. No se puede facturar hasta completar el pago.");
      return;
    }

    setLoading(true);
    try {
      const payloadToSend = {
        ...form,
        descuentos: form.descuentos === "" ? 0 : form.descuentos,
      };
      await onSave(payloadToSend, false);
      onClose();
    } catch (error) {
      console.error("Error creando factura:", error);
      alert(error?.message || "No se pudo crear la factura.");
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
                />
              </div>
              <div>
                <label>Retención (%):</label>
                <input
                  type="number"
                  name="retencionFuente"
                  value={form.retencionFuente}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
            </div>
            {(() => {
              const base = Math.max(0, subtotalOrden - (parseFloat(form.descuentos) || 0));
              const ivaVal = (base * (Number(form.iva) || 0)) / 100;
              const reteVal = (base * (Number(form.retencionFuente) || 0)) / 100;
              const total = base + ivaVal - reteVal;
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
                      <label>Retención (valor):</label>
                      <input type="text" value={money(reteVal)} disabled />
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
                creditoPendiente
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
