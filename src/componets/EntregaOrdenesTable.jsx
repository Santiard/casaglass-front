import { useMemo, useState } from "react";
import "../styles/Table.css";

// detalles: [{ id, numeroOrden, fechaOrden, clienteNombre, ventaCredito, montoOrden, observaciones }]
export default function EntregaOrdenesTable({ detalles = [] }) {
  const [query, setQuery] = useState("");

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", { year:"numeric", month:"2-digit", day:"2-digit" });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return detalles;
    return detalles.filter(d =>
      [
        d.numeroOrden,
        d.clienteNombre,
        d.observaciones,
        d.ventaCredito ? "credito" : "contado"
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [detalles, query]);

  return (
    <div className="table-container">
      <div className="toolbar">
        <strong>Órdenes incluidas</strong>
        <input
          className="clientes-input"
          style={{ marginLeft: "auto" }}
          type="text"
          placeholder="Buscar por cliente, # orden, observaciones…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-wrapper" style={{ maxHeight: 420, overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th># Orden</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Crédito</th>
              <th>Observaciones</th>
              <th style={{ textAlign:"right" }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="empty">Sin órdenes</td></tr>
            ) : rows.map((d) => (
              <tr key={d.id ?? d.numeroOrden}>
                <td>{d.numeroOrden ?? "-"}</td>
                <td>{fmtFecha(d.fechaOrden)}</td>
                <td>{d.clienteNombre ?? "-"}</td>
                <td>{d.ventaCredito ? "Sí" : "No"}</td>
                <td className="cut">{d.observaciones ?? "-"}</td>
                <td style={{ textAlign:"right" }}>{fmtCOP(d.montoOrden)}</td>
              </tr>
            ))}
          </tbody>
          {/* Totales al pie */}
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign:"right", fontWeight:600 }}>Total órdenes</td>
                <td style={{ textAlign:"right", fontWeight:700 }}>
                  {fmtCOP(rows.reduce((acc, r) => acc + Number(r.montoOrden || 0), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
