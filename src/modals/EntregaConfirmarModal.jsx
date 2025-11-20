// File: src/modals/EntregaConfirmarModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/IngresoNuevoModal.css";

export default function EntregaConfirmarModal({ isOpen, onClose, entrega, onConfirm }){
  const [montoEntregado, setMontoEntregado] = useState(0);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (entrega) {
      setMontoEntregado(Number(entrega.montoEntregado ?? 0));
      setObs(entrega.observaciones ?? "");
    } else {
      setMontoEntregado(0);
      setObs("");
    }
  }, [isOpen, entrega]);

  if (!isOpen || !entrega) return null;
  const esperado = Number(entrega.montoEsperado ?? 0);
  const gastos = Number(entrega.montoGastos ?? 0);
  // Monto Neto Esperado = Monto Esperado - Monto Gastos
  const montoNetoEsperado = useMemo(() => esperado - gastos, [esperado, gastos]);
  // Diferencia = Monto Neto Esperado - Monto Entregado
  const diferencia = useMemo(() => montoNetoEsperado - Number(montoEntregado ?? 0), [montoNetoEsperado, montoEntregado]);
  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  const submit = () => {
    onConfirm?.({ id: entrega.id, montoEntregado: Number(montoEntregado), observaciones: obs?.trim() });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Confirmar entrega</h2>
        <div className="modal-alerts">
          <div className="alert info"><strong>Monto Esperado (Órdenes):</strong> {fmtCOP(esperado)}</div>
          <div className="alert info"><strong>Gastos:</strong> {fmtCOP(gastos)}</div>
          <div className="alert info"><strong>Monto Neto Esperado:</strong> {fmtCOP(montoNetoEsperado)}</div>
          <div className="alert info"><strong>Monto Entregado:</strong> {fmtCOP(montoEntregado)}</div>
          <div className={`alert ${diferencia === 0 ? 'success' : 'warning'}`}><strong>Diferencia:</strong> {fmtCOP(diferencia)}</div>
        </div>

        <div className="form grid-2">
          <label className="full">
            Monto entregado
            <input type="number" min={0} step="0.01" value={montoEntregado} onChange={(e) => setMontoEntregado(e.target.value)} />
          </label>
          <label className="full">
            Observaciones
            <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">Cerrar</button>
          <button className="btn-guardar" onClick={submit} type="button">Confirmar</button>
        </div>
      </div>
    </div>
  );
}