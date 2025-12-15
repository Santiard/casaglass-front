// src/components/IngresoTable.jsx
import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import deleteIcon from "../assets/eliminar.png";
import IngresoModal from "../modals/IngresoModal.jsx";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function IngresosTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  proveedores = [],
  catalogoProductos = [],
  onVerDetalles,
  onCrear,
  onActualizar,
  onEliminar,
  onProcesar,
  // Paginación del servidor
  totalElements = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 20,
  onPageChange = null,
  serverSidePagination = false,
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError } = useToast();
  const [ingresos, setIngresos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);

  useEffect(() => {
    setIngresos(Array.isArray(data) ? data : []);
  }, [data]);

  const openNuevo = () => {
    setIngresoEditando(null);
    setIsModalOpen(true);
  };

  const openEditar = (ing) => {
  // Permite abrir el modal SIEMPRE, pero dentro decidirá si es editable
  setIngresoEditando(ing);
  setIsModalOpen(true);
};

  const handleGuardarIngreso = async (payload, isEdit) => {
    try {
      if (isEdit) {
        await onActualizar?.(ingresoEditando.id, payload);
      } else {
        await onCrear?.(payload);
      }
      setIsModalOpen(false);
      setIngresoEditando(null);
      setPage(1);
    } catch (e) {
      console.error("Error en handleGuardarIngreso:", e);
      throw new Error(
        e?.message || e?.response?.data?.message || "No se pudo guardar el ingreso."
      );
    }
  };

  const eliminar = async (ing) => {
    const d = parseLocalDate(ing.fecha);
    const diff = diffDaysFromToday(d);
    if (diff > 2) {
      showError("No se puede eliminar un ingreso con más de 2 días de antigüedad.");
      return;
    }
    const confirmacion = await confirm({
      title: "Eliminar Ingreso",
      message: `¿Estás seguro de que deseas eliminar este ingreso?\n\nEsta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });
    if (!confirmacion) return;
    await onEliminar?.(ing.id);
  };

  // === Helpers de fecha ===
  const parseLocalDate = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  };
  const diffDaysFromToday = (dateObj) => {
    if (!dateObj || isNaN(dateObj)) return Infinity;
    const ms = Date.now() - dateObj.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };
  const canEdit = (ing) => {
    const d = parseLocalDate(ing.fecha);
    const days = diffDaysFromToday(d);
    return Number.isFinite(days) && days <= 2;
  };

  const fmtFecha = (iso) => {
    const d = parseLocalDate(iso);
    return !d || isNaN(d)
      ? "-"
      : d.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  };
  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : n ?? "-";

  useEffect(() => setRowsPerPageState(rowsPerPage), [rowsPerPage]);

  const filtrados = useMemo(() => {
    // Si es paginación del servidor, usar valores del servidor directamente
    if (serverSidePagination) {
      const total = totalElements || 0;
      const maxPage = totalPages || 1;
      const curPage = currentPage || 1;
      const start = (curPage - 1) * pageSize;
      
      // Aplicar solo filtros del lado del cliente (búsqueda)
      // Nota: Idealmente estos filtros también deberían ir al servidor
      let arr = ingresos;
      const q = query.trim().toLowerCase();
      
      if (q) {
        arr = arr.filter((ing) =>
          [
            ing.numeroFactura,
            ing.observaciones,
            ing.proveedor?.nombre,
            ...((ing.detalles ?? []).map(
              (d) => `${d.producto?.nombre ?? ""} ${d.producto?.codigo ?? ""}`
            )),
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        );
      }
      
      return { pageData: arr, total, maxPage, curPage, start };
    }
    
    // Paginación del lado del cliente (comportamiento anterior)
    const q = query.trim().toLowerCase();
    const base = q
      ? ingresos.filter((ing) =>
          [
            ing.numeroFactura,
            ing.observaciones,
            ing.proveedor?.nombre,
            ...((ing.detalles ?? []).map(
              (d) => `${d.producto?.nombre ?? ""} ${d.producto?.codigo ?? ""}`
            )),
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : ingresos;

    const total = base.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageState));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageState;
    const pageData = base.slice(start, start + rowsPerPageState);
    return { pageData, total, maxPage, curPage, start };
  }, [ingresos, query, page, rowsPerPageState, serverSidePagination, totalElements, totalPages, currentPage, pageSize]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  // Funciones de paginación
  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;
  const goFirst = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(1, pageSize);
    } else {
      setPage(1);
    }
  };
  const goPrev  = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(Math.max(1, curPage - 1), pageSize);
    } else {
      setPage(p => Math.max(1, p - 1));
    }
  };
  const goNext  = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(Math.min(maxPage, curPage + 1), pageSize);
    } else {
      setPage(p => Math.min(maxPage, p + 1));
    }
  };
  const goLast  = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(maxPage, pageSize);
    } else {
      setPage(maxPage);
    }
  };

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPageState, total);

  return (
    <div className="table-container ingresos">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar por proveedor, factura, observaciones o producto..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />

        <div className="rows-per-page">
          <span>Filas:</span>
          <select
            className="clientes-select"
            value={serverSidePagination ? pageSize : rowsPerPageState}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (serverSidePagination && onPageChange) {
                onPageChange(1, newSize);
              } else {
                setRowsPerPageState(newSize);
                setPage(1);
              }
            }}
          >
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button className="addButton" type="button" onClick={openNuevo}>
          <img src={add} className="iconButton" />
          Nuevo ingreso
        </button>
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
            {loading && (
              <tr>
                <td colSpan={8} className="empty">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No hay ingresos registrados
                </td>
              </tr>
            )}

            {!loading &&
              pageData.map((ing) => {
                const dets = Array.isArray(ing.detalles) ? ing.detalles : [];
                const editable = canEdit(ing);

                return (
                  <tr
                    key={ing.id}
                    onDoubleClick={() => onVerDetalles?.(ing)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{fmtFecha(ing.fecha)}</td>
                    <td>{ing.proveedor?.nombre ?? "-"}</td>
                    <td>{ing.numeroFactura ?? "-"}</td>
                    <td className="cut">{ing.observaciones ?? "-"}</td>
                    <td>
                      <span className="badge">{dets.length}</span>
                    </td>
                    <td>{fmtCOP(Number(ing.totalCosto))}</td>
                    <td>
                      <span 
                        className={`badge ${ing.procesado ? 'badge-success' : 'badge-warning'}`}
                        style={{
                          background: ing.procesado ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                          color: ing.procesado ? 'var(--color-success)' : 'var(--color-warning)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                      >
                        {ing.procesado ? 'Procesado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btnLink"
                        type="button"
                        onClick={() => onVerDetalles?.(ing)}
                      >
                        Ver detalles
                      </button>
                    </td>
                    <td className="clientes-actions" style={{ gap: ".25rem" }}>
                      {/* Botón Procesar - solo si no está procesado */}
                      {!ing.procesado && (
                        <button
                          className="btn"
                          onClick={() => onProcesar?.(ing.id)}
                          title="Procesar ingreso"
                        >
                          Procesar
                        </button>
                      )}
                      
                      <button
                          className="btnEdit"
                          onClick={() => openEditar(ing)}
                          title={
                            editable
                              ? "Editar ingreso"
                              : "Solo lectura (más de 2 días)"
                          }
                        >
                        <img
                          src={editar}
                          className="iconButton"
                          alt="Editar"
                        />
                      </button>
                      
                      <button
                      className="btnDelete"
                      onClick={() => eliminar(ing)}
                      title="Eliminar ingreso"
                    >
                     <img src={deleteIcon} className="iconButton" />
                    </button>
                   
                    </td>
                  </tr>
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
              <button 
                key={p} 
                className={`pg-btn ${p === curPage ? "active" : ""}`} 
                onClick={() => {
                  if (serverSidePagination && onPageChange) {
                    onPageChange(p, pageSize);
                  } else {
                    setPage(p);
                  }
                }}
              >
                {p}
              </button>
            ) : null;
          })}
          <button className="pg-btn" onClick={goNext} disabled={!canNext}>›</button>
          <button className="pg-btn" onClick={goLast} disabled={!canNext}>»</button>
        </div>
      </div>

      {/* Modal para crear/editar */}
      <IngresoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIngresoEditando(null);
        }}
        onSave={handleGuardarIngreso}
        proveedores={proveedores}
        catalogoProductos={catalogoProductos}
        ingresoInicial={ingresoEditando}
      />

      {/* Modal de confirmación */}
      <ConfirmDialog />
    </div>
  );
}
