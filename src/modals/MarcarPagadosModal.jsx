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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Pago de Créditos</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
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
              ⚠️ Esta acción cerrará los créditos seleccionados y creará un registro de entrega especial
              para trazabilidad.
            </p>
            <p>
              Los créditos pasarán a estado <strong>CERRADO</strong> y ya no aparecerán en la lista de pendientes.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirmar}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
