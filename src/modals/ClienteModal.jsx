import { useState, useEffect } from "react";
import "../styles/CrudModal.css";
import { useUppercaseForm, getInputStyles, VALIDATION_PATTERNS } from "../hooks/useUppercaseForm.js";

export default function ClienteModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clienteAEditar,
  clientesExistentes = [] // lista de clientes para validar duplicados
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

  // Configuración del hook personalizado
  // NIT no está en numericFields porque permite guion "-"
  const numericFields = ['telefono'];
  const validationRules = {
    telefono: { regex: VALIDATION_PATTERNS.PHONE_10_DIGITS }
  };

  const { formData, handleChange: baseHandleChange, setFormData } = useUppercaseForm(
    initialState, 
    numericFields, 
    null, // null = aplicar mayúsculas a todos los campos que no sean numéricos
    validationRules
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [nitDuplicado, setNitDuplicado] = useState(false);

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
    setNitDuplicado(false);
  }, [clienteAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para checkboxes, manejar de forma especial
    if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Manejo especial para NIT: permite números y guion "-"
    if (name === 'nit') {
      // Permitir solo números y guion, máximo 11 caracteres
      const filtered = value.replace(/[^0-9-]/g, '');
      // Limitar a 11 caracteres
      const limited = filtered.slice(0, 11);
      
      setFormData(prev => ({
        ...prev,
        [name]: limited
      }));
      
      // Verificar si el NIT ya existe (excluyendo el cliente actual si estamos editando)
      if (limited.length >= 1) {
        const existe = clientesExistentes.some(cliente => 
          cliente.nit === limited && cliente.id !== clienteAEditar?.id
        );
        setNitDuplicado(existe);
      } else {
        setNitDuplicado(false);
      }
      return;
    }
    
    // Usar el handleChange base del hook para otros campos
    baseHandleChange(e);
  };

  // Validación muy básica en el front
  const validate = () => {
    const nit = (formData.nit || "").trim();
    const nombre = (formData.nombre || "").trim();
    const correo = (formData.correo || "").trim();
    const telefono = (formData.telefono || "").trim();
    
    if (!nit) return "El NIT es obligatorio.";
    if (nit.length > 11) return "El NIT debe contener máximo 11 caracteres (incluyendo el guion -).";
    if (nit.length < 1) return "El NIT debe contener al menos 1 carácter.";
    // Validar formato: solo números y un guion opcional
    if (!/^[\d-]+$/.test(nit)) return "El NIT solo puede contener números y el guion (-).";
    if (!nombre) return "El nombre es obligatorio.";
    if (!correo) return "El correo es obligatorio.";
    if (telefono && telefono.length > 10) return "El teléfono no puede tener más de 10 dígitos.";
    if (telefono && !/^\d+$/.test(telefono)) return "El teléfono debe contener solo números.";
    
    // email simple
    if (!/^\S+@\S+\.\S+$/.test(correo)) return "El correo no es válido.";
    
    // Validar NIT duplicado (excluyendo el cliente actual si estamos editando)
    if (nit) {
      const nitExiste = clientesExistentes.some(cliente => 
        cliente.nit === nit && cliente.id !== clienteAEditar?.id
      );
      if (nitExiste) {
        return `Ya existe un cliente registrado con el NIT ${nit}.`;
      }
    }
    
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
              placeholder="Máximo 11 caracteres (ej: 123456789-0)"
              maxLength="11"
              pattern="[\d-]{1,11}"
              title="El NIT debe contener entre 1 y 11 caracteres (números y guion -)"
              required
              onKeyDown={(e) => {
                // Permitir: números, guion, backspace, delete, tab, escape, enter, y atajos de teclado
                if (!/[0-9-]/.test(e.key) && 
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) &&
                    !(e.key === 'a' && e.ctrlKey) && // Ctrl+A
                    !(e.key === 'c' && e.ctrlKey) && // Ctrl+C
                    !(e.key === 'v' && e.ctrlKey) && // Ctrl+V
                    !(e.key === 'x' && e.ctrlKey)) { // Ctrl+X
                  e.preventDefault();
                }
              }}
              style={{
                borderColor: nitDuplicado ? '#ef4444' : '',
                backgroundColor: nitDuplicado ? '#fef2f2' : ''
              }}
            />
            {nitDuplicado && (
              <div style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem',
                fontWeight: '500'
              }}>
                Este NIT ya está registrado
              </div>
            )}
          </label>

          <label>
            Nombre:
            <input 
              type="text" 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange}
              style={getInputStyles('nombre', numericFields)}
              placeholder="Nombre del cliente"
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
              style={getInputStyles('direccion', numericFields)}
              placeholder="Dirección del cliente"
            />
          </label>

          <label>
            Teléfono:
            <input 
              type="text" 
              name="telefono" 
              value={formData.telefono} 
              onChange={handleChange}
              placeholder="Máximo 10 dígitos"
              maxLength="10"
              pattern="\d{1,10}"
              title="El teléfono debe contener solo números (máximo 10 dígitos)"
            />
          </label>

          <label>
            Ciudad:
            <input 
              type="text" 
              name="ciudad" 
              value={formData.ciudad} 
              onChange={handleChange}
              style={getInputStyles('ciudad', numericFields)}
              placeholder="Ciudad del cliente"
            />
          </label>

          <label>
            Correo:
            <input 
              type="email" 
              name="correo" 
              value={formData.correo} 
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              required 
            />
          </label>

          <div className="checkbox">
            <input 
              type="checkbox" 
              name="credito" 
              id="credito-checkbox"
              checked={!!formData.credito} 
              onChange={handleChange} 
            />
            <label htmlFor="credito-checkbox" className="checkbox-text">
              ¿Tiene crédito?
            </label>
          </div>

          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-guardar" 
              disabled={saving || nitDuplicado}
              style={{
                opacity: (saving || nitDuplicado) ? 0.5 : 1,
                cursor: (saving || nitDuplicado) ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? "Guardando…" : (clienteAEditar ? "Guardar Cambios" : "Agregar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
