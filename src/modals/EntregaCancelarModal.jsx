// File: src/modals/EntregaCancelarModal.jsx
import "../styles/IngresoNuevoModal.css";
import { useEffect, useState } from "react";

export default function EntregaCancelarModal({ isOpen, onClose, entrega, onCancel }){
  const [motivo, setMotivo] = useState("");
  useEffect(() => { setMotivo(entrega?.observaciones ?? ""); }, [isOpen, entrega]);
  if (!isOpen || !entrega) return null;

  const submit = () => onCancel?.({ id: entrega.id, motivo: motivo?.trim() });

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Cancelar entrega</h2>
        <div className="modal-alerts">
          <div className="alert warning">Esta acción marcará la entrega como RECHAZADA y liberará los gastos asociados.</div>
        </div>
        <div className="form">
          <label>
            Motivo
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Escribe el motivo de cancelación" />
          </label>
        </div>
        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">Cerrar</button>
          <button className="btn-guardar" onClick={submit} type="button">Cancelar entrega</button>
        </div>
      </div>
    </div>
  );
}