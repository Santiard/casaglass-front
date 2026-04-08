// File: src/componets/EntregaDetallePanel.jsx
import "../styles/Table.css";
import "../styles/IngresoDetallePanel.css";

export default function EntregaDetallePanel({ entrega, onClose }){
  if (!entrega) return null;

  const dets = Array.isArray(entrega.detalles) ? entrega.detalles : [];
  // gastos eliminado - ya no se usan gastos en entregas

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
    <section className="ingreso-panel">
      <div className="ingreso-panel__head">
        <h4>Entrega #{entrega.id ?? "—"}</h4>
        <button className="btn" onClick={onClose}>Cerrar</button>
      </div>

      <div className="ingreso-panel__meta">
        <div><strong>Fecha:</strong> {fmtFecha(entrega.fechaEntrega)}</div>
        <div><strong>Sede:</strong> {entrega.sede?.nombre ?? "-"}</div>
        <div><strong>Empleado:</strong> {entrega.empleado?.nombre ?? "-"}</div>
        <div><strong>Estado:</strong> {entrega.estado}</div>
      </div>

      <div className="ingreso-panel__content">
        <h4>Órdenes</h4>
        <div className="table-wrapper">
          <table className="table subtable">
            <thead>
              <tr>
                <th># Orden</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {dets.length === 0 ? (
                <tr><td colSpan={3} className="empty">Sin órdenes</td></tr>
              ) : dets.map((d) => (
                <tr key={d.id}>
                  <td>{d.numeroOrden}</td>
                  <td>{new Date(d.fechaOrden).toLocaleDateString("es-CO")}</td>
                  <td>{fmtCOP(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sección de gastos eliminada - ya no se usan gastos en entregas */}
      </div>

      <div className="ingreso-panel__foot" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:"0.5rem" }}>
        <div><strong>Monto Total:</strong> {fmtCOP(monto)}</div>
        <div><strong>Efectivo:</strong> {fmtCOP(montoEfectivo)}</div>
        <div><strong>Transferencia:</strong> {fmtCOP(montoTransferencia)}</div>
        <div><strong>Cheque:</strong> {fmtCOP(montoCheque)}</div>
        <div><strong>Depósito:</strong> {fmtCOP(montoDeposito)}</div>
        {sumaDesglose !== monto && (
          <div style={{ gridColumn: "1 / -1", color: "red", fontWeight: "bold" }}>
            Advertencia: La suma del desglose (${sumaDesglose.toLocaleString()}) no coincide con el monto total (${monto.toLocaleString()})
          </div>
        )}
      </div>

      {/* Resumen del mes */}
      {entrega.resumenMes && (
        <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #ddd", fontSize: "0.95rem" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#1e2753" }}>
            RESUMEN DEL MES {entrega.resumenMes.mesNombre || entrega.resumenMes.mes || ""}
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
            <div style={{ background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "10px" }}>
              <div style={{ fontWeight: "700", color: "#1e2753", marginBottom: "4px" }}>TOTAL DE DINERO ENTREGADO</div>
              <div style={{ fontSize: "1rem", fontWeight: "700" }}>{fmtCOP(entrega.resumenMes.totalDineroEntregado ?? 0)}</div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Esta entrega</div>
            </div>
            <div style={{ background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "10px" }}>
              <div style={{ fontWeight: "700", color: "#1e2753", marginBottom: "4px" }}>TOTAL DEL MES</div>
              <div style={{ fontSize: "1rem", fontWeight: "700" }}>{fmtCOP(entrega.resumenMes.totalDelMes ?? 0)}</div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Entregas de dinero de la sede en el mes</div>
            </div>
            <div style={{ background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "10px" }}>
              <div style={{ fontWeight: "700", color: "#1e2753", marginBottom: "4px" }}>TOTAL DEUDAS MENSUALES</div>
              <div style={{ fontSize: "1rem", fontWeight: "700" }}>{fmtCOP(entrega.resumenMes.totalDeudasMensuales ?? 0)}</div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>Saldos pendientes (creditos abiertos) de la sede en el mes</div>
            </div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "#666" }}>
            {entrega.resumenMes.sede && <div>Sede: {entrega.resumenMes.sede}</div>}
            {entrega.resumenMes.trabajador && <div>Trabajador: {entrega.resumenMes.trabajador}</div>}
          </div>
        </div>
      )}
    </section>