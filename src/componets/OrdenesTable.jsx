// src/components/OrdenesTable.jsx
import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import add from "../assets/add.png";
import editar from "../assets/editar.png";
import eliminar from "../assets/eliminar.png";
import OrdenModal from "../modals/OrdenModal.jsx";

export default function OrdenesTable({
  data = [],
  onEditar,
  onEliminar,
  onCrear,
  rowsPerPage = 10,
  loading = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState(null);

  const toggleExpand = (ordenId) => {
    setExpanded((prev) => ({ ...prev, [ordenId]: !prev[ordenId] }));
  };

  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // Calcular el total de la orden sumando totalLinea de todos los items
  const calcularTotal = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((o) =>
          [
            o.numero,
            o.fecha,
            o.cliente?.nombre,
            o.sede?.nombre,
            o.obra,
            o.venta ? "venta" : "cotizacion",
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

  const handleGuardar = async (form, isEdit) => {
    try {
      await onEditar(form, isEdit);
      setIsModalOpen(false);
      setOrdenEditando(null);
    } catch (e) {
      console.error("Error guardando orden", e);
      alert("Error guardando orden. Revisa consola.");
    }
  };

  return (
    <div className="table-container">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar orden..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>{total} registro(s)</span>
          <button
            onClick={() => {
              setOrdenEditando(null);
              setIsModalOpen(true);
            }}
            className="addButton"
          >
            <img src={add} className="iconButton" />
            Nueva orden
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Sede</th>
              <th>Obra</th>
              <th>Tipo</th>
              <th>Crédito</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="empty">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading &&
              pageData.map((o) => {
                const detalles = Array.isArray(o.items) ? o.items : [];
                const totalOrden = calcularTotal(detalles);
                const id = o.id;
                return (
                  <Fragment key={id}>
                    <tr>
                      <td>{o.numero}</td>
                      <td>{fmtFecha(o.fecha)}</td>
                      <td>{o.cliente?.nombre ?? "-"}</td>
                      <td>{o.sede?.nombre ?? "-"}</td>
                      <td>{o.obra ?? "-"}</td>
                      <td>{o.venta ? "Venta" : "Cotización"}</td>
                      <td>{o.credito ? "Sí" : "No"}</td>
                      <td>${totalOrden.toLocaleString("es-CO")}</td>
                      <td>
                        <button
                          className="btnLink"
                          onClick={() => toggleExpand(id)}
                        >
                          {expanded[id] ? "Ocultar" : "Ver Items"}
                        </button>

                        <button
                          className="btnEdit"
                          onClick={() => {
                            setOrdenEditando(o);
                            setIsModalOpen(true);
                          }}
                        >
                          <img src={editar} className="iconButton" />
                        </button>

                        <button
                          className="btnDelete"
                          onClick={() => onEliminar?.(o)}
                        >
                          <img src={eliminar} className="iconButton" />
                        </button>
                      </td>
                    </tr>

                    {expanded[id] && (
                      <tr>
                        <td colSpan={9}>
                          {detalles.length === 0 ? (
                            <div className="empty-sub">Sin ítems.</div>
                          ) : (
                            <div style={{ padding: "0.5rem" }}>
                              <table style={{ width: "100%", fontSize: "0.875rem" }}>
                                <thead>
                                  <tr style={{ 
                                    backgroundColor: "var(--color-light-blue, #4f67ff)",
                                    color: "white"
                                  }}>
                                    <th style={{ padding: "0.25rem", textAlign: "left" }}>Código</th>
                                    <th style={{ padding: "0.25rem", textAlign: "left" }}>Producto</th>
                                    <th style={{ padding: "0.25rem", textAlign: "left" }}>Descripción</th>
                                    <th style={{ padding: "0.25rem", textAlign: "center" }}>Cantidad</th>
                                    <th style={{ padding: "0.25rem", textAlign: "right" }}>Precio Unit.</th>
                                    <th style={{ padding: "0.25rem", textAlign: "right" }}>Total Línea</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detalles.map((d, i) => (
                                    <tr key={d.id ?? i}>
                                      <td style={{ padding: "0.25rem" }}>{d.producto?.codigo ?? "-"}</td>
                                      <td style={{ padding: "0.25rem" }}>{d.producto?.nombre ?? "-"}</td>
                                      <td style={{ padding: "0.25rem" }}>{d.descripcion ?? "-"}</td>
                                      <td style={{ padding: "0.25rem", textAlign: "center" }}>{d.cantidad}</td>
                                      <td style={{ padding: "0.25rem", textAlign: "right" }}>
                                        ${d.precioUnitario?.toLocaleString("es-CO")}
                                      </td>
                                      <td style={{ padding: "0.25rem", textAlign: "right" }}>
                                        ${d.totalLinea?.toLocaleString("es-CO")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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

      {/* Paginación */}
      {maxPage > 1 && (
        <div className="pagination">
          <button
            disabled={curPage === 1}
            onClick={() => setPage(1)}
            className="pagination-btn"
          >
            ««
          </button>
          <button
            disabled={curPage === 1}
            onClick={() => setPage(curPage - 1)}
            className="pagination-btn"
          >
            ‹
          </button>
          <span className="pagination-info">
            Página {curPage} de {maxPage}
          </span>
          <button
            disabled={curPage === maxPage}
            onClick={() => setPage(curPage + 1)}
            className="pagination-btn"
          >
            ›
          </button>
          <button
            disabled={curPage === maxPage}
            onClick={() => setPage(maxPage)}
            className="pagination-btn"
          >
            »»
          </button>
        </div>
      )}

      {/* Modal para crear/editar */}
      <OrdenModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setOrdenEditando(null);
        }}
        onSave={handleGuardar}
        orden={ordenEditando}
      />
    </div>
  );
}
