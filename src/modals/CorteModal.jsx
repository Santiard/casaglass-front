// src/modals/CorteModal.jsx
import { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function CorteModal({ isOpen, onClose, onSave, corte }) {
  const initialState = {
    id: null,
    productoId: null,
    codigo: "",
    nombre: "",
    posicion: "",
    tipo: "",
    color: "",
    categoria: "Cortes",
    descripcion: "",
    costo: 0,
    cantidadInsula: 0,
    cantidadCentro: 0,
    cantidadPatios: 0,
    precio1: 0,
    precio2: 0,
    precio3: 0,
    precioEspecial: 0,
    largoCm: "",
    precio: 0,
    observacion: "",
  };

  const [formData, setFormData] = useState(initialState);

  const isEditing = !!corte;

  useEffect(() => {
    if (corte) {
      setFormData({
        ...initialState,
        ...corte,
        // Asegurar que los campos numéricos tengan valores por defecto
        precio1: corte.precio1 ?? 0,
        precio2: corte.precio2 ?? 0,
        precio3: corte.precio3 ?? 0,
        precioEspecial: corte.precioEspecial ?? 0,
        largoCm: corte.largoCm ?? "",
        precio: corte.precio ?? 0,
        costo: corte.costo ?? 0,
      });
    } else {
      setFormData(initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corte]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? value : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.codigo?.trim()) {
      alert("El código es obligatorio");
      return;
    }
    if (!formData.nombre?.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!formData.largoCm || Number(formData.largoCm) <= 0) {
      alert("El largo (cm) debe ser mayor a 0");
      return;
    }

    // Preparar datos para guardar
    const toSave = { ...formData };

    // Si es creación, asegurar que las cantidades queden en 0 (no se ingresan al crear)
    if (!isEditing) {
      toSave.cantidadInsula = 0;
      toSave.cantidadCentro = 0;
      toSave.cantidadPatios = 0;
    }

    onSave(toSave);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-corte">
        <h2>{isEditing ? "Editar Corte" : "Agregar Corte"}</h2>

        <form onSubmit={handleSubmit} className="form">
          {/* === INFORMACIÓN BÁSICA === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label>
              Código:
              <input
                type="text"
                name="codigo"
                placeholder="Código único"
                value={formData.codigo}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Nombre:
              <input
                type="text"
                name="nombre"
                placeholder="Nombre del corte"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Categoría:
              <input
                type="text"
                name="categoria"
                placeholder="Categoría (ej. Cortes, Vidrios...)"
                value={formData.categoria}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Posición:
              <input
                type="text"
                name="posicion"
                placeholder="Posición (ej. C1, C2...)"
                value={formData.posicion}
                onChange={handleChange}
              />
            </label>

            <label>
              Tipo:
              <input
                type="text"
                name="tipo"
                placeholder="Tipo (ej. NEGRO, CLARO...)"
                value={formData.tipo}
                onChange={handleChange}
              />
            </label>

            <label>
              Color:
              <input
                type="text"
                name="color"
                placeholder="Color"
                value={formData.color}
                onChange={handleChange}
              />
            </label>
          </div>

          {/* === CARACTERÍSTICAS === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label>
              Largo (cm):
              <input
                type="number"
                name="largoCm"
                step="0.01"
                value={formData.largoCm}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Costo:
              <input
                type="number"
                name="costo"
                step="0.01"
                value={formData.costo}
                onChange={handleChange}
              />
            </label>

            <label>
              Precio Base:
              <input
                type="number"
                name="precio"
                step="0.01"
                value={formData.precio}
                onChange={handleChange}
              />
            </label>
          </div>

          {/* === CANTIDADES DE INVENTARIO (Solo al editar) === */}
          {isEditing && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Inventario por Sede:</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <label>
                  Cantidad Ínsula:
                  <input
                    type="number"
                    name="cantidadInsula"
                    value={formData.cantidadInsula}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Cantidad Centro:
                  <input
                    type="number"
                    name="cantidadCentro"
                    value={formData.cantidadCentro}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Cantidad Patios:
                  <input
                    type="number"
                    name="cantidadPatios"
                    value={formData.cantidadPatios}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>
          )}

          {/* === PRECIOS === */}
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Precios por Sede:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
              <label>
                Precio 1 (Ínsula):
                <input
                  type="number"
                  name="precio1"
                  step="0.01"
                  value={formData.precio1}
                  onChange={handleChange}
                />
              </label>

              <label>
                Precio 2 (Centro):
                <input
                  type="number"
                  name="precio2"
                  step="0.01"
                  value={formData.precio2}
                  onChange={handleChange}
                />
              </label>

              <label>
                Precio 3 (Patios):
                <input
                  type="number"
                  name="precio3"
                  step="0.01"
                  value={formData.precio3}
                  onChange={handleChange}
                />
              </label>

              <label>
                Precio Especial:
                <input
                  type="number"
                  name="precioEspecial"
                  step="0.01"
                  value={formData.precioEspecial}
                  onChange={handleChange}
                />
              </label>
            </div>
          </div>

          {/* === DESCRIPCIÓN Y OBSERVACIONES === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label>
              Descripción:
              <input
                type="text"
                name="descripcion"
                placeholder="Descripción del corte"
                value={formData.descripcion}
                onChange={handleChange}
              />
            </label>

            <label>
              Observación:
              <textarea
                name="observacion"
                placeholder="Observaciones adicionales"
                value={formData.observacion}
                onChange={handleChange}
                rows={2}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-cancelar">
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
