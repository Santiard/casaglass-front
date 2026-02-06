// src/componets/MovimientosTable.jsx
import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import MovimientoModal from "../modals/MovimientoModal.jsx";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

import { getTodayLocalDate, toLocalDateOnly } from "../lib/dateUtils.js";

export default function MovimientosTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  sedes = [],
  catalogoProductos = [],
  onCrear,
  onActualizar,
  onEliminar,
  onConfirmar,
  onVerDetalles,
  onEditar,
  // Control del modal desde el padre (opcional)
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: externalSetIsModalOpen,
  movimientoEditando: externalMovimientoEditando,
  setMovimientoEditando: externalSetMovimientoEditando,
  // Paginación del servidor
  totalElements = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 20,
  onPageChange = null,
  serverSidePagination = false,
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, user, sedeId } = useAuth(); // Obtener rol, datos del usuario y sede asignada
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPageLocal, setRowsPerPageLocal] = useState(rowsPerPage);
  const [expanded, setExpanded] = useState({});
  
  // Usar estados externos si se proporcionan, sino usar internos
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(false);
  const [internalMovimientoEditando, setInternalMovimientoEditando] = useState(null);
  
  const isModalOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalIsModalOpen;
  const setIsModalOpen = externalSetIsModalOpen || setInternalIsModalOpen;
  const movimientoEditando = externalMovimientoEditando !== undefined ? externalMovimientoEditando : internalMovimientoEditando;
  const setMovimientoEditando = externalSetMovimientoEditando || setInternalMovimientoEditando;

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
        // Para editar la CABECERA, el backend espera:
        // { fecha: "YYYY-MM-DD", sedeOrigen:{id}, sedeDestino:{id} }
        await onActualizar?.(movimientoEditando.id, {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        });
      } else {
        // Para crear, el modal ya construye el payload correcto:
        // { fecha, sedeOrigen:{id}, sedeDestino:{id}, detalles:[{producto:{id}, cantidad}] }
        await onCrear?.(form);
      }
      setIsModalOpen(false);
      setMovimientoEditando(null);
    } catch (e) {
      showError(e?.response?.data || e?.message || "Error al guardar el traslado.");
    }
  };

  const handleConfirmarTraslado = async (trasladoId) => {
    const confirmacion = await confirm({
      title: "Confirmar Traslado",
      message: "¿Confirmas que has recibido este traslado?",
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      type: "warning"
    });
    
    if (!confirmacion) return;
    
    try {
      const response = await onConfirmar(trasladoId, user?.id);
      // Mostrar mensaje de éxito si la respuesta incluye un mensaje
      if (response?.message) {
        showSuccess(response.message);
      } else {
        showSuccess("Traslado confirmado exitosamente");
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || "Error al confirmar el traslado";
      showError(errorMsg);
    }
  };

  const filtrados = useMemo(() => {
    // Si es paginación del servidor, usar valores del servidor directamente
    if (serverSidePagination) {
      const total = totalElements || 0;
      const maxPage = totalPages || 1;
      const curPage = currentPage || 1;
      const start = (curPage - 1) * pageSize;
      
      // Aplicar solo filtros del lado del cliente (búsqueda)
      // Nota: Idealmente estos filtros también deberían ir al servidor
      let arr = data;
      const q = query.trim().toLowerCase();
      
      if (q) {
        arr = arr.filter((m) =>
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
        );
      }
      
      return { pageData: arr, total, maxPage, curPage, start };
    }
    
    // Paginación del lado del cliente (comportamiento anterior)
    const q = query.trim().toLowerCase();
    let arr = q
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

    //  Ordenar por fecha descendente (más recientes primero)
    arr = arr.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA; // Descendente (más reciente primero)
    });

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageLocal));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageLocal;
    const pageData = arr.slice(start, start + rowsPerPageLocal);
    return { pageData, total, maxPage, curPage, start };
  }, [data, query, page, rowsPerPageLocal, serverSidePagination, totalElements, totalPages, currentPage, pageSize]);

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
  const showingTo   = Math.min(start + rowsPerPageLocal, total);

  return (
    <div className="table-container mov">
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

        <div className="rows-per-page">
          <span>Filas:</span>
          <select
            className="clientes-select"
            value={serverSidePagination ? pageSize : rowsPerPageLocal}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (serverSidePagination && onPageChange) {
                onPageChange(1, newSize);
              } else {
                setRowsPerPageLocal(newSize);
                setPage(1);
              }
            }}
          >
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Botón Nuevo traslado disponible para todos los usuarios */}
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
              <th>Estado</th>
              <th>Confirmado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading &&
              pageData.map((mov) => {
                const id = mov.id;
                const detalles = Array.isArray(mov.detalles) ? mov.detalles : [];
                return (
                  <Fragment key={id}>
                    <tr>
                      <td>{mov.sedeOrigen?.nombre ?? "-"}</td>
                      <td>{mov.sedeDestino?.nombre ?? "-"}</td>
                      <td>{fmtFecha(mov.fecha)}</td>
                      <td>{diaDeSemana(mov.fecha)}</td>
                      <td>
                        {/* Mostrar suma de cantidades, diferenciando vidrio y otros */}
                        {(() => {
                          if (!detalles.length) return <span className="badge">0</span>;
                          // Sumar cantidades por tipo
                          let totalVidrio = 0, totalOtros = 0;
                          detalles.forEach(det => {
                            const esVidrio = (det.producto?.categoria || '').toLowerCase() === 'vidrio' || det.producto?.esVidrio;
                            if (esVidrio) {
                              totalVidrio += Number(det.cantidad) || 0;
                            } else {
                              totalOtros += Number(det.cantidad) || 0;
                            }
                          });
                          return (
                            <span className="badge">
                              {totalVidrio > 0 && `${totalVidrio.toFixed(2)} m²`}
                              {totalVidrio > 0 && totalOtros > 0 ? ' + ' : ''}
                              {totalOtros > 0 && `${totalOtros.toFixed(0)} u.`}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        {mov.trabajadorConfirmacion ? (
                          <span className="badge" style={{ backgroundColor: '#22c55e' }}>Confirmado</span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: '#f59e0b' }}>Pendiente</span>
                        )}
                      </td>
                      <td>
                        {mov.trabajadorConfirmacion?.nombre ? (
                          <span>{mov.trabajadorConfirmacion.nombre}</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td>
                        {/* Botón Ver Detalles - Abre modal */}
                        <button
                          className="btnLink"
                          onClick={() => onVerDetalles?.(mov)}
                          type="button"
                        >
                          Ver Detalles
                        </button>

                        {/* Determinar permisos basados en sede del trabajador */}
                        {(() => {
                          const estaConfirmado = Boolean(mov.trabajadorConfirmacion);
                          const esSalienteDeMiSede = mov.sedeOrigen?.id === sedeId;
                          const esEntranteAMiSede = mov.sedeDestino?.id === sedeId;
                          
                          // ADMINISTRADORES: pueden editar/eliminar cualquier traslado no confirmado
                          if (isAdmin && !estaConfirmado) {
                            return (
                              <>
                                <button
                                  className="btnEdit"
                                  onClick={() => onEditar?.(mov)}
                                  title="Editar traslado"
                                  type="button"
                                >
                                  <img src={editar} className="iconButton" alt="Editar" />
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => onEliminar?.(mov.id)}
                                  type="button"
                                  title="Eliminar traslado"
                                >
                                  Eliminar
                                </button>
                              </>
                            );
                          }
                          
                          // VENDEDORES: pueden editar si es SALIENTE de su sede
                          if (!isAdmin && !estaConfirmado && esSalienteDeMiSede) {
                            return (
                              <>
                                <button
                                  className="btnEdit"
                                  onClick={() => onEditar?.(mov)}
                                  title="Editar traslado saliente de mi sede"
                                  type="button"
                                >
                                  <img src={editar} className="iconButton" alt="Editar" />
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => onEliminar?.(mov.id)}
                                  type="button"
                                  title="Eliminar traslado"
                                >
                                  Eliminar
                                </button>
                              </>
                            );
                          }
                          
                          // VENDEDORES: pueden confirmar si es ENTRANTE a su sede
                          if (!isAdmin && !estaConfirmado && esEntranteAMiSede) {
                            return (
                              <button
                                className="btn"
                                onClick={() => handleConfirmarTraslado(mov.id)}
                                type="button"
                                title="Confirmar recepción del traslado entrante a mi sede"
                                style={{ backgroundColor: '#22c55e' }}
                              >
                                Confirmar Recepción
                              </button>
                            );
                          }
                          
                          // Si ya está confirmado, mostrar mensaje
                          if (!isAdmin && estaConfirmado) {
                            return (
                              <span style={{ color: '#22c55e', fontSize: '0.9rem' }}>
                                ✓ Ya confirmado
                              </span>
                            );
                          }
                          
                          // Si no es ni saliente ni entrante, no mostrar acciones
                          return null;
                        })()}
                      </td>
                    </tr>
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

      <ConfirmDialog />
    </div>
  );
}
