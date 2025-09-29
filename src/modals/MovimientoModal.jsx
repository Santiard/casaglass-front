import { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function MovimientoModal({ movimiento, isOpen, onClose, onSave }) {
  const [editable, setEditable] = useState(true);
  const [form, setForm] = useState(movimiento);

  useEffect(() => {
    if (movimiento) {
      setForm({ ...movimiento });
      // Validar si ya pasaron 2 días
      const fechaMov = new Date(movimiento.fecha);
      const diffDays = (Date.now() - fechaMov.getTime()) / (1000 * 60 * 60 * 24);
      setEditable(diffDays <= 2);
    }
  }, [movimiento]);

  if (!isOpen || !movimiento) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductoChange = (index, field, value) => {
    const productos = [...form.productos];
    productos[index][field] = value;
    setForm((prev) => ({ ...prev, productos }));
  };

  const handleAddProducto = () => {
    setForm((prev) => ({
      ...prev,
      productos: [...(prev.productos || []), { nombre: "", sku: "", cantidad: 1 }],
    }));
  };

  const handleRemoveProducto = (index) => {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ width: "600px" }}>
        <h2>Detalles del Movimiento</h2>

        {/* Info general */}
        <div className="form">
          <label>
            Sede partida
            <input
              type="text"
              value={form.sedePartida}
              onChange={(e) => handleChange("sedePartida", e.target.value)}
              disabled={!editable}
            />
          </label>

          <label>
            Sede llegada
            <input
              type="text"
              value={form.sedeLlegada}
              onChange={(e) => handleChange("sedeLlegada", e.target.value)}
              disabled={!editable}
            />
          </label>

          <label>
            Fecha
            <input type="date" value={form.fecha?.substring(0, 10)} disabled />
          </label>

          <label>
            Confirmado
            <input type="checkbox" checked={form.confirmado} disabled />
          </label>

          <label>
            Confirmado por
            <input type="text" value={form.trabajadorConfirma ?? ""} disabled />
          </label>
        </div>

        {/* Productos */}
        <h3 style={{ marginTop: "1rem" }}>Productos</h3>
        {form.productos?.length > 0 ? (
          form.productos.map((p, idx) => (
            <div key={idx} className="form row" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Nombre"
                value={p.nombre}
                onChange={(e) => handleProductoChange(idx, "nombre", e.target.value)}
                disabled={!editable}
              />
              <input
                type="text"
                placeholder="SKU"
                value={p.sku}
                onChange={(e) => handleProductoChange(idx, "sku", e.target.value)}
                disabled={!editable}
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={p.cantidad}
                onChange={(e) => handleProductoChange(idx, "cantidad", e.target.value)}
                disabled={!editable}
              />
              {editable && (
                <button className="btn-cancelar" type="button" onClick={() => handleRemoveProducto(idx)}>
                  X
                </button>
              )}
            </div>
          ))
        ) : (
          <p>No hay productos.</p>
        )}

        {editable && (
          <button className="btn-guardar" type="button" onClick={handleAddProducto}>
            Agregar producto
          </button>
        )}

        {/* Botones */}
        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          {editable && (
            <button className="btn-guardar" onClick={handleSubmit}>
              Guardar cambios
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
