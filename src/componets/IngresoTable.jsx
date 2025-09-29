import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import editar from "../assets/editar.png";
import IngresoModal from "../modals/IngresoModal.jsx";
import { INGRESOS_MOCK } from "../mocks/mocks.js";

export default function IngresosTable({
  data = [],
  rowsPerPage = 10,
  onVerDetalles,    // (ingreso) => void
}) {
  const [ingresos, setIngresos] = useState(() => (Array.isArray(data) && data.length ? data : INGRESOS_MOCK));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState(null);

  useEffect(() => {
    if (Array.isArray(data) && data.length) setIngresos(data);
  }, [data]);

  const proveedores = useMemo(() => ([
    { id: "prov-1", nombre: "Proveedor A" },
    { id: "prov-2", nombre: "Proveedor B" },
  ]), []);

  const catalogoProductos = useMemo(() => ([
    { id: "p1", nombre: "Vidrio Templado 8mm", sku: "VID-8-001" },
    { id: "p2", nombre: "Marco Aluminio 2m",   sku: "MAR-2M-010" },
    { id: "p3", nombre: "Silicona Transparente", sku: "SIL-TR-111" },
  ]), []);

  const openNuevo = () => { setIngresoEditando(null); setIsModalOpen(true); };
  const openEditar = (ing) => { setIngresoEditando(ing); setIsModalOpen(true); };

  const handleGuardarIngreso = (payload, isEdit) => {
    setIngresos(prev => {
      if (isEdit) {
        return prev.map(it => (String(it.id) === String(payload.id) ? payload : it));
      }
      return [payload, ...prev];
    });
    setIsModalOpen(false);
    setIngresoEditando(null);
  };

  // Filtro y paginación (igual que antes, pero usando "ingresos")
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };
  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
      : n ?? "-";

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? ingresos.filter((ing) =>
          [
            ing.numeroFactura,
            ing.observaciones,
            ing.proveedor?.nombre,
            ing.procesado ? "procesado" : "pendiente",
            ...((ing.detalles ?? []).map(d => `${d.producto?.nombre ?? ""} ${d.producto?.sku ?? ""}`))
          ].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
        )
      : ingresos;

    const total = base.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = base.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage };
  }, [ingresos, query, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage } = filtrados;

  const verDetalles = (ing) => onVerDetalles?.(ing);

  return (
    <div className="table-container">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar por proveedor, factura, observaciones o producto..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ opacity: .7 }}>{total} registro(s)</span>
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage <= 1}>◀</button>
          <span>{curPage}/{maxPage}</span>
          <button className="btn" onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={curPage >= maxPage}>▶</button>
          <button className="btn" type="button" onClick={openNuevo}>+ Nuevo ingreso</button>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="table-wrapper">
        <table className="table ingresos-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>N° Factura</th>
              <th>Observaciones</th>
              <th>Productos</th>
              <th>Total costo</th>
              <th>Estado</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={9} className="empty">No hay ingresos registrados</td></tr>
            ) : pageData.map((ing) => {
              const dets = Array.isArray(ing.detalles) ? ing.detalles : [];
              return (
                <tr
                  key={ing.id ?? ing.numeroFactura}
                  onDoubleClick={() => verDetalles(ing)}
                  style={{ cursor:"pointer" }}
                >
                  <td>{fmtFecha(ing.fecha)}</td>
                  <td>{ing.proveedor?.nombre ?? "-"}</td>
                  <td>{ing.numeroFactura ?? "-"}</td>
                  <td className="cut">{ing.observaciones ?? "-"}</td>
                  <td><span className="badge">{dets.length}</span></td>
                  <td>{fmtCOP(Number(ing.totalCosto))}</td>
                  <td>
                    {ing.procesado
                      ? <span className="status ok">Procesado</span>
                      : <span className="status pending">Pendiente</span>}
                  </td>
                  <td>
                    <button className="btnLink" type="button" onClick={() => verDetalles(ing)}>
                      Ver detalles
                    </button>
                  </td>
                  <td className="clientes-actions">
                    <button className="btnEdit" onClick={() => openEditar(ing)} title="Editar">
                      <img src={editar} className="iconButton" alt="Editar" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar (se reutiliza) */}
      <IngresoModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setIngresoEditando(null); }}
        onSave={handleGuardarIngreso}
        proveedores={proveedores}
        catalogoProductos={catalogoProductos}
        ingresoInicial={ingresoEditando}
      />
    </div>
  );
}
