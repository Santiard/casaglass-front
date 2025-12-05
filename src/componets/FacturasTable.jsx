import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import check from "../assets/check.png";
import HistoricoFacturasClienteModal from "../modals/HistoricoFacturasClienteModal.jsx";
import HistoricoFacturasGeneralModal from "../modals/HistoricoFacturasGeneralModal.jsx";

export default function FacturasTable({
  data = [],
  onVerificar,
  onEliminar,
  onConfirmarTodas,
  clientes = [],
  rowsPerPage = 10,
  loading = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);
  const [filtroCliente, setFiltroCliente] = useState(null); // Cambiar a null para permitir limpiar
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [isHistoricoGeneralModalOpen, setIsHistoricoGeneralModalOpen] = useState(false);

  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : n ?? "-";

  const formatearEstado = (estado) => {
    const estadoLimpio = estado?.toLowerCase() || 'pendiente';
    const textos = {
      'pendiente': 'Pendiente',
      'pagada': 'Pagada', 
      'anulada': 'Anulada',
      'en_proceso': 'En Proceso'
    };
    
    const texto = textos[estadoLimpio] || estado || 'Pendiente';
    
    let bgColor, textColor;
    switch(estadoLimpio) {
      case 'pagada':
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
      case 'en_proceso':
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

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = data;

    if (q) {
      arr = arr.filter((f) =>
        [
          f.numeroFactura,
          f.numero,
          f.fecha,
          f.cliente?.nombre,
          f.cliente?.nit,
          f.observaciones,
          f.formaPago,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Filtrar por cliente comparando por nombre (el ID no está disponible en las facturas)
    if (filtroCliente !== null && filtroCliente !== "" && clienteSeleccionado?.nombre) {
      const nombreClienteBuscado = clienteSeleccionado.nombre.trim().toUpperCase();
      arr = arr.filter((f) => {
        const clienteNombre = f.cliente?.nombre || f.orden?.cliente?.nombre;
        if (!clienteNombre) return false;
        return clienteNombre.trim().toUpperCase() === nombreClienteBuscado;
      });
    }

    arr = [...arr].sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      const diffFechas = fechaB - fechaA;
      if (diffFechas === 0) return (b.id || 0) - (a.id || 0);
      return diffFechas;
    });

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageState));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageState;
    const pageData = arr.slice(start, start + rowsPerPageState);
    return { pageData, total, maxPage, curPage, start };
  }, [data, query, page, rowsPerPageState, filtroCliente]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  // Calcular cantidad de facturas pendientes
  const facturasPendientes = useMemo(() => {
    return data.filter(f => {
      const estado = f.estado?.toLowerCase() || 'pendiente';
      return estado === 'pendiente';
    }).length;
  }, [data]);

  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;
  const goFirst = () => setPage(1);
  const goPrev  = () => setPage(p => Math.max(1, p - 1));
  const goNext  = () => setPage(p => Math.min(maxPage, p + 1));
  const goLast  = () => setPage(maxPage);

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPageState, total);

  return (
    <div className="table-container facturas">
      {/* Buscador y Filtros */}
      <div className="ordenes-toolbar">
        <div className="ordenes-filters">
          <input
            className="clientes-input ordenes-search"
            type="text"
            placeholder="Buscar factura por número, cliente, NIT..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            style={{
              maxWidth: '300px',
              width: '300px'
            }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className="clientes-input ordenes-estado-filter"
              value={clienteSeleccionado?.nombre || ""}
              readOnly
              onClick={() => setShowClienteModal(true)}
              placeholder="Haz clic para seleccionar cliente..."
              style={{
                cursor: 'pointer',
                minWidth: '250px'
              }}
            />
            {clienteSeleccionado && (
              <button
                type="button"
                onClick={() => {
                  setFiltroCliente(null);
                  setClienteSeleccionado(null);
                  setPage(1);
                }}
                style={{
                  padding: '0.5rem',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                title="Limpiar filtro de cliente"
              >
                ✕
              </button>
            )}
            {!clienteSeleccionado && (
              <button
                type="button"
                onClick={() => setShowClienteModal(true)}
                className="btn-guardar"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                Buscar Cliente
              </button>
            )}
          </div>
          
          {(query || filtroCliente !== null) && (
            <button
              onClick={() => {
                setQuery("");
                setFiltroCliente(null);
                setClienteSeleccionado(null);
                setPage(1);
              }}
              className="btn-clear-filters"
            >
              Limpiar filtros
            </button>
          )}
          
          {/* Botón Confirmar Todas */}
          {onConfirmarTodas && facturasPendientes > 0 && (
            <button
              onClick={onConfirmarTodas}
              className="btn-guardar"
              style={{
                whiteSpace: 'nowrap',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                marginLeft: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title={`Confirmar ${facturasPendientes} factura(s) pendiente(s)`}
            >
              <img src={check} alt="Confirmar" style={{ width: '16px', height: '16px' }} />
              Confirmar Todas ({facturasPendientes})
            </button>
          )}
        </div>

        <div className="ordenes-actions">
          {/* Botones de Histórico */}
          <button
            onClick={() => setIsHistoricoModalOpen(true)}
            className="btn-guardar"
            style={{
              marginRight: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
          >
            Histórico por Cliente
          </button>
          <button
            onClick={() => setIsHistoricoGeneralModalOpen(true)}
            className="btn-guardar"
            style={{
              marginRight: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
          >
            Histórico General
          </button>
          
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

      {/* Tabla principal */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Número Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>NIT</th>
              <th>Orden</th>
              <th>Subtotal</th>
              <th>IVA</th>
              <th>Retefuente</th>
              <th>Total</th>
              <th>Forma de Pago</th>
              <th>Estado</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} className="empty">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={13} className="empty">
                  No hay facturas registradas
                </td>
              </tr>
            )}

            {!loading &&
              pageData.map((f) => {
                // El backend ahora siempre retorna el cliente en f.cliente (puede ser null)
                // Si la factura tiene cliente, usa ese; si no, usa el de la orden
                const cliente = f.cliente || f.orden?.cliente;
                const subtotal = f.subtotal || 0;
                const iva = f.iva || 0;
                const retencionFuente = f.retencionFuente || 0;
                const descuentos = f.descuentos || 0;
                const total = f.total || (subtotal + iva - descuentos);
                const estado = f.estado?.toLowerCase() || 'pendiente';
                const puedeVerificar = estado === 'pendiente' || estado === 'en_proceso';
                const puedeEliminar = estado !== 'pagada'; // Backend no permite eliminar pagadas

                return (
                  <tr key={f.id}>
                    <td>#{f.numeroFactura || f.numero || f.id}</td>
                    <td>{fmtFecha(f.fecha)}</td>
                    <td>{cliente?.nombre ?? "-"}</td>
                    <td>{cliente?.nit ?? "-"}</td>
                    <td>#{f.orden?.numero ?? f.ordenId ?? "-"}</td>
                    <td>{fmtCOP(subtotal)}</td>
                    <td>{fmtCOP(iva)}</td>
                    <td>{fmtCOP(retencionFuente)}</td>
                    <td>{fmtCOP(total)}</td>
                    <td>{f.formaPago ?? "-"}</td>
                    <td>{formatearEstado(f.estado)}</td>
                    <td className="cut">{f.observaciones ?? "-"}</td>
                    <td className="clientes-actions">
                      {puedeVerificar && (
                        <button 
                          className="btnConfirm" 
                          onClick={() => onVerificar?.(f)} 
                          title="Verificar / Marcar como pagada"
                          style={{
                            backgroundColor: '#28a745',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            marginRight: '4px'
                          }}
                        >
                          <img src={check} className="iconButton" alt="Verificar" />
                        </button>
                      )}
                      {puedeEliminar && (
                        <button 
                          className="btnDelete" 
                          onClick={() => onEliminar?.(f)} 
                          title="Eliminar factura"
                        >
                          <img src={eliminar} className="iconButton" alt="Eliminar" />
                        </button>
                      )}
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
              <button key={p} className={`pg-btn ${p === curPage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="pg-btn" onClick={goNext} disabled={!canNext}>›</button>
          <button className="pg-btn" onClick={goLast} disabled={!canNext}>»</button>
        </div>
      </div>

      {/* Modal de selección de clientes */}
      {showClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 100001 }} onClick={() => {
          setClienteSearchModal("");
          setShowClienteModal(false);
        }}>
          <div className="modal-container" style={{ 
            maxWidth: '900px', 
            width: '95vw', 
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Seleccionar Cliente</h2>
              <button className="close-btn" onClick={() => {
                setClienteSearchModal("");
                setShowClienteModal(false);
              }}>
                ✕
              </button>
            </header>
            
            <div style={{ marginBottom: '1rem', flexShrink: 0, padding: '1.2rem' }}>
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  padding: '0.5rem',
                  border: '1px solid #d2d5e2',
                  borderRadius: '5px'
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              border: '1px solid #e6e8f0',
              borderRadius: '8px',
              margin: '0 1.2rem',
              marginBottom: '1.2rem'
            }}>
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                
                // Ordenar alfabéticamente
                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                });
                
                if (sorted.length === 0) {
                  return (
                    <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                      No se encontraron clientes
                    </div>
                  );
                }
                
                return (
                  <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Nombre</th>
                          <th style={{ width: '15%' }}>NIT</th>
                          <th style={{ width: '25%' }}>Correo</th>
                          <th style={{ width: '15%' }}>Ciudad</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td title={c.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {c.nombre || '-'}
                            </td>
                            <td title={c.nit || '-'}>
                              {c.nit || '-'}
                            </td>
                            <td title={c.correo || '-'}>
                              {c.correo || '-'}
                            </td>
                            <td title={c.ciudad || '-'}>
                              {c.ciudad || '-'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteSeleccionado(c);
                                  setFiltroCliente(c.id); // Guardamos el ID para referencia, pero filtramos por nombre
                                  setClienteSearchModal("");
                                  setShowClienteModal(false);
                                  setPage(1);
                                }}
                                className="btn-save"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico por Cliente */}
      {isHistoricoModalOpen && (
        <HistoricoFacturasClienteModal
          isOpen={isHistoricoModalOpen}
          onClose={() => setIsHistoricoModalOpen(false)}
        />
      )}
      
      {/* Modal de Histórico General */}
      {isHistoricoGeneralModalOpen && (
        <HistoricoFacturasGeneralModal
          isOpen={isHistoricoGeneralModalOpen}
          onClose={() => setIsHistoricoGeneralModalOpen(false)}
        />
      )}
    </div>
  );
}
