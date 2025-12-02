import React, { useState, useMemo, Fragment, useEffect } from "react";
import "../styles/Creditos.css";
import "../styles/Table.css";

const CreditosTable = ({ creditos, onAbrirAbonoModal, rowsPerPage: rowsPerPageProp = 10 }) => {
  const [expandido, setExpandido] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageProp);

  const toggleExpandido = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  // Paginación
  const paginados = useMemo(() => {
    const total = creditos.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = creditos.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage, start };
  }, [creditos, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage, start } = paginados;

  // Funciones de paginación
  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(maxPage, p + 1));
  const goLast = () => setPage(maxPage);

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
              <th>Fecha Inicio</th>
              <th>Fecha Cierre</th>
              <th>Total</th>
              <th>Abonado</th>
              <th>Saldo</th>
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
            pageData.map((credito) => (
              <Fragment key={credito.id}>
                <tr className={`fila-credito ${credito.estado.toLowerCase()}`}>
                  <td>{credito.id}</td>
                  <td>{credito.cliente?.nombre}</td>
                  <td>{credito.orden?.numero || "-"}</td>
                  <td>{credito.fechaInicio}</td>
                  <td>{credito.fechaCierre || "-"}</td>
                  <td>${credito.totalCredito.toLocaleString()}</td>
                  <td>${credito.totalAbonado.toLocaleString()}</td>
                  <td>${credito.saldoPendiente.toLocaleString()}</td>
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
                    
                    {credito.estado === "ABIERTO" && (
                      <button 
                        className="btn-abonar"
                        onClick={() => onAbrirAbonoModal(credito)}
                        title="Registrar abono"
                      >
                        Abonar
                      </button>
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
            ))
          )}
        </tbody>
        </table>
      </div>

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
                <button key={p} className={`pg-btn ${p === curPage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
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
