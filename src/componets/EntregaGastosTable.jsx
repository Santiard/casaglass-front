import { useMemo, useState } from "react";
import "../styles/Table.css";

// gastos: [{ id, fecha, concepto, monto, observaciones }]
// Si tu backend expone otro shape, mapea antes de pasarlo.
export default function EntregaGastosTable({ gastos = [] }) {
  const [query, setQuery] = useState("");

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", { year:"numeric", month:"2-digit", day:"2-digit" });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gastos;
    return gastos.filter(g =>
      [g.concepto, g.observaciones].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
    );
  }, [gastos, query]);

  return (
    <div className="table-container">
      <div className="toolbar">
        <strong>Gastos operativos</strong>
        <input
          className="clientes-input"
          style={{ marginLeft:"auto" }}
          type="text"
          placeholder="Buscar por concepto u observación…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-wrapper" style={{ maxHeight: 420, overflow:"auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Observaciones</th>
              <th style={{ textAlign:"right" }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="empty">Sin gastos</td></tr>
            ) : rows.map((g, idx) => (
              <tr key={g.id ?? idx}>
                <td>{fmtFecha(g.fecha)}</td>
                <td>{g.concepto ?? "-"}</td>
                <td className="cut">{g.observaciones ?? "-"}</td>
                <td style={{ textAlign:"right" }}>{fmtCOP(g.monto)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign:"right", fontWeight:600 }}>Total gastos</td>
                <td style={{ textAlign:"right", fontWeight:700 }}>
                  {fmtCOP(rows.reduce((acc, r) => acc + Number(r.monto || 0), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
