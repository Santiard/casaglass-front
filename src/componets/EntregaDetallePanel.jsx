// File: src/componets/EntregaDetallePanel.jsx
import "../styles/Table.css";
import "../styles/IngresoDetallePanel.css";

export default function EntregaDetallePanel({ entrega, onClose }){
  if (!entrega) return null;

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
        <div className="span2"><strong>Observaciones:</strong> {entrega.observaciones ?? "—"}</div>
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
                  <td>{fmtCOP(d.montoOrden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4>Gastos</h4>
        <div className="table-wrapper">
          <table className="table subtable">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr><td colSpan={2} className="empty">Sin gastos</td></tr>
              ) : gastos.map((g) => (
                <tr key={g.id}>
                  <td>{g.descripcion}</td>
                  <td>{fmtCOP(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ingreso-panel__foot" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:"0.5rem" }}>
        <div><strong>Monto Esperado (Órdenes):</strong> {fmtCOP(esperado)}</div>
        <div><strong>Gastos:</strong> {fmtCOP(totalGastos)}</div>
        <div><strong>Monto Neto Esperado:</strong> {fmtCOP(montoNetoEsperado)}</div>
        <div><strong>Monto Entregado:</strong> {fmtCOP(montoEntregado)}</div>
        <div><strong>Diferencia:</strong> {fmtCOP(dif)}</div>
      </div>
    </section>
  );
}