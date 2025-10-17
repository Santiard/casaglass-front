import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import editar from "../assets/editar.png";
import eliminar from "../assets/eliminar.png";
import add from "../assets/add.png";
import OrdenModal from "../modals/OrdenModal.jsx";

export default function OrdenesTable({
  data = [],
  onEditar,
  onAnular,
  onCrear,
  rowsPerPage = 10,
  loading = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(""); // Filtro de estado

  // 🔹 Alternar expandir/ocultar items
  const toggleExpand = (ordenId) => {
    setExpanded((prev) => ({ ...prev, [ordenId]: !prev[ordenId] }));
  };

  // 🔹 Formatear fecha local
  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // 🔹 Calcular total de orden
  const calcularTotal = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
  };

  // 🔹 Formatear estado de la orden
  const formatearEstado = (estado) => {
    const estadoLimpio = estado?.toLowerCase() || 'activa';
    const textos = {
      'activa': 'Activa',
      'anulada': 'Anulada', 
      'pendiente': 'Pendiente',
      'completada': 'Completada'
    };
    
    const texto = textos[estadoLimpio] || estado || 'Activa';
    
    return (
      <span className={`estado-badge ${estadoLimpio}`}>
        {texto}
      </span>
    );
  };

  // 🔹 Filtrar y paginar
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    // Aplicar filtros
    let arr = data;
    
    // Filtro por texto (sin incluir estado)
    if (q) {
      arr = arr.filter((o) =>
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
      );
    }
    
    // Filtro por estado
    if (filtroEstado) {
      arr = arr.filter((o) => o.estado === filtroEstado);
    }

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage };
  }, [data, query, page, rowsPerPage, filtroEstado]);

  const { pageData, total, maxPage, curPage } = filtrados;

  // 🔹 Guardar orden (actualizar)
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

  // 🔹 Refrescar tabla tras cerrar modal
  const handleCloseModal = async () => {
    setIsModalOpen(false);
    setOrdenEditando(null);
    try {
      await onEditar(null, true); // fuerza refresh de tabla
    } catch (e) {
      console.error("Error refrescando tabla:", e);
    }
  };

  return (
    <div className="table-container">
      {/* 🔍 Buscador y Filtros */}
      <div className="ordenes-toolbar">
        <div className="ordenes-filters">
          <input
            className="clientes-input ordenes-search"
            type="text"
            placeholder="Buscar orden..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          
          <select
            className="clientes-input ordenes-estado-filter"
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVA">Activas</option>
            <option value="ANULADA">Anuladas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="COMPLETADA">Completadas</option>
          </select>
          
          {(query || filtroEstado) && (
            <button
              onClick={() => {
                setQuery("");
                setFiltroEstado("");
                setPage(1);
              }}
              className="btn-clear-filters"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="ordenes-actions">
          <span className="ordenes-count">
            {total} registro(s)
          </span>
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

      {/* 📋 Tabla principal */}
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
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="empty">
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
                  <Fragment key={`orden-${id}`}>
                    <tr>
                      <td>{o.numero}</td>
                      <td>{fmtFecha(o.fecha)}</td>
                      <td>{o.cliente?.nombre ?? "-"}</td>
                      <td>{o.sede?.nombre ?? "-"}</td>
                      <td>{o.obra ?? "-"}</td>
                      <td>{o.venta ? "Venta" : "Cotización"}</td>
                      <td>{o.credito ? "Sí" : "No"}</td>
                      <td>{formatearEstado(o.estado)}</td>
                      <td>${totalOrden.toLocaleString("es-CO")}</td>
                      <td className="actions-cell">
                        <button
                          className="btnLink"
                          onClick={() => toggleExpand(id)}
                        >
                          {expanded[id] ? "Ocultar" : "Ver Items"}
                        </button>

                        <button
                          className="btnEdit"
                          onClick={() => {
                            console.log("✏️ Editando orden:", o);
                            setOrdenEditando(o);
                            setIsModalOpen(true);
                          }}
                        >
                          <img src={editar} className="iconButton" />
                        </button>

                        <button
                          className="btnAnular"
                          onClick={() => onAnular?.(o)}
                          title="Anular orden"
                        >
                          <img className="iconButton" src={eliminar} />
                          <span className="btnAnular-text">Anular</span>
                        </button>
                      </td>
                    </tr>

                    {expanded[id] && (
                      <tr key={`detalles-${id}`}>
                        <td colSpan={10}>
                          {detalles.length === 0 ? (
                            <div className="empty-sub">Sin ítems.</div>
                          ) : (
                            <div className="orden-detalles-container">
                              <table className="orden-detalles-table">
                                <thead>
                                  <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Descripción</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Total Línea</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detalles.map((d, i) => (
                                    <tr key={`item-${d.id || i}-${id}`}>
                                      <td>{d.producto?.codigo ?? "-"}</td>
                                      <td>{d.producto?.nombre ?? "-"}</td>
                                      <td>{d.descripcion ?? "-"}</td>
                                      <td className="text-center">{d.cantidad}</td>
                                      <td>${d.precioUnitario?.toLocaleString("es-CO")}</td>
                                      <td>${d.totalLinea?.toLocaleString("es-CO")}</td>
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

      {/* 📄 Paginación */}
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

      {/* Modal de edición */}
      <OrdenModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleGuardar}
        orden={ordenEditando}
      />
    </div>
  );
}
