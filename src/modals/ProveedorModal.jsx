import { useState, useEffect } from "react";
import "../styles/CrudModal.css";
import { useUppercaseForm, getInputStyles, VALIDATION_PATTERNS } from "../hooks/useUppercaseForm.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ProveedorModal({ 
  isOpen, 
  onClose, 
  onSave, 
  proveedorAEditar, // si existe, estamos editando
  proveedoresExistentes = [] // lista de proveedores para validar duplicados
}) {
  const initialState = {
    nit: "",
    nombre: "",
    direccion: "",
    telefono: "",
    ciudad: "",
  };

  // Configuración del hook personalizado
  // NIT no está en numericFields porque lo manejamos manualmente para permitir edición
  const numericFields = ['telefono'];
  const validationRules = {
    telefono: { regex: VALIDATION_PATTERNS.PHONE_12_DIGITS }
  };

  const { showError } = useToast();
  const { formData, handleChange: baseHandleChange, setFormData } = useUppercaseForm(
    initialState, 
    numericFields, 
    null, // null = aplicar mayúsculas a todos los campos que no sean numéricos
    validationRules
  );

  const [nitDuplicado, setNitDuplicado] = useState(false);

  // cuando se abre el modal, rellenamos si hay proveedor para editar
  useEffect(() => {
    if (proveedorAEditar) {
      setFormData(proveedorAEditar);
    } else {
      setFormData(initialState);
    }
    // Limpiar estado de validación
    setNitDuplicado(false);
  }, [proveedorAEditar, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
      
      // Verificar si el NIT ya existe (excluyendo el proveedor actual si estamos editando)
      if (limited.length >= 1) {
        const existe = proveedoresExistentes.some(proveedor => 
          proveedor.nit === limited && proveedor.id !== proveedorAEditar?.id
        );
        setNitDuplicado(existe);
      } else {
        setNitDuplicado(false);
      }
      return;
    }
    
    // Para otros campos, usar el handleChange base del hook
    baseHandleChange(e);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validación final antes de guardar
    const nit = (formData.nit || "").trim();
    if (!nit) {
      showError('El NIT es obligatorio');
      return;
    }
    if (nit.length > 11) {
      showError('El NIT debe contener máximo 11 caracteres (incluyendo el guion -)');
      return;
    }
    if (nit.length < 1) {
      showError('El NIT debe contener al menos 1 carácter');
      return;
    }
    // Validar formato: solo números y un guion opcional
    if (!/^[\d-]+$/.test(nit)) {
      showError('El NIT solo puede contener números y el guion (-)');
      return;
    }
    
    if (formData.telefono && !/^\d{1,12}$/.test(formData.telefono)) {
      showError('El teléfono debe contener solo números (máximo 12 dígitos)');
      return;
    }
    
    // Validar NIT duplicado (excluyendo el proveedor actual si estamos editando)
    if (formData.nit) {
      const nitExiste = proveedoresExistentes.some(proveedor => 
        proveedor.nit === formData.nit && proveedor.id !== proveedorAEditar?.id
      );
      
      if (nitExiste) {
        showError(`Ya existe un proveedor registrado con el NIT ${formData.nit}. Por favor, verifique el número ingresado.`);
        return;
      }
    }
    
    // Si llegamos aquí, todas las validaciones pasaron
    const isEdit = !!proveedorAEditar;
    onSave(formData, isEdit); // devolvemos al padre (crear o editar)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2>{proveedorAEditar ? "Editar Proveedor" : "Agregar Proveedor"}</h2>
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
              placeholder="Nombre del proveedor"
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
              placeholder="Dirección del proveedor"
            />
          </label>

          <label>
            Teléfono:
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Máximo 12 dígitos"
              maxLength="12"
              pattern="\d{1,12}"
              title="El teléfono debe contener solo números (máximo 12 dígitos)"
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
              placeholder="Ciudad del proveedor"
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
            <button 
              type="submit" 
              className="btn-guardar"
              disabled={nitDuplicado}
              style={{
                opacity: nitDuplicado ? 0.5 : 1,
                cursor: nitDuplicado ? 'not-allowed' : 'pointer'
              }}
            >
              {proveedorAEditar ? "Guardar Cambios" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
