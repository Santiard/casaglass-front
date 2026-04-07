import React from 'react';
import '../styles/ConfirmModal.css';

export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning", // "warning", "danger", "info"
  showIcon = true,
  closeOnBackdrop = true,
  showCloseButton = false
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onClose?.();
  };

  const handleOverlayClick = () => {
    if (!closeOnBackdrop) return;
    onClose?.();
  };

  return (
    <div className="modal-overlay confirm-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
        {showCloseButton && (
          <button
            type="button"
            className="confirm-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        )}
        {showIcon && (
          <div className={`confirm-modal-icon confirm-modal-icon-${type}`}>
            {type === "danger" && ""}
            {type === "warning" && ""}
            {type === "info" && ""}
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

