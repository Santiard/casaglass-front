import React, { useState, useEffect } from 'react';
import GastosService from '../services/GastosService';
import { useToast } from '../context/ToastContext.jsx';
import './CrearGastoModal.css';

const CrearGastoModal = ({ isOpen, onClose, onSuccess, sedes, trabajadores, proveedores }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    sedeId: '',
    fechaGasto: new Date().toISOString().slice(0, 10),
    monto: '',
    concepto: '',
    tipo: 'OPERATIVO',
    descripcion: '',
    comprobante: '',
    empleadoId: '',
    proveedorId: '',
    observaciones: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({
      sedeId: '',
      fechaGasto: new Date().toISOString().slice(0, 10),
      monto: '',
      concepto: '',
      tipo: 'OPERATIVO',
      descripcion: '',
      comprobante: '',
      empleadoId: '',
      proveedorId: '',
      observaciones: ''
    });
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? value : (type === 'text' ? value.toUpperCase() : value);
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (!formData.sedeId) {
        setError('La sede es obligatoria');
        setLoading(false);
        return;
      }

      if (!formData.fechaGasto) {
        setError('La fecha del gasto es obligatoria');
        setLoading(false);
        return;
      }

      if (!formData.monto || parseFloat(formData.monto) <= 0) {
        setError('El monto debe ser mayor a 0');
        setLoading(false);
        return;
      }

      if (!formData.concepto || formData.concepto.trim() === '') {
        setError('El concepto es obligatorio');
        setLoading(false);
        return;
      }

      const gastoData = {
        sedeId: parseInt(formData.sedeId),
        fechaGasto: formData.fechaGasto,
        monto: parseFloat(formData.monto),
        concepto: formData.concepto.trim()
      };

      // Campos opcionales - solo agregar si tienen valor
      if (formData.descripcion?.trim()) {
        gastoData.descripcion = formData.descripcion.trim();
      }
      if (formData.comprobante?.trim()) {
        gastoData.comprobante = formData.comprobante.trim();
      }
      if (formData.tipo && formData.tipo !== 'OPERATIVO') {
        gastoData.tipo = formData.tipo;
      }
      if (formData.empleadoId) {
        gastoData.empleadoId = parseInt(formData.empleadoId);
      }
      if (formData.proveedorId) {
        gastoData.proveedorId = parseInt(formData.proveedorId);
      }
      if (formData.observaciones?.trim()) {
        gastoData.observaciones = formData.observaciones.trim();
      }

      const respuesta = await GastosService.crearGasto(gastoData);

      showSuccess('Gasto creado exitosamente');
      
      if (onSuccess) onSuccess(respuesta);
      onClose();
      
    } catch (err) {
      console.error('Error creando gasto:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al crear el gasto';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container crear-gasto-modal">
        <div className="modal-header">
          <h2>Crear Gasto de Sede</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label>Sede <span className="required">*</span></label>
              <select
                name="sedeId"
                value={formData.sedeId}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione una sede</option>
                {Array.isArray(sedes) && sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha del Gasto <span className="required">*</span></label>
              <input
                type="date"
                name="fechaGasto"
                value={formData.fechaGasto}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Monto <span className="required">*</span></label>
              <input
                type="number"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo de Gasto</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="COMBUSTIBLE">Combustible</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="SERVICIOS">Servicios</option>
                <option value="EMERGENCIA">Emergencia</option>
                <option value="ALIMENTACION">Alimentación</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Concepto <span className="required">*</span></label>
              <input
                type="text"
                name="concepto"
                value={formData.concepto}
                onChange={handleChange}
                placeholder="Ej: Limpieza, Gasolina, Papelería..."
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Descripción Detallada</label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows="3"
                placeholder="Descripción detallada del gasto (opcional)"
              />
            </div>

            <div className="form-group">
              <label>Número de Comprobante</label>
              <input
                type="text"
                name="comprobante"
                value={formData.comprobante}
                onChange={handleChange}
                placeholder="Número de factura o recibo"
              />
            </div>

            <div className="form-group">
              <label>Empleado</label>
              <select
                name="empleadoId"
                value={formData.empleadoId}
                onChange={handleChange}
              >
                <option value="">Seleccione un empleado (opcional)</option>
                {Array.isArray(trabajadores) && trabajadores.map(trabajador => (
                  <option key={trabajador.id} value={trabajador.id}>
                    {trabajador.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Proveedor</label>
              <select
                name="proveedorId"
                value={formData.proveedorId}
                onChange={handleChange}
              >
                <option value="">Seleccione un proveedor (opcional)</option>
                {Array.isArray(proveedores) && proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Observaciones</label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows="2"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearGastoModal;

