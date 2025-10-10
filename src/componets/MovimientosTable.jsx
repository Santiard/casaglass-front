// src/componets/MovimientosTable.jsx
import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import MovimientoModal from "../modals/MovimientoModal.jsx";
import { toLocalDateStringOnly } from "../services/TrasladosService.js";

export default function MovimientosTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  sedes = [],
  catalogoProductos = [],
  onCrear,
  onActualizar,
  onEliminar,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState(null);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const fmtFecha = (iso) =>
    iso
      ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const diaDeSemana = (iso) =>
    iso
      ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
          weekday: "long",
        })
      : "-";

  const handleSaveMovimiento = async (form, isEdit) => {
    try {
      if (isEdit) {
        await onActualizar?.(movimientoEditando.id, {
          fecha: toLocalDateStringOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        });
      } else {
        await onCrear?.(form);
      }
      setIsModalOpen(false);
      setMovimientoEditando(null);
    } catch (e) {
      console.error(e);
    }
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((m) =>
          [
            m.sedeOrigen?.nombre,
            m.sedeDestino?.nombre,
            m.fecha,
            ...(Array.isArray(m.detalles)
              ? m.detalles.map(
                  (d) => `${d.producto?.nombre ?? ""} ${d.producto?.codigo ?? ""}`
                )
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
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar traslado..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>{total} registro(s)</span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={curPage <= 1}
          >
            ◀
          </button>
          <span>
            {curPage}/{maxPage}
          </span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={curPage >= maxPage}
          >
            ▶
          </button>

          <button
            onClick={() => {
              setMovimientoEditando(null);
              setIsModalOpen(true);
            }}
            className="addButton"
          >
            <img src={add} className="iconButton" alt="Agregar" />
            Nuevo traslado
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Sede origen</th>
              <th>Sede destino</th>
              <th>Fecha</th>
              <th>Día</th>
              <th>Ítems</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="empty">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading &&
              pageData.map((mov) => {
                const id = mov.id;
                const detalles = mov.detalles ?? [];
                return (
                  <Fragment key={id}>
                    <tr>
                      <td>{mov.sedeOrigen?.nombre ?? "-"}</td>
                      <td>{mov.sedeDestino?.nombre ?? "-"}</td>
                      <td>{fmtFecha(mov.fecha)}</td>
                      <td>{diaDeSemana(mov.fecha)}</td>
                      <td>
                        <span className="badge">{detalles.length}</span>
                      </td>
                      <td>
                        <button
                          className="btnEdit"
                          onClick={() => {
                            setMovimientoEditando(mov);
                            setIsModalOpen(true);
                          }}
                        >
                          <img src={editar} className="iconButton" alt="Editar" />
                        </button>
                        <button
                          className="btn"
                          onClick={() => onEliminar?.(mov.id)}
                        >
                          Eliminar
                        </button>
                        <button
                          className="btnLink"
                          onClick={() => toggleExpand(id)}
                        >
                          {expanded[id] ? "Ocultar" : "Ver"}
                        </button>
                      </td>
                    </tr>

                    {expanded[id] && (
                      <tr>
                        <td colSpan={6}>
                          {detalles.length === 0 ? (
                            <div className="empty-sub">Sin productos.</div>
                          ) : (
                            <ul>
                              {detalles.map((d, i) => (
                                <li key={i}>
                                  {d.producto?.nombre} — {d.cantidad}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <MovimientoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMovimientoEditando(null);
        }}
        onSave={handleSaveMovimiento}
        movimiento={movimientoEditando}
        sedes={sedes}
        catalogoProductos={catalogoProductos}
      />
    </div>
  );
}
