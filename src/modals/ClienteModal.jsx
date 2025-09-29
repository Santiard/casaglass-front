import { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function ClienteModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clienteAEditar 
}) {
  const initialState = {
    nit: "",
    nombre: "",
    direccion: "",
    telefono: "",
    ciudad: "",
    correo: "",
    credito: false,
  };

  const [formData, setFormData] = useState(initialState);

  // Si entra un cliente, rellenamos el form. Si no, limpiamos.
  useEffect(() => {
    if (clienteAEditar) {
      setFormData(clienteAEditar);
    } else {
      setFormData(initialState);
    }
  }, [clienteAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, !!clienteAEditar); 
    onClose(); 
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>{clienteAEditar ? "Editar Cliente" : "Agregar Cliente"}</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            NIT:
            <input 
              type="text" 
              name="nit" 
              value={formData.nit} 
              onChange={handleChange} 
              required 
              disabled={!!clienteAEditar} // Si editas, no cambiar el NIT
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

          <label>
            Correo:
            <input 
              type="email" 
              name="correo" 
              value={formData.correo} 
              onChange={handleChange} 
              required 
            />
          </label>

          <label className="checkbox">
            <input 
              type="checkbox" 
              name="credito" 
              checked={formData.credito} 
              onChange={handleChange} 
            />
            ¿Tiene crédito?
          </label>

          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              {clienteAEditar ? "Guardar Cambios" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
