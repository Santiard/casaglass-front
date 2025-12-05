import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import './ConfirmarEntregaModal.css';

const ConfirmarEntregaModal = ({ isOpen, entrega, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sumaDesglose = () => {
    const e = entrega || {};
    return [e.montoEfectivo, e.montoTransferencia, e.montoCheque, e.montoDeposito]
      .map(v => parseFloat(v) || 0)
      .reduce((a,b)=>a+b,0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      
      // Confirmar entrega sin montoEntregado ni observaciones (modelo simplificado)
      await EntregasService.confirmarEntrega(entrega.id);
      
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

  const monto = Number(entrega.monto ?? 0);
  const montoEfectivo = Number(entrega.montoEfectivo ?? 0);
  const montoTransferencia = Number(entrega.montoTransferencia ?? 0);
  const montoCheque = Number(entrega.montoCheque ?? 0);
  const montoDeposito = Number(entrega.montoDeposito ?? 0);
  const suma = sumaDesglose();

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
            <div className="info-item highlight">
              <label>Monto Total:</label>
              <span>${monto.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Efectivo:</label>
              <span>${montoEfectivo.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Transferencia:</label>
              <span>${montoTransferencia.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Cheque:</label>
              <span>${montoCheque.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Depósito:</label>
              <span>${montoDeposito.toLocaleString()}</span>
            </div>
            {suma !== monto && (
              <div className="info-item" style={{ gridColumn: "1 / -1", color: "red" }}>
                Advertencia: La suma del desglose (${suma.toLocaleString()}) no coincide con el monto total (${monto.toLocaleString()})
              </div>
            )}
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
            <label>¿Está seguro de que desea confirmar esta entrega?</label>
            <p style={{ color: '#666', fontSize: '0.9em', marginTop: '0.5rem' }}>
              El estado cambiará a "ENTREGADA". Esta acción confirma que se entregó el monto total especificado.
            </p>
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