import "../styles/Table.css";
import "../styles/IngresoNuevoModal.css";

export default function EntregaDetalleModal({ entrega, isOpen, onClose }) {
  if (!isOpen || !entrega) return null;

  const dets = Array.isArray(entrega.detalles) ? entrega.detalles : [];
  const gastos = Array.isArray(entrega.gastos) ? entrega.gastos : [];

  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const esperado = Number(entrega.montoEsperado ?? 0);
  const totalGastos = Number(entrega.montoGastos ?? 0);
  const montoEntregado = Number(entrega.montoEntregado ?? 0);
  // Monto Neto Esperado = Monto Esperado - Monto Gastos
  const montoNetoEsperado = esperado - totalGastos;
  // Diferencia = Monto Neto Esperado - Monto Entregado
  const dif = entrega.estado === "ENTREGADA" ? montoNetoEsperado - montoEntregado : (entrega.diferencia ?? 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2>Detalles de Entrega #{entrega.id ?? "—"}</h2>

        {/* Información general */}
        <div className="modal-alerts" style={{ marginBottom: "20px" }}>
          <div className="alert info">
            <strong>Fecha:</strong> {fmtFecha(entrega.fechaEntrega)}
          </div>
          <div className="alert info">
            <strong>Sede:</strong> {entrega.sede?.nombre ?? "-"}
          </div>
          <div className="alert info">
            <strong>Empleado:</strong> {entrega.empleado?.nombre ?? "-"}
          </div>
          <div className={`alert ${entrega.estado === "ENTREGADA" ? "success" : entrega.estado === "PENDIENTE" ? "warning" : "error"}`}>
            <strong>Estado:</strong> {entrega.estado}
          </div>
          {entrega.observaciones && (
            <div className="alert info" style={{ gridColumn: "1 / -1" }}>
              <strong>Observaciones:</strong> {entrega.observaciones}
            </div>
          )}
        </div>

        {/* Tabla de órdenes */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ marginBottom: "10px" }}>Órdenes</h3>
          <div className="table-wrapper">
            <table className="table">
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
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "10px" }}>Gastos</h3>
            <div className="table-wrapper">
              <table className="table">
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

        {/* Resumen financiero */}
        <div className="modal-alerts" style={{ marginTop: "20px" }}>
          <div className="alert info">
            <strong>Monto Esperado (Órdenes):</strong> {fmtCOP(esperado)}
          </div>
          <div className="alert info">
            <strong>Total Gastos:</strong> {fmtCOP(totalGastos)}
          </div>
          <div className="alert info">
            <strong>Monto Neto Esperado:</strong> {fmtCOP(montoNetoEsperado)}
          </div>
          <div className="alert info">
            <strong>Monto Entregado:</strong> {fmtCOP(montoEntregado)}
          </div>
          <div className={`alert ${dif === 0 ? 'success' : dif > 0 ? 'warning' : 'error'}`}>
            <strong>Diferencia:</strong> {fmtCOP(dif)}
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

