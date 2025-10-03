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
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Si entra un cliente, rellenamos el form. Si no, limpiamos.
  useEffect(() => {
    if (clienteAEditar) {
      // Asegura que 'credito' sea boolean real
      setFormData({
        ...clienteAEditar,
        credito: !!clienteAEditar.credito
      });
    } else {
      setFormData(initialState);
    }
    setErrorMsg("");
    setSaving(false);
  }, [clienteAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Validación muy básica en el front
  const validate = () => {
    const nit = (formData.nit || "").trim();
    const nombre = (formData.nombre || "").trim();
    const correo = (formData.correo || "").trim();
    if (!nit) return "El NIT es obligatorio.";
    if (!nombre) return "El nombre es obligatorio.";
    if (!correo) return "El correo es obligatorio.";
    // email simple
    if (!/^\S+@\S+\.\S+$/.test(correo)) return "El correo no es válido.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const validation = validate();
    if (validation) {
      setErrorMsg(validation);
      return;
    }

    const payload = {
      ...formData,
      nit: (formData.nit || "").trim(),
      nombre: (formData.nombre || "").trim(),
      direccion: (formData.direccion || "").trim(),
      telefono: (formData.telefono || "").trim(),
      ciudad: (formData.ciudad || "").trim(),
      correo: (formData.correo || "").trim(),
      credito: !!formData.credito,
    };

    try {
      setSaving(true);
      await onSave(payload, !!clienteAEditar); // <- debe devolver Promise (Page lo hace)
      onClose(); // Sólo cerramos si no falló
    } catch (err) {
      // Intentamos mostrar mensaje útil desde el backend
      const msg = err?.response?.data?.message 
               || err?.response?.data?.error
               || err?.message
               || "No se pudo guardar el cliente.";
      setErrorMsg(String(msg));

      // Ejemplos típicos:
      // - NIT/Correo duplicados (constraint unique): 409 o 400 dependiendo tu manejo
      // - Campos inválidos: 400
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>{clienteAEditar ? "Editar Cliente" : "Agregar Cliente"}</h2>

        {errorMsg && (
          <div className="modal-error" role="alert">
            {errorMsg}
          </div>
        )}

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
              checked={!!formData.credito} 
              onChange={handleChange} 
            />
            ¿Tiene crédito?
          </label>

          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={saving}>
              {saving ? "Guardando…" : (clienteAEditar ? "Guardar Cambios" : "Agregar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
