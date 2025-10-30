import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import './ConfirmarEntregaModal.css';

const ConfirmarEntregaModal = ({ isOpen, entrega, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    montoEntregado: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (entrega && isOpen) {
      setFormData({
        montoEntregado: entrega.montoEntregado || '',
        observaciones: ''
      });
      setError('');
    }
  }, [entrega, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularDiferencia = () => {
    if (!entrega || !formData.montoEntregado) return 0;
    return parseFloat(formData.montoEntregado) - (entrega.montoEntregado || 0);
  };

  const sumaDesglose = () => {
    const e = entrega || {};
    return [e.montoEfectivo, e.montoTransferencia, e.montoCheque, e.montoDeposito]
      .map(v => parseFloat(v) || 0)
      .reduce((a,b)=>a+b,0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.montoEntregado) {
      setError('Debe especificar el monto entregado');
      return;
    }

    const montoEntregado = parseFloat(formData.montoEntregado);
    if (isNaN(montoEntregado) || montoEntregado < 0) {
      setError('El monto debe ser un número válido mayor o igual a 0');
      return;
    }

    try {
      setLoading(true);
      
      await EntregasService.confirmarEntrega(
        entrega.id,
        montoEntregado,
        formData.observaciones
      );
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Error confirmando entrega:', err);
      setError(`Error confirmando entrega: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !entrega) return null;

  const diferencia = calcularDiferencia();

  return (
    <div className="confirmar-entrega-modal-overlay">
      <div className="confirmar-entrega-modal">
        <div className="modal-header">
          <h2>Confirmar Entrega</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="entrega-info">
          <div className="info-grid">
            <div className="info-item">
              <label>Entrega ID:</label>
              <span>#{entrega.id}</span>
            </div>
            <div className="info-item">
              <label>Sede:</label>
              <span>{entrega.sede?.nombre}</span>
            </div>
            <div className="info-item">
              <label>Empleado:</label>
              <span>{entrega.empleado?.nombre}</span>
            </div>
            <div className="info-item">
              <label>Fecha:</label>
              <span>{entrega.fechaEntrega}</span>
            </div>
            <div className="info-item">
              <label>Total Órdenes:</label>
              <span>${entrega.montoEsperado?.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Gastos:</label>
              <span>${entrega.montoGastos?.toLocaleString()}</span>
            </div>
            <div className="info-item highlight">
              <label>Suma Desglose (efec+transf+cheque+dep):</label>
              <span>${sumaDesglose().toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Estado Actual:</label>
              <span className={`estado-badge ${entrega.estado?.toLowerCase()}`}>
                {entrega.estado}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="confirmar-form">
          <div className="form-group">
            <label>Monto Real Entregado *</label>
            <div className="monto-input-container">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                name="montoEntregado"
                value={formData.montoEntregado}
                onChange={handleChange}
                placeholder="0"
                step="1000"
                min="0"
                required
              />
            </div>
          </div>

          {diferencia !== 0 && (
            <div className={`diferencia-alert ${diferencia < 0 ? 'negativa' : 'positiva'}`}>
              <div className="diferencia-header">
                <strong>
                  {diferencia < 0 ? '⚠️ Diferencia Negativa' : 'ℹ️ Diferencia Positiva'}
                </strong>
              </div>
              <div className="diferencia-amount">
                {diferencia < 0 ? 'Faltante' : 'Sobrante'}: ${Math.abs(diferencia).toLocaleString()}
              </div>
              <div className="diferencia-description">
                {diferencia < 0 
                  ? 'Se entregó menos dinero del calculado. Por favor verifica los gastos o las órdenes incluidas.'
                  : 'Se entregó más dinero del calculado. Por favor verifica si hay ingresos adicionales no registrados.'
                }
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="4"
              placeholder="Observaciones sobre la entrega (opcional)..."
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-confirmar"
              disabled={loading}
            >
              {loading ? 'Confirmando...' : 'Confirmar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmarEntregaModal;