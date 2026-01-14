import React, { useState } from "react";
import "../styles/Table.css";

export default function EntregasEspecialesTable({ 
  entregas, 
  loading, 
  onVerDetalle 
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Cargando historial de entregas...</p>
      </div>
    );
  }

  if (!entregas || entregas.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>No hay entregas especiales registradas.</p>
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
    <div className="table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha Registro</th>
              <th>Ejecutado Por</th>
              <th>Créditos Cerrados</th>
              <th>Total Monto</th>
              <th>Total Retención</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((entrega) => (
              <tr key={entrega.id}>
                <td>{entrega.id}</td>
                <td>
                  {new Date(entrega.fechaRegistro).toLocaleString("es-CO", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </td>
                <td>{entrega.ejecutadoPor || "SISTEMA"}</td>
                <td style={{ textAlign: "center", fontWeight: "600" }}>
                  {entrega.totalCreditos}
                </td>
                <td style={{ textAlign: "right", fontWeight: "600" }}>
                  ${(entrega.totalMontoCredito || 0).toLocaleString("es-CO")}
                </td>
                <td style={{ textAlign: "right", color: "#e74c3c" }}>
                  ${(entrega.totalRetencion || 0).toLocaleString("es-CO")}
                </td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entrega.observaciones || "-"}
                </td>
                <td>
                  <button
                    onClick={() => onVerDetalle(entrega)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#3498db",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "500"
                    }}
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-controls" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginTop: "1rem",
          padding: "0.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#666" }}>Filas por página:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "0.3rem 0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem"
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#666" }}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "0.3rem 0.7rem",
                background: currentPage === 1 ? "#e0e0e0" : "#3498db",
                color: currentPage === 1 ? "#999" : "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer"
              }}
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "0.3rem 0.7rem",
                background: currentPage === totalPages ? "#e0e0e0" : "#3498db",
                color: currentPage === totalPages ? "#999" : "white",
                border: "none",
                borderRadius: "4px",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer"
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
