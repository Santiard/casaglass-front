import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import editar from "../assets/editar.png";
import eliminar from "../assets/eliminar.png";
import add from "../assets/add.png";
import OrdenModal from "../modals/OrdenModal.jsx";
import OrdenImprimirModal from "../modals/OrdenImprimirModal.jsx";
import FacturarOrdenModal from "../modals/FacturarOrdenModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function OrdenesTable({
  data = [],
  onEditar,
  onAnular,
  onCrear,
  onFacturar,
  onConfirmarVenta,
  rowsPerPage = 10,
  loading = false,
}) {
  const { showError } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(""); // Filtro de estado
  const [isImprimirModalOpen, setIsImprimirModalOpen] = useState(false);
  const [ordenImprimir, setOrdenImprimir] = useState(null);
  const [isFacturarModalOpen, setIsFacturarModalOpen] = useState(false);
  const [ordenFacturar, setOrdenFacturar] = useState(null);

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

  // 🔹 Calcular total de orden (usar total del backend si existe, sino calcular desde items)
  const calcularTotal = (orden) => {
    // Si el backend ya calculó el total (incluye descuentos), usarlo
    if (orden?.total !== undefined && orden?.total !== null) {
      return orden.total;
    }
    // Si no, calcular desde items (solo subtotal, sin descuentos)
    if (!Array.isArray(orden?.items)) return 0;
    return orden.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
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
    
    // Determinar colores según el estado
    let bgColor, textColor;
    switch(estadoLimpio) {
      case 'activa':
        bgColor = 'var(--color-success-bg)';
        textColor = 'var(--color-success)';
        break;
      case 'anulada':
        bgColor = 'var(--color-danger-bg)';
        textColor = 'var(--color-danger)';
        break;
      case 'pendiente':
        bgColor = 'var(--color-warning-bg)';
        textColor = 'var(--color-warning)';
        break;
      case 'completada':
        bgColor = 'var(--color-info-bg)';
        textColor = 'var(--color-info)';
        break;
      default:
        bgColor = 'var(--color-gray)';
        textColor = 'var(--color-white)';
    }
    
    return (
      <span 
        className="badge"
        style={{
          background: bgColor,
          color: textColor,
          padding: '0.25rem 0.5rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}
      >
        {texto}
      </span>
    );
  };

  // 🔹 Imprimir orden
  const handleImprimir = (orden) => {
    setOrdenImprimir(orden);
    setIsImprimirModalOpen(true);
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
    
    // 🔹 Ordenar por fecha descendente (más recientes primero)
    // ⚠️ Clonar array para evitar mutar el original
    arr = [...arr].sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      const diffFechas = fechaB - fechaA;
      
      // Si las fechas son iguales, ordenar por ID (más reciente primero)
      if (diffFechas === 0) {
        return (b.id || 0) - (a.id || 0);
      }
      
      return diffFechas;
    });

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageState));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageState;
    const pageData = arr.slice(start, start + rowsPerPageState);
    return { pageData, total, maxPage, curPage, start };
  }, [data, query, page, rowsPerPageState, filtroEstado]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  // Funciones de paginación
  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;
  const goFirst = () => setPage(1);
  const goPrev  = () => setPage(p => Math.max(1, p - 1));
  const goNext  = () => setPage(p => Math.min(maxPage, p + 1));
  const goLast  = () => setPage(maxPage);

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPageState, total);

  // 🔹 Guardar orden (actualizar)
  const handleGuardar = async (form, isEdit) => {
    try {
      await onEditar(form, isEdit);
      setIsModalOpen(false);
      setOrdenEditando(null);
    } catch (e) {
      console.error("Error guardando orden", e);
      showError("Error guardando orden. Revisa consola.");
    }
  };


  return (
    <div className="table-container ordenes">
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
          <div className="rows-per-page">
            <span>Filas:</span>
            <select
              className="clientes-select"
              value={rowsPerPageState}
              onChange={(e) => { setRowsPerPageState(Number(e.target.value)); setPage(1); }}
            >
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        
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
                // Usar función calcularTotal que prioriza total del backend
                const totalOrden = calcularTotal(o);
                const id = o.id;

                const yaFacturada = Boolean(o.facturada || o.numeroFactura || (o.factura && (o.factura.id || o.factura.numero)));
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
                          {expanded[id] ? "Ocultar" : "Detalles"}
                        </button>

                        <button
                          className="btnLink"
                          onClick={() => handleImprimir(o)}
                          title="Imprimir orden"
                        >
                          Imprimir
                        </button>

                        {/* Botón para confirmar venta (solo si venta es false y la orden no está anulada) */}
                        {!o.venta && onConfirmarVenta && o.estado?.toLowerCase() !== 'anulada' && (
                          <button
                            className="btnLink"
                            onClick={() => onConfirmarVenta?.(o)}
                            title="Confirmar venta (marcar como pagada y lista para contabilidad)"
                          >
                            Confirmar
                          </button>
                        )}

                        {/* Botón Facturar solo visible si la venta está confirmada */}
                        {o.venta && (
                          <button
                            className="btnLink"
                            onClick={() => {
                              if (yaFacturada) return;
                              setOrdenFacturar(o);
                              setIsFacturarModalOpen(true);
                            }}
                            title={yaFacturada ? "Orden ya facturada" : "Facturar orden"}
                            disabled={yaFacturada}
                            style={{ opacity: yaFacturada ? 0.5 : 1, cursor: yaFacturada ? 'not-allowed' : 'pointer' }}
                          >
                            Facturar
                          </button>
                        )}

                        <button
                          className="btnEdit"
                          onClick={() => {
                            setOrdenEditando(o);
                            setIsModalOpen(true);
                          }}
                          disabled={o.estado?.toLowerCase() === 'anulada'}
                          title={o.estado?.toLowerCase() === 'anulada' ? 'No se puede editar una orden anulada' : 'Editar orden'}
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

      {/* Modal de edición */}
      <OrdenModal
        isOpen={isModalOpen}
        onClose={async () => {
          setIsModalOpen(false);
          setOrdenEditando(null);
          // Refrescar datos automáticamente
          try {
            await onEditar(null, true);
          } catch (e) {
            console.error("Error refrescando tabla:", e);
          }
        }}
        onSave={handleGuardar}
        orden={ordenEditando}
      />

      {/* Modal de impresión */}
      <OrdenImprimirModal
        isOpen={isImprimirModalOpen}
        orden={ordenImprimir}
        onClose={() => {
          setIsImprimirModalOpen(false);
          setOrdenImprimir(null);
        }}
      />

      {/* Modal de facturación */}
      <FacturarOrdenModal
        isOpen={isFacturarModalOpen}
        orden={ordenFacturar}
        onClose={() => {
          setIsFacturarModalOpen(false);
          setOrdenFacturar(null);
        }}
        onSave={onFacturar}
      />
    </div>
  );
}
