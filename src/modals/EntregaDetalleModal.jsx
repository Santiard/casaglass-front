import "../styles/EntregaDetalleModal.css";

export default function EntregaDetalleModal({ entrega, isOpen, onClose }) {
  if (!isOpen || !entrega) return null;

  const dets = Array.isArray(entrega.detalles) ? entrega.detalles : [];
  const gastos = Array.isArray(entrega.gastos) ? entrega.gastos : [];

  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  // Usar monto (único campo de monto según el modelo simplificado)
  const monto = Number(entrega.monto ?? 0);
  const montoEfectivo = Number(entrega.montoEfectivo ?? 0);
  const montoTransferencia = Number(entrega.montoTransferencia ?? 0);
  const montoCheque = Number(entrega.montoCheque ?? 0);
  const montoDeposito = Number(entrega.montoDeposito ?? 0);
  
  // Calcular suma del desglose para validación
  const sumaDesglose = montoEfectivo + montoTransferencia + montoCheque + montoDeposito;

  return (
    <div className="entrega-detalle-modal-overlay" onClick={onClose}>
      <div className="entrega-detalle-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2>Detalles de Entrega #{entrega.id ?? "—"}</h2>

        {/* Información general compacta */}
        <div className="entrega-detalle-info-header">
          <div className="entrega-detalle-info-item">
            <label>Fecha</label>
            <span>{fmtFecha(entrega.fechaEntrega)}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Sede</label>
            <span>{entrega.sede?.nombre ?? "-"}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Empleado</label>
            <span>{entrega.empleado?.nombre ?? "-"}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Estado</label>
            <span className={`estado-badge ${entrega.estado?.toLowerCase()}`}>
              {entrega.estado}
            </span>
          </div>
        </div>

        {/* Tabla de órdenes */}
        <div className="entrega-detalle-section">
          <h3>Órdenes</h3>
          <div className="entrega-detalle-table-wrapper">
            <table className="entrega-detalle-table">
              <thead>
                <tr>
                  <th># Orden</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Valor Entregado</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {dets.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Sin órdenes</td></tr>
                ) : dets.map((d) => {
                  // Calcular valor entregado según tipo de venta
                  let valorEntregado = 0;
                  if (!d.ventaCredito) {
                    valorEntregado = Number(d.montoOrden) || 0;
                  } else {
                    valorEntregado = Number(d.abonosDelPeriodo) || 0;
                  }
                  
                  // Calcular saldo
                  const saldo = d.ventaCredito 
                    ? Math.max(0, (Number(d.montoOrden) || 0) - valorEntregado)
                    : 0;

                  return (
                    <tr key={d.id}>
                      <td>{d.numeroOrden}</td>
                      <td>{d.clienteNombre || "-"}</td>
                      <td>{new Date(d.fechaOrden).toLocaleDateString("es-CO")}</td>
                      <td>{fmtCOP(d.montoOrden)}</td>
                      <td>{fmtCOP(valorEntregado)}</td>
                      <td>{fmtCOP(saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de gastos */}
        {gastos.length > 0 && (
          <div className="entrega-detalle-section">
            <h3>Gastos</h3>
            <div className="entrega-detalle-table-wrapper">
              <table className="entrega-detalle-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Empleado</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id}>
                      <td>#{g.id}</td>
                      <td>{fmtFecha(g.fechaGasto)}</td>
                      <td>{g.concepto || g.descripcion || "-"}</td>
                      <td>{g.tipo || "OPERATIVO"}</td>
                      <td>{fmtCOP(g.monto)}</td>
                      <td>{g.empleadoNombre || g.empleado?.nombre || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumen financiero compacto */}
        <div className="entrega-detalle-resumen">
          <div className="entrega-detalle-resumen-item">
            <label>Efectivo</label>
            <span>{fmtCOP(montoEfectivo)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Transferencia</label>
            <span>{fmtCOP(montoTransferencia)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Cheque</label>
            <span>{fmtCOP(montoCheque)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Depósito</label>
            <span>{fmtCOP(montoDeposito)}</span>
          </div>
          <div className="entrega-detalle-resumen-item monto-total">
            <label>Monto Total</label>
            <span>{fmtCOP(monto)}</span>
          </div>
          {sumaDesglose !== monto && (
            <div className="entrega-detalle-warning">
              ⚠️ Advertencia: La suma del desglose (${sumaDesglose.toLocaleString()}) no coincide con el monto total (${monto.toLocaleString()})
            </div>
          )}
        </div>

        <div className="entrega-detalle-modal-buttons">
          <button className="btn-cerrar" onClick={onClose} type="button">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

