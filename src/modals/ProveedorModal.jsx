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
  const numericFields = ['nit', 'telefono'];
  const validationRules = {
    nit: { regex: VALIDATION_PATTERNS.NIT_9_DIGITS },
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
    
    // Usar el handleChange base del hook
    baseHandleChange(e);
    
    // Validaciones específicas adicionales
    if (name === 'nit') {
      // Verificar si el NIT ya existe (solo al crear, no al editar)
      if (!proveedorAEditar && value.length === 9) {
        const existe = proveedoresExistentes.some(proveedor => 
          proveedor.nit === value
        );
        setNitDuplicado(existe);
      } else {
        setNitDuplicado(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validación final antes de guardar
    if (formData.nit && formData.nit.length !== 9) {
      showError('El NIT debe contener exactamente 9 dígitos');
      return;
    }
    
    if (formData.telefono && !/^\d{1,12}$/.test(formData.telefono)) {
      showError('El teléfono debe contener solo números (máximo 12 dígitos)');
      return;
    }
    
    // Validar NIT duplicado solo cuando estamos creando (no editando)
    if (!proveedorAEditar && formData.nit) {
      const nitExiste = proveedoresExistentes.some(proveedor => 
        proveedor.nit === formData.nit
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
              placeholder="Ingrese 9 dígitos"
              maxLength="9"
              pattern="\d{9}"
              title="El NIT debe contener exactamente 9 dígitos"
              required
              disabled={!!proveedorAEditar}
              style={{
                borderColor: nitDuplicado ? '#ef4444' : '',
                backgroundColor: nitDuplicado ? '#fef2f2' : ''
              }}
            />
            {nitDuplicado && !proveedorAEditar && (
              <div style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                marginTop: '0.25rem',
                fontWeight: '500'
              }}>
                ⚠️ Este NIT ya está registrado
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
