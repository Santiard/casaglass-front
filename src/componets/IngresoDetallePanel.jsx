import "../styles/Table.css";
import "../styles/IngresoDetallePanel.css";

export default function IngresoDetallePanel({ ingreso, onClose }){
  if (!ingreso) return null;

  const dets = Array.isArray(ingreso.detalles) ? ingreso.detalles : [];

  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
      : n ?? "-";

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit"
    });
  };

  return (
    <section className="ingreso-panel">
      <div className="ingreso-panel__head">
        <h4>Detalles del ingreso #{ingreso.id ?? "—"}</h4>
        <button className="btn" onClick={onClose}>Cerrar</button>
      </div>

      <div className="ingreso-panel__meta">
        <div><strong>Fecha:</strong> {fmtFecha(ingreso.fecha)}</div>
        <div><strong>Proveedor:</strong> {ingreso.proveedor?.nombre ?? "-"}</div>
        <div><strong>N° Factura:</strong> {ingreso.numeroFactura ?? "-"}</div>
        <div><strong>Estado:</strong> {ingreso.procesado ? "Procesado" : "Pendiente"}</div>
        <div className="span2"><strong>Observaciones:</strong> {ingreso.observaciones ?? "—"}</div>
      </div>

      <div className="table-wrapper">
        <table className="table subtable">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cantidad</th>
              <th>Costo unitario</th>
              <th>Total línea</th>
            </tr>
          </thead>
          <tbody>
            {dets.length === 0 ? (
              <tr><td colSpan={5} className="empty">Sin ítems</td></tr>
            ) : dets.map((d) => (
              <tr key={d.id ?? `${d.producto?.id}-${d.producto?.sku}`}>
                <td>{d.producto?.nombre ?? "-"}</td>
                <td>{d.producto?.sku ?? "-"}</td>
                <td>{d.cantidad ?? "-"}</td>
                <td>{fmtCOP(Number(d.costoUnitario))}</td>
                <td>{fmtCOP(Number(d.totalLinea))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ingreso-panel__foot">
        <div><strong>Total ingreso:</strong> {fmtCOP(Number(ingreso.totalCosto))}</div>
      </div>
    </section>
  );
}
