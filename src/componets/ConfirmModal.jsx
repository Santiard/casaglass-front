import React from 'react';
import '../styles/ConfirmModal.css';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning", // "warning", "danger", "info"
  showIcon = true
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay confirm-modal-overlay" onClick={handleCancel}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
        {showIcon && (
          <div className={`confirm-modal-icon confirm-modal-icon-${type}`}>
            {type === "danger" && "⚠️"}
            {type === "warning" && "⚠️"}
            {type === "info" && "ℹ️"}
          </div>
        )}
        <h2 className="confirm-modal-title">{title}</h2>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-buttons">
          <button
            className="confirm-modal-btn confirm-modal-btn-cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-${type}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

