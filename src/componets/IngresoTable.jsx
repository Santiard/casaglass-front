// src/componets/IngresoTable.jsx
import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import editar from "../assets/editar.png";
import IngresoModal from "../modals/IngresoModal.jsx";

export default function IngresosTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  proveedores = [],          // [{id, nombre}]
  catalogoProductos = [],    // [{id, nombre, codigo}]
  onVerDetalles,             // (ingreso) => void
  onCrear,                   // (payload) => Promise<void>
  onActualizar,              // (id, payload) => Promise<void>
  onEliminar,                // (id) => Promise<void>
}) {
  const [ingresos, setIngresos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { setIngresos(Array.isArray(data) ? data : []); }, [data]);

  const openNuevo = () => { setIngresoEditando(null); setIsModalOpen(true); };
  const openEditar = (ing) => {
    if (ing.procesado) {
      alert("Este ingreso ya fue procesado y no se puede editar.");
      return;
    }
    setIngresoEditando(ing);
    setIsModalOpen(true);
  };

  const handleGuardarIngreso = async (payload, isEdit) => {
    try {
      if (isEdit) await onActualizar?.(ingresoEditando.id, payload);
      else        await onCrear?.(payload); // el back lo procesará automáticamente
      setIsModalOpen(false);
      setIngresoEditando(null);
      setPage(1);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data || "No se pudo guardar el ingreso.");
    }
  };

  const eliminar = async (ing) => {
    if (ing.procesado) {
      alert("No se puede eliminar un ingreso ya procesado.");
      return;
    }
    if (!confirm("¿Eliminar este ingreso?")) return;
    await onEliminar?.(ing.id);
  };

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

  const [rowsPerPageState, setRpp] = useState(rowsPerPage);
  useEffect(() => setRpp(rowsPerPage), [rowsPerPage]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? ingresos.filter((ing) =>
          [
            ing.numeroFactura,
            ing.observaciones,
            ing.proveedor?.nombre,
            ing.procesado ? "procesado" : "pendiente",
            ...((ing.detalles ?? []).map(d => `${d.producto?.nombre ?? ""} ${d.producto?.codigo ?? ""}`))
          ].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
        )
      : ingresos;

    const total = base.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageState));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageState;
    const pageData = base.slice(start, start + rowsPerPageState);
    return { pageData, total, maxPage, curPage };
  }, [ingresos, query, page, rowsPerPageState]);

  const { pageData, total, maxPage, curPage } = filtrados;

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

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
          <span style={{ opacity: .7 }}>{total} registro(s)</span>
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage <= 1}>◀</button>
          <span>{curPage}/{maxPage}</span>
          <button className="btn" onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={curPage >= maxPage}>▶</button>
          <button className="btn" type="button" onClick={openNuevo}>+ Nuevo ingreso</button>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="table-wrapper ingresos-scroll">
        <table className="table ingresos-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>N° Factura</th>
              <th>Observaciones</th>
              <th>Ítems</th>
              <th>Total costo</th>
              <th>Estado</th>
              <th>Detalle</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && <tr><td colSpan={9} className="empty">Cargando…</td></tr>}
            {!loading && pageData.length === 0 && <tr><td colSpan={9} className="empty">No hay ingresos registrados</td></tr>}

            {!loading && pageData.map((ing) => {
              const dets = Array.isArray(ing.detalles) ? ing.detalles : [];
              const disabled = !!ing.procesado;

              return (
                <tr key={ing.id} onDoubleClick={() => onVerDetalles?.(ing)} style={{ cursor:"pointer" }}>
                  <td>{fmtFecha(ing.fecha)}</td>
                  <td>{ing.proveedor?.nombre ?? "-"}</td>
                  <td>{ing.numeroFactura ?? "-"}</td>
                  <td className="cut">{ing.observaciones ?? "-"}</td>
                  <td><span className="badge">{dets.length}</span></td>
                  <td>{fmtCOP(Number(ing.totalCosto))}</td>
                  <td>{ing.procesado ? <span className="status ok">Procesado</span> : <span className="status pending">Pendiente</span>}</td>
                  <td>
                    <button className="btnLink" type="button" onClick={() => onVerDetalles?.(ing)}>
                      Ver detalles
                    </button>
                  </td>
                  <td className="clientes-actions" style={{ gap: ".25rem" }}>
                    {/* SIN procesar/reprocesar */}
                    <button
                      className="btnEdit"
                      onClick={() => openEditar(ing)}
                      title={disabled ? "Ingreso procesado: no editable" : "Editar"}
                      disabled={disabled}
                    >
                      <img src={editar} className="iconButton" alt="Editar" />
                    </button>
                    <button
                      className="btn"
                      onClick={() => eliminar(ing)}
                      disabled={disabled}
                      title={disabled ? "Ingreso procesado: no eliminable" : "Eliminar"}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar */}
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
