import "../styles/ProveedorTable.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import ProveedorModal from "../modals/ProveedorModal.jsx";

export default function ProveedorTable({
  data = [],
  onEditar,
  onEliminar,
  onCrear,
  rowsPerPage: rowsPerPageProp = 10,
  loading = false
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageProp);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);

  const handleAgregar = () => { setItemEditando(null); setIsModalOpen(true); };
  const handleEditar = (row) => { setItemEditando(row); setIsModalOpen(true); };

  // 👉 ESTE ES EL QUE DEBE LLAMAR A onCrear / onEditar
  const handleSave = async (prov, isEdit) => {
    try {
      if (isEdit) await onEditar?.(prov, true);
      else if (onCrear) await onCrear(prov);
      else              await onEditar?.(prov, false);
      setIsModalOpen(false);
      setPage(1); // vuelve a la primera página para ver el nuevo
    } catch (e) {
      console.error("Error guardando proveedor", e);
      const msg = e?.response?.data?.message || "No se pudo guardar el proveedor.";
      alert(msg);
    }
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((r) =>
          [r.nombre, r.nit, r.ciudad, r.direccion, r.telefono]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q))
        )
      : data;

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);

    return { pageData, total, maxPage, curPage, start };
  }, [data, query, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;
  const goFirst = () => setPage(1);
  const goPrev  = () => setPage(p => Math.max(1, p - 1));
  const goNext  = () => setPage(p => Math.min(maxPage, p + 1));
  const goLast  = () => setPage(maxPage);

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPage, total);

  return (
    <div className="table-container prov">
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar proveedor"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />

        <div className="rows-per-page" style={{ marginLeft: "auto" }}>
          <span>Filas:</span>
          <select
            className="clientes-select"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <button onClick={handleAgregar} className="addButton" style={{ marginLeft: ".75rem" }}>
            <img src={add} className="iconButton" />
            Agregar Proveedor
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Teléfono</th>
              <th>Ciudad</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && <tr><td colSpan={6} className="empty">Cargando…</td></tr>}
            {!loading && pageData.length === 0 && <tr><td colSpan={6} className="empty">No hay registros</td></tr>}
            {!loading && pageData.map((row) => (
              <tr key={row.id ?? row.nit}>
                <td>{row.nombre ?? "-"}</td>
                <td>{row.nit ?? "-"}</td>
                <td>{row.telefono ?? "-"}</td>
                <td>{row.ciudad ?? "-"}</td>
                <td className="clientes-dir">{row.direccion ?? "-"}</td>
                <td className="clientes-actions">
                  <button className="btnEdit" onClick={() => handleEditar(row)} title="Editar">
                    <img src={editar} className="iconButton" />
                  </button>
                  <button className="btnDelete" onClick={() => onEliminar?.(row)} title="Eliminar">
                    <img src={eliminar} className="iconButton" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="pagination-bar">
        <div className="pagination-info">
          Mostrando {showingFrom}–{showingTo} de {total}
        </div>
        <div className="pagination-controls">
          <button className="pg-btn" onClick={goFirst} disabled={!canPrev}>«</button>
          <button className="pg-btn" onClick={goPrev}  disabled={!canPrev}>‹</button>
          {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
            const p = Math.max(1, Math.min(curPage - 2, maxPage - 4)) + i;
            return p <= maxPage ? (
              <button key={p} className={`pg-btn ${p === curPage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="pg-btn" onClick={goNext} disabled={!canNext}>›</button>
          <button className="pg-btn" onClick={goLast} disabled={!canNext}>»</button>
        </div>
      </div>

      <ProveedorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}                  // 👈 aquí va el save real
        proveedorAEditar={itemEditando}
      />
    </div>
  );
}
