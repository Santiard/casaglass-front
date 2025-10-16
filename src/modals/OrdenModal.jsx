// src/modals/OrdenModal.jsx
import React, { useEffect, useState } from "react";
import "../styles/Modal.css";
import { actualizarOrden } from "../services/OrdenesService";

// ✅ Este modal SOLO edita órdenes ya existentes
export default function OrdenModal({ isOpen, onClose, onSave, orden }) {
  const [form, setForm] = useState({
    id: null,
    numero: "",
    fecha: "",
    cliente: null,
    sede: null,
    obra: "",
    venta: false,
    credito: false,
    subtotal: 0,
    total: 0,
    incluidaEntrega: false,
  });

  // Cargar datos actuales de la orden al abrir el modal
  useEffect(() => {
    if (orden) {
      setForm({
        id: orden.id,
        numero: orden.numero,
        fecha: orden.fecha ? orden.fecha.slice(0, 10) : "",
        cliente: orden.cliente || null,
        sede: orden.sede || null,
        obra: orden.obra || "",
        venta: !!orden.venta,
        credito: !!orden.credito,
        subtotal: orden.subtotal || 0,
        total: orden.total || 0,
        incluidaEntrega: !!orden.incluidaEntrega,
      });
    }
  }, [orden]);

  if (!isOpen || !orden) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGuardar = async () => {
    try {
      const payload = {
        ...orden,
        obra: form.obra,
        venta: form.venta,
        credito: form.credito,
      };
      await actualizarOrden(orden.id, payload);
      onSave?.(payload, true); // true = edición
      onClose();
    } catch (e) {
      console.error("Error actualizando orden:", e);
      alert("No se pudo actualizar la orden. Revisa consola.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Editar Orden #{form.numero}</h2>

        <div className="modal-body">
          <div className="form-grid">
            <label>
              <span>Fecha:</span>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                disabled
              />
            </label>

            <label>
              <span>Cliente:</span>
              <input
                type="text"
                value={form.cliente?.nombre ?? ""}
                disabled
              />
            </label>

            <label>
              <span>Sede:</span>
              <input
                type="text"
                value={form.sede?.nombre ?? ""}
                disabled
              />
            </label>

            <label>
              <span>Obra:</span>
              <input
                type="text"
                name="obra"
                value={form.obra}
                onChange={handleChange}
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="venta"
                checked={form.venta}
                onChange={handleChange}
              />
              Venta
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="credito"
                checked={form.credito}
                onChange={handleChange}
              />
              Crédito
            </label>

            <label>
              <span>Subtotal:</span>
              <input
                type="number"
                value={form.subtotal}
                readOnly
                disabled
              />
            </label>

            <label>
              <span>Total:</span>
              <input
                type="number"
                value={form.total}
                readOnly
                disabled
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.incluidaEntrega}
                disabled
              />
              Incluida en entrega
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-save" onClick={handleGuardar}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
