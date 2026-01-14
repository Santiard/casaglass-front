import React, { useState } from "react";
import "../styles/Table.css";
import "../styles/Creditos.css";

export default function EntregasEspecialesTable({ 
  entregas, 
  loading, 
  onVerDetalle 
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  if (loading) {
    return (
      <div className="loading-message" style={{ padding: "2rem", textAlign: "center" }}>
        <p>Cargando historial de entregas...</p>
      </div>
    );
  }

  if (!entregas || entregas.length === 0) {
    return (
      <div className="tabla-creditos" style={{ padding: "3rem" }}>
        <p className="sin-datos">
          No hay entregas especiales registradas.
        </p>
      </div>
    );
  }

  // Paginación
  const totalPages = Math.ceil(entregas.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = entregas.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="tabla-creditos">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: "80px", textAlign: "center" }}>#</th>
              <th style={{ minWidth: "200px" }}>Fecha Registro</th>
              <th style={{ minWidth: "200px" }}>Ejecutado Por</th>
              <th style={{ width: "150px", textAlign: "center" }}>Créditos Cerrados</th>
              <th style={{ minWidth: "180px", textAlign: "right" }}>Total Monto</th>
              <th style={{ minWidth: "180px", textAlign: "right" }}>Total Retención</th>
              <th style={{ minWidth: "250px" }}>Observaciones</th>
              <th style={{ width: "150px", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((entrega) => (
              <tr key={entrega.id}>
                <td style={{ textAlign: "center", fontWeight: "600", color: "#1e2753" }}>{entrega.id}</td>
                <td>
                  {new Date(entrega.fechaRegistro).toLocaleString("es-CO", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </td>
                <td style={{ fontWeight: "500" }}>{entrega.ejecutadoPor || "SISTEMA"}</td>
                <td style={{ textAlign: "center", fontWeight: "700", color: "#27ae60", fontSize: "1.05rem" }}>
                  {entrega.totalCreditos}
                </td>
                <td style={{ textAlign: "right", fontWeight: "600", fontSize: "1rem" }}>
                  ${(entrega.totalMontoCredito || 0).toLocaleString("es-CO")}
                </td>
                <td style={{ textAlign: "right", color: "#e74c3c", fontWeight: "600", fontSize: "1rem" }}>
                  ${(entrega.totalRetencion || 0).toLocaleString("es-CO")}
                </td>
                <td style={{ 
                  maxWidth: "300px", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap",
                  color: "#555"
                }}>
                  {entrega.observaciones || "-"}
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => onVerDetalle(entrega)}
                    className="btn-ver-detalle"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-entregas">
          <div className="pagination-entregas-left">
            <label>Filas por página:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="pagination-entregas-right">
            <span className="pagination-entregas-counter">
              Mostrando {startIndex + 1}-{Math.min(endIndex, entregas.length)} de {entregas.length}
            </span>
            <div className="pagination-entregas-buttons">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
