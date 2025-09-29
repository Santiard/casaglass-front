import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import MovimientoModal from "../modals/MovimientoModal.jsx";

export default function MovimientosTable({
  data = [],
  rowsPerPage = 10,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState(null);

  // Demo: reemplaza por tus datos reales
  const sedes = useMemo(() => ["Bogotá", "Medellín", "Cali"], []);
  const inventarioPorSede = useMemo(() => ({
    "Bogotá": [
      { id: "p1", nombre: "Vidrio 8mm", sku: "VID-8-001", stock: 12 },
      { id: "p2", nombre: "Marco 2m", sku: "MAR-2M-010", stock: 5 },
    ],
    "Medellín": [
      { id: "p3", nombre: "Silicona", sku: "SIL-TR-111", stock: 8 },
    ],
    "Cali": []
  }), []);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const diaDeSemana = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("es-CO", { weekday: "long" });
  };

  const handleSaveMovimiento = (movimiento, isEdit) => {
    // aquí harías POST/PUT al backend
    console.log(isEdit ? "Editar movimiento" : "Crear movimiento", movimiento);
    setIsModalOpen(false);
    setMovimientoEditando(null);
  };

  // Crear
  const handleAgregar = () => {
    setMovimientoEditando(null); // modal sabrá que es "crear"
    setIsModalOpen(true);
  };

  // Editar
  const handleEditar = (movimiento) => {
    setMovimientoEditando(movimiento);
    setIsModalOpen(true);
  };

  // Filtro + paginación
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((m) =>
          [
            m.sedePartida,
            m.sedeLlegada,
            m.fecha,
            m.trabajadorConfirma,
            m.confirmado ? "confirmado" : "pendiente",
            ...(Array.isArray(m.productos)
              ? m.productos.map((p) => `${p.nombre ?? ""} ${p.sku ?? ""}`)
              : []),
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : data;

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);

    return { pageData, total, maxPage, curPage };
  }, [data, query, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage } = filtrados;

  return (
    <div className="table-container">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar por sedes, fecha, productos, trabajador..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: .7 }}>{total} registro(s)</span>
          <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curPage <= 1}>◀</button>
          <span>{curPage}/{maxPage}</span>
          <button className="btn" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={curPage >= maxPage}>▶</button>
          <button onClick={handleAgregar} className="addButton" type="button">
            <img src={add} className="iconButton" alt="Agregar" />
            Agregar Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Sede partida</th>
              <th>Sede llegada</th>
              <th>Fecha</th>
              <th>Día</th>
              <th>Productos</th>
              <th>Confirmado</th>
              <th>Confirmado por</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">No hay registros</td>
              </tr>
            ) : (
              pageData.map((mov) => {
                const id = mov.id ?? `${mov.sedePartida}-${mov.sedeLlegada}-${mov.fecha}`;
                const productos = Array.isArray(mov.productos) ? mov.productos : [];
                return (
                  <Fragment key={id}>
                    <tr>
                      <td>{mov.sedePartida ?? "-"}</td>
                      <td>{mov.sedeLlegada ?? "-"}</td>
                      <td>{fmtFecha(mov.fecha)}</td>
                      <td className="capitalize">{diaDeSemana(mov.fecha)}</td>

                      <td>
                        <div className="productos-cell">
                          <span className="badge">{productos.length}</span>
                        </div>
                      </td>

                      <td>
                        {mov.confirmado
                          ? <span className="status ok">Confirmado</span>
                          : <span className="status pending">Pendiente</span>}
                      </td>

                      <td>{mov.trabajadorConfirma ?? "-"}</td>

                      <td className="clientes-actions">
                        <button
                          className="btnEdit"
                          onClick={() => handleEditar(mov)}
                          title="Editar"
                          type="button"
                        >
                          <img src={editar} className="iconButton" alt="Editar" />
                        </button>
                        <button
                          className="btnLink"
                          onClick={() => toggleExpand(id)}
                          type="button"
                        >
                          {expanded[id] ? "Ocultar" : "Ver detalles"}
                        </button>
                      </td>
                    </tr>

                    {/* fila expandida con productos */}
                    {expanded[id] && (
                      <tr className="subrow">
                        <td colSpan={8}>
                          {productos.length === 0 ? (
                            <div className="empty-sub">
                              Este movimiento no tiene productos asociados.
                            </div>
                          ) : (
                            <div className="productos-grid">
                              {productos.map((p, idx) => (
                                <div key={p.id ?? `${id}-${idx}`} className="chip">
                                  <div className="chip-title">{p.nombre ?? "-"}</div>
                                  <div className="chip-meta">
                                    {p.sku ? <span>SKU: {p.sku}</span> : null}
                                    {p.cantidad != null ? <span> · Cant: {p.cantidad}</span> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <MovimientoModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setMovimientoEditando(null); }}
        onSave={handleSaveMovimiento}
        movimiento={movimientoEditando}         // null => crear, objeto => editar
        sedes={sedes}
        inventarioPorSede={inventarioPorSede}
      />
    </div>
  );
}
