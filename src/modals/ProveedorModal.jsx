import { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function ProveedorModal({ 
  isOpen, 
  onClose, 
  onSave, 
  proveedorAEditar // si existe, estamos editando
}) {
  const initialState = {
    nit: "",
    nombre: "",
    direccion: "",
    telefono: "",
    ciudad: "",
  };

  const [formData, setFormData] = useState(initialState);

  // cuando se abre el modal, rellenamos si hay proveedor para editar
  useEffect(() => {
    if (proveedorAEditar) {
      setFormData(proveedorAEditar);
    } else {
      setFormData(initialState);
    }
  }, [proveedorAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); // devolvemos al padre (crear o editar)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>{proveedorAEditar ? "Editar Proveedor" : "Agregar Proveedor"}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            NIT:
            <input
              type="text"
              name="nit"
              value={formData.nit}
              onChange={handleChange}
              required
              disabled={!!proveedorAEditar}
            />
          </label>

          <label>
            Nombre:
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Dirección:
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
            />
          </label>

          <label>
            Teléfono:
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
            />
          </label>

          <label>
            Ciudad:
            <input
              type="text"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
            />
          </label>

          <div className="modal-buttons">
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              {proveedorAEditar ? "Guardar Cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
