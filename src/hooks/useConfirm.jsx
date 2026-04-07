import { useState, useCallback } from 'react';
import ConfirmModal from '../componets/ConfirmModal';

export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "Confirmar acción",
    message: "¿Estás seguro?",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    type: "warning",
    closeOnBackdrop: true,
    showCloseButton: false,
    closeValue: false,
    resolve: null,
  });

  const confirm = useCallback(({
    title = "Confirmar acción",
    message = "¿Estás seguro?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "warning",
    closeOnBackdrop = true,
    showCloseButton = false,
    closeValue = false,
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        closeOnBackdrop,
        showCloseButton,
        closeValue,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(confirmState.closeValue);
    }
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
      resolve: null,
    }));
  }, [confirmState.resolve, confirmState.closeValue]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
      resolve: null,
    }));
  }, [confirmState.resolve]);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
      resolve: null,
    }));
  }, [confirmState.resolve]);

  const ConfirmDialog = () => (
    <ConfirmModal
      isOpen={confirmState.isOpen}
      onClose={handleClose}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      type={confirmState.type}
      closeOnBackdrop={confirmState.closeOnBackdrop}
      showCloseButton={confirmState.showCloseButton}
    />
  );

  return { confirm, ConfirmDialog };
}

