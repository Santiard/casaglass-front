import { createContext, useContext, useState } from "react";
import Toast from "../componets/Toast";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ isVisible: false, message: "", type: "info" });

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ isVisible: true, message, type, duration });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const showSuccess = (message, duration) => showToast(message, "success", duration);
  const showError = (message, duration) => showToast(message, "error", duration);
  const showWarning = (message, duration) => showToast(message, "warning", duration);
  const showInfo = (message, duration) => showToast(message, "info", duration);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={toast.duration}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

