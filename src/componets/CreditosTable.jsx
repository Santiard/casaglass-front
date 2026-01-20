import React, { useState, useMemo, Fragment, useEffect } from "react";
import "../styles/Creditos.css";
import "../styles/Table.css";

const CreditosTable = ({ 
  creditos, 
  onAbrirAbonoModal, 
  clientes = [],
  filtroCliente = null,
  rowsPerPage: rowsPerPageProp = 10,
  // Paginación del servidor
  totalElements = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 50,
  onPageChange = null,
  serverSidePagination = false,
  modoEspecial = false,
  onSeleccionarCredito,
  creditosSeleccionados = [],
  totalSeleccionado = 0,
}) => {
  const [expandido, setExpandido] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageProp);

  const toggleExpandido = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  // Paginación
  const paginados = useMemo(() => {
    let arr = Array.isArray(creditos) ? creditos : [];
    // Filtrar por cliente si hay filtro activo
    if (filtroCliente !== null) {
      const clienteSeleccionado = clientes.find(c => c.id === filtroCliente);
      if (clienteSeleccionado?.nombre) {
        arr = arr.filter((c) => {
          const nombreCliente = c.cliente?.nombre;
          if (!nombreCliente) return false;
          return nombreCliente.trim().toUpperCase() === clienteSeleccionado.nombre.trim().toUpperCase();
        });
      }
    }
    // Si es paginación del servidor, usar valores del servidor directamente
    if (serverSidePagination) {
      const total = totalElements || 0;
      const maxPage = totalPages || 1;
      const curPage = currentPage || 1;
      const start = (curPage - 1) * pageSize;
      return { pageData: arr, total, maxPage, curPage, start };
    }
    // Paginación del lado del cliente
    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage, start };
  }, [creditos, page, rowsPerPage, serverSidePagination, totalElements, totalPages, currentPage, pageSize, filtroCliente, clientes]);

  const { pageData, total, maxPage, curPage, start } = paginados;

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
  const goPrev = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(Math.max(1, curPage - 1), pageSize);
    } else {
      setPage((p) => Math.max(1, p - 1));
    }
  };
  const goNext = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(Math.min(maxPage, curPage + 1), pageSize);
    } else {
      setPage((p) => Math.min(maxPage, p + 1));
    }
  };
  const goLast = () => {
    if (serverSidePagination && onPageChange) {
      onPageChange(maxPage, pageSize);
    } else {
      setPage(maxPage);
    }
  };

  // Cálculo "Mostrando X–Y de Z"
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + rowsPerPage, total);

  // Sincronizar rowsPerPage cuando cambia la prop
  useEffect(() => {
    setRowsPerPage(rowsPerPageProp);
  }, [rowsPerPageProp]);

  return (
    <div className="tabla-creditos">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Orden</th>
              <th>Obra</th>
              <th>Fecha Inicio</th>
              <th>Total Crédito</th>
              <th>Total Abonado</th>
              <th>Saldo Pendiente</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
          {total === 0 ? (
            <tr>
              <td colSpan="10" className="sin-datos">No hay créditos registrados.</td>
            </tr>
          ) : (
            pageData.map((credito) => {
              const estaSeleccionado = creditosSeleccionados?.includes(credito.id);
              return (
              <Fragment key={credito.id}>
                <tr className={`fila-credito ${credito.estado.toLowerCase()} ${estaSeleccionado ? 'credito-seleccionado' : ''}`}> 
                  <td>{credito.id}</td>
                  <td>{credito.cliente?.nombre}</td>
                  <td>{credito.orden?.numero || "-"}</td>
                  <td>{credito.orden?.obra || "-"}</td>
                  <td>{credito.fechaInicio}</td>
                  <td style={{ fontWeight: '600' }}>${credito.totalCredito.toLocaleString()}</td>
                  <td style={{ fontWeight: '600', color: credito.totalAbonado > 0 ? '#27ae60' : '#666' }}>
                    ${(credito.totalAbonado || 0).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: '600', color: credito.saldoPendiente > 0 ? '#e74c3c' : '#27ae60' }}>
                    ${(credito.saldoPendiente || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`estado-badge ${credito.estado.toLowerCase()}`}>{credito.estado}</span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-ver-detalles"
                      onClick={() => toggleExpandido(credito.id)}
                    >
                      {expandido === credito.id ? "Ocultar" : "Ver"}
                    </button>
                    
                    {modoEspecial && credito.estado === "ABIERTO" ? (
                      <button
                        className={creditosSeleccionados?.includes(credito.id) ? "btn-abonar seleccionado" : "btn-abonar"}
                        onClick={() => onSeleccionarCredito(credito.id)}
                        title="Marcar para pagar"
                        style={{ background: creditosSeleccionados?.includes(credito.id) ? '#27ae60' : undefined }}
                      >
                        {creditosSeleccionados?.includes(credito.id) ? "Marcado" : "Marcar"}
                      </button>
                    ) : (
                      credito.estado === "ABIERTO" && (
                        <button
                          className="btn-abonar"
                          onClick={() => onAbrirAbonoModal(credito)}
                          title="Registrar abono"
                        >
                          Abonar
                        </button>
                      )
                    )}
                  </td>
                </tr>
                {expandido === credito.id && (
                  <tr className="detalle-abonos">
                    <td colSpan="10">
                      <h4>Abonos realizados</h4>
                      {credito.abonos && credito.abonos.length > 0 ? (
                        <table className="tabla-abonos">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Método</th>
                              <th>Factura</th>
                              <th>Total</th>
                              <th>Retefuente</th>
                              <th>Saldo post-abono</th>
                            </tr>
                          </thead>
                          <tbody>
                            {credito.abonos.map((a) => (
                              <tr key={a.id}>
                                <td>{a.fecha}</td>
                                <td>{a.metodoPago}</td>
                                <td>{a.factura || "-"}</td>
                                <td>${a.total.toLocaleString()}</td>
                                <td>{a.retencionFuente ? `$${a.retencionFuente.toLocaleString()}` : "-"}</td>
                                <td>${a.saldo.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="sin-abonos">No hay abonos registrados para este crédito.</p>
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

      {/* Panel de totales - Solo en modo especial */}
      {modoEspecial && creditosSeleccionados.length > 0 && (
        <div className="panel-totales-seleccionados">
          <div className="totales-content">
            <div className="totales-item">
              <span className="totales-label">Créditos seleccionados:</span>
              <span className="totales-valor">{creditosSeleccionados.length}</span>
            </div>
            <div className="totales-item totales-destacado">
              <span className="totales-label">Total a pagar:</span>
              <span className="totales-valor-grande">${totalSeleccionado.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de paginación */}
      {total > 0 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Mostrando {showingFrom}–{showingTo} de {total}
          </div>

          <div className="pagination-controls">
            <button className="pg-btn" onClick={goFirst} disabled={!canPrev}>«</button>
            <button className="pg-btn" onClick={goPrev} disabled={!canPrev}>‹</button>
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
      )}
    </div>
  );
};

export default CreditosTable;
