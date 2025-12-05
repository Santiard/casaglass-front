// File: src/modals/EntregaConfirmarModal.jsx
import { useEffect } from "react";
import "../styles/IngresoNuevoModal.css";

export default function EntregaConfirmarModal({ isOpen, onClose, entrega, onConfirm }){
  useEffect(() => {
    // Reset cuando se abre/cierra el modal
  }, [isOpen, entrega]);

  if (!isOpen || !entrega) return null;
  
  // Usar monto (único campo de monto según el modelo simplificado)
  const monto = Number(entrega.monto ?? 0);
  const montoEfectivo = Number(entrega.montoEfectivo ?? 0);
  const montoTransferencia = Number(entrega.montoTransferencia ?? 0);
  const montoCheque = Number(entrega.montoCheque ?? 0);
  const montoDeposito = Number(entrega.montoDeposito ?? 0);
  const sumaDesglose = montoEfectivo + montoTransferencia + montoCheque + montoDeposito;
  
  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  const submit = () => {
    // Solo confirmar la entrega, sin montoEntregado ni observaciones
    onConfirm?.({ id: entrega.id });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Confirmar entrega</h2>
        <div className="modal-alerts">
          <div className="alert info"><strong>Monto Total:</strong> {fmtCOP(monto)}</div>
          <div className="alert info"><strong>Efectivo:</strong> {fmtCOP(montoEfectivo)}</div>
          <div className="alert info"><strong>Transferencia:</strong> {fmtCOP(montoTransferencia)}</div>
          <div className="alert info"><strong>Cheque:</strong> {fmtCOP(montoCheque)}</div>
          <div className="alert info"><strong>Depósito:</strong> {fmtCOP(montoDeposito)}</div>
          {sumaDesglose !== monto && (
            <div className="alert error">
              Advertencia: La suma del desglose (${sumaDesglose.toLocaleString()}) no coincide con el monto total (${monto.toLocaleString()})
            </div>
          )}
        </div>

        <div className="form grid-2">
          <label className="full" style={{ gridColumn: "1 / -1" }}>
            ¿Está seguro de que desea confirmar esta entrega? El estado cambiará a "ENTREGADA".
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