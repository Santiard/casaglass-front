import React, { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function FacturarOrdenModal({ isOpen, onClose, onSave, orden }) {
  const [form, setForm] = useState({
    ordenId: "",
    fecha: new Date().toISOString().split('T')[0],
    subtotal: 0,
    descuentos: "",
    iva: 0,
    retencionFuente: 0,
    formaPago: "EFECTIVO",
    observaciones: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orden) {
      // Calcular total de la orden
      const subtotal = orden.total || 0;
      
      setForm({
        ordenId: orden.id,
        fecha: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
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
      // Para descuentos, permitir vacío
      if (name === "descuentos") {
        setForm(prev => ({ ...prev, [name]: value === "" ? "" : parseFloat(value) || 0 }));
      } else {
        setForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
      }
    } else if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: e.target.checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ordenId) {
      alert("Error: No se puede crear la factura sin una orden.");
      return;
    }

    setLoading(true);
    try {
      // Asegurar que descuentos sea 0 si está vacío
      const payloadToSend = {
        ...form,
        descuentos: form.descuentos === "" ? 0 : form.descuentos
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
        <div className="modal-header">
          <h2>Crear Factura - Orden #{orden?.numero}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Fecha:</label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Subtotal:</label>
              <input
                type="number"
                name="subtotal"
                value={form.subtotal}
                onChange={handleChange}
                step="0.01"
                required
                disabled
              />
            </div>

            <div className="form-group">
              <label>Descuentos:</label>
              <input
                type="number"
                name="descuentos"
                value={form.descuentos}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>IVA:</label>
              <input
                type="number"
                name="iva"
                value={form.iva}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Retención en la Fuente:</label>
              <input
                type="number"
                name="retencionFuente"
                value={form.retencionFuente}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Forma de Pago:</label>
              <select
                name="formaPago"
                value={form.formaPago}
                onChange={handleChange}
                required
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label>Observaciones:</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows="3"
                placeholder="Observaciones adicionales sobre la factura..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancelar" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? "Creando..." : "Crear Factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}