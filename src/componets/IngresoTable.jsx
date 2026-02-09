// src/components/IngresoTable.jsx
import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import deleteIcon from "../assets/eliminar.png";
import IngresoModal from "../modals/IngresoModal.jsx";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { parseLocalDate, diffDaysFromToday } from "../lib/dateUtils.js";

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
  // Paginación del servidor
  totalElements = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 20,
  onPageChange = null,
  serverSidePagination = false,
}) {
  const { isAdmin } = useAuth();
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

  const openEditar = async (ing) => {
    // Obtener el ingreso completo con todos sus detalles antes de editar
    try {
      // Necesitamos importar obtenerIngreso desde el servicio
      // Por ahora, asumimos que onVerDetalles ya lo hace y podríamos usar esa misma lógica
      // O simplemente pasar el ingreso y que el modal llame al servicio si necesita más datos
      setIngresoEditando(ing);
      setIsModalOpen(true);
    } catch (e) {
      showError?.("No se pudo cargar el ingreso para editar");
    }
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
      throw new Error(
        e?.message || e?.response?.data?.message || "No se pudo guardar el ingreso."
      );
    }
  };

  const eliminar = async (ing) => {
    // Mensaje de confirmación simplificado - ahora siempre se puede eliminar
    const mensaje = `¿Estás seguro de que deseas eliminar este ingreso?\n\n⚠️ ADVERTENCIA: Esta acción revertirá automáticamente el inventario (restará las cantidades que se sumaron al procesar).\n\nEsta acción no se puede deshacer.`;
    
    const confirmacion = await confirm({
      title: "Eliminar Ingreso",
      message: mensaje,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });
    
    if (!confirmacion) return;
    
    try {
      await onEliminar?.(ing.id);
    } catch (error) {
      // El error ya se maneja en IngresoPage
      throw error;
    }
  };

  // ❌ ELIMINADA: función desprocesar ya no es necesaria

  // === Helpers de fecha (ahora importados desde dateUtils) ===
  // Edición siempre permitida - ya no hay restricciones por estado procesado
  const canEdit = (ing) => {
    return true; // Siempre se puede editar
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
              <th style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>N° Ingreso</th>
              <th style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>Fecha</th>
              <th style={{ width: '22%', minWidth: '170px' }}>Proveedor</th>
              <th style={{ width: '12%', minWidth: '100px' }}>N° Factura</th>
              <th style={{ width: '100px', minWidth: '100px', maxWidth: '100px', textAlign: 'center' }}>Total Productos</th>
              <th>Total costo</th>
              <th style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>Detalle</th>
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
                // Calcular suma total de cantidades de productos
                const totalProductos = dets.reduce((sum, det) => sum + (Number(det.cantidad) || 0), 0);
                // Usar cantidadTotal del backend si existe, sino calcular de detalles
                // Detectar si el ingreso contiene vidrio
                const esVidrioIngreso = dets.some(det => (det.producto?.categoria || '').toLowerCase() === 'vidrio' || det.producto?.esVidrio);
                const cantidadMostrar = ing.cantidadTotal ?? (dets.length > 0 ? totalProductos : null);

                return (
                  <tr
                    key={ing.id}
                    onDoubleClick={() => onVerDetalles?.(ing)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ width: '80px', minWidth: '80px', maxWidth: '80px', textAlign: 'center' }}>
                      <strong>#{ing.id}</strong>
                    </td>
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}>{fmtFecha(ing.fecha)}</td>
                    <td style={{ width: '22%', minWidth: '170px' }}>{ing.proveedor?.nombre ?? "-"}</td>
                    <td style={{ width: '12%', minWidth: '100px' }}>{ing.numeroFactura ?? "-"}</td>
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', textAlign: 'center' }}>
                      {cantidadMostrar !== null ? (
                        <span className="badge">
                          {esVidrioIngreso
                            ? Number(cantidadMostrar).toFixed(2) + ' m²'
                            : (Number(cantidadMostrar) % 1 === 0 ? Number(cantidadMostrar).toFixed(0) : Number(cantidadMostrar).toFixed(2))}
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td>{fmtCOP(Number(ing.totalCosto))}</td>
                    <td style={{ width: '100px', minWidth: '100px', maxWidth: '100px', textAlign: 'center' }}>
                      <button
                        className="btnLink"
                        type="button"
                        onClick={() => onVerDetalles?.(ing)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Ver detalles
                      </button>
                    </td>
                    <td className="clientes-actions" style={{ gap: ".25rem" }}>
                      {/* ❌ ELIMINADOS: Botones Procesar y Desprocesar ya no son necesarios */}
                      
                      {/* Botón Editar - siempre disponible */}
                      <button
                        className="btnEdit"
                        onClick={() => openEditar(ing)}
                        title="Editar ingreso"
                      >
                        <img
                          src={editar}
                          className="iconButton"
                          alt="Editar"
                        />
                      </button>
                      
                      {/* Botón Eliminar - siempre disponible */}
                      <button
                        className="btnDelete"
                        onClick={() => eliminar(ing)}
                        title="Eliminar ingreso (revertirá inventario automáticamente)"
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
