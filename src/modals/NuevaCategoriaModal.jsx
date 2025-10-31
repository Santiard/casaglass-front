import React, { useState } from "react";
import "../styles/CrudModal.css";

export default function NuevaCategoriaModal({ isOpen, onClose, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setNombre(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || nombre.trim().length === 0) {
      alert("El nombre de la categoría es obligatorio");
      return;
    }
    setLoading(true);
    try {
      await onCreate?.(nombre.trim().toUpperCase());
      reset();
      onClose?.();
    } catch (e) {
      console.error("Error creando categoría", e);
      alert(e?.response?.data?.message || "No se pudo crear la categoría");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Nueva Categoría</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Nombre de la categoría
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              placeholder="Ej: PERFIL, VIDRIO, etc."
              required
              maxLength={100}
            />
          </label>
          <div className="modal-buttons">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => {
                reset();
                onClose?.();
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

