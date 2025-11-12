import React, { useState } from "react";
import "../styles/CrudModal.css";
import { useToast } from "../context/ToastContext.jsx";

export default function CambiarPasswordTrabajadorModal({ isOpen, onClose, trabajador, onConfirm }) {
  const { showError } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setPassword(""); setConfirm(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 4) { showError("La contraseña debe tener al menos 4 caracteres"); return; }
    if (password !== confirm) { showError("Las contraseñas no coinciden"); return; }
    if (!trabajador?.id) { showError("Trabajador inválido"); return; }
    setLoading(true);
    try {
      await onConfirm?.(trabajador.id, password);
      reset();
      onClose?.();
    } catch (e) {
      console.error("Error cambiando contraseña", e);
      showError(e?.response?.data?.message || "No se pudo cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Cambiar contraseña</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Trabajador
            <input type="text" value={`${trabajador?.nombre || ''} (${trabajador?.username || ''})`} readOnly />
          </label>
          <label>
            Nueva contraseña
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={4} required />
          </label>
          <label>
            Confirmar contraseña
            <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} minLength={4} required />
          </label>
          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={()=>{ reset(); onClose?.(); }}>Cancelar</button>
            <button type="submit" className="btn-guardar" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}


