import React, { useState } from "react";
import "../styles/Modal.css";
import { useAuth } from "../context/AuthContext";

export default function MarcarPagadosModal({ isOpen, onClose, onConfirm, cantidadCreditos, totalMonto }) {
  const { user } = useAuth();
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmar = async () => {
    setIsSubmitting(true);
    try {
      // Enviar nombre del usuario si existe
      const ejecutadoPor = user?.nombre || "SISTEMA";
      await onConfirm(ejecutadoPor, observaciones.trim() || null);
      handleClose();
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setObservaciones("");
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="modal-header" style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e2753',
          borderRadius: '12px 12px 0 0'
        }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>Confirmar Pago de Créditos</h2>
          <button className="modal-close-btn" onClick={handleClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '2rem',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0
          }}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div className="confirmation-summary">
            <div className="summary-item">
              <span className="summary-label">Créditos seleccionados:</span>
              <span className="summary-value">{cantidadCreditos}</span>
            </div>
            <div className="summary-item total">
              <span className="summary-label">Total a registrar:</span>
              <span className="summary-value">
                ${totalMonto.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observaciones">
              Observaciones (opcional)
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Pagos confirmados presencialmente el día..."
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <small className="char-count">
              {observaciones.length}/500 caracteres
            </small>
          </div>

          <div className="info-box">
            <p>
              Esta acción cerrará los créditos seleccionados y creará un registro de entrega especial
              para trazabilidad.
            </p>
            <p>
              Los créditos pasarán a estado <strong>CERRADO</strong> y ya no aparecerán en la lista de pendientes.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          backgroundColor: '#f8f9fa'
        }}>
          <button 
            className="btn-secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '0.7rem 1.5rem',
              background: 'white',
              color: '#1e2753',
              border: '2px solid #1e2753',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            Cancelar
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirmar}
            disabled={isSubmitting}
            style={{
              padding: '0.7rem 1.5rem',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
