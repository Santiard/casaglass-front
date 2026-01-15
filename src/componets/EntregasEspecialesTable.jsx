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

  // Función para imprimir desprendible de entrega especial
  const handlePrintDesprendible = async entrega => {
    if (!entrega) return;
    let detalles = entrega.detalles || [];
    // Si no hay detalles, intentar obtenerlos del backend
    if (!detalles.length && entrega.id) {
      try {
        const resp = await fetch(`/api/creditos/cliente-especial/entregas/${entrega.id}`);
        if (resp.ok) {
          const data = await resp.json();
          detalles = data.detalles || [];
        }
      } catch (e) {}
    }
    let html = `<html><head><title>Desprendible Entrega Especial</title>`;
    html += `<style>body{font-family:Roboto,sans-serif;color:#222;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:6px;color:#222;} th{background:#e9ecef;color:#222;} .resumen{margin-bottom:1rem;} .titulo{font-size:1.2rem;font-weight:600;margin-bottom:1rem;} .total{font-weight:700;}</style>`;
    html += `</head><body>`;
    html += `<div class='resumen'>`;
    html += `<div class='titulo'>Desprendible Entrega Especial #${entrega.id}</div>`;
    html += `<div><strong>Fecha de Registro:</strong> ${new Date(entrega.fechaRegistro).toLocaleString("es-CO")}</div>`;
    html += `<div><strong>Total Créditos Cerrados:</strong> <span class='total'>${entrega.totalCreditos}</span></div>`;
    html += `<div><strong>Monto Total:</strong> <span class='total'>${(entrega.totalMontoCredito || 0).toLocaleString("es-CO")}</span></div>`;
    if (entrega.observaciones) {
      html += `<div style='margin-top:0.5rem'><strong>Observaciones:</strong> ${entrega.observaciones}</div>`;
    }
    html += `</div>`;
    html += `<table><thead><tr>`;
    html += `<th>Crédito ID</th><th>N° Orden</th><th>Obra</th><th>Fecha Crédito</th><th>Total Crédito</th>`;
    html += `</tr></thead><tbody>`;
    if (detalles.length > 0) {
      detalles.forEach(item => {
        html += `<tr>`;
        html += `<td>${item.creditoId}</td>`;
        html += `<td>${item.numeroOrden}</td>`;
        html += `<td>${item.obra || '-'}</td>`;
        html += `<td>${new Date(item.fechaCredito).toLocaleDateString("es-CO")}</td>`;
        html += `<td style='text-align:right'>${(item.totalCredito || 0).toLocaleString("es-CO")}</td>`;
        html += `</tr>`;
      });
    } else {
      html += `<tr><td colspan='5' style='padding:2rem;text-align:center;color:#999'>No hay detalles disponibles</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `</body></html>`;
    const printWindow = window.open('', '', 'height=700,width=900');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };


  return (
    <div className="tabla-creditos">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: "80px", textAlign: "center" }}>#</th>
              <th style={{ minWidth: "200px" }}>Fecha Registro</th>
              <th style={{ width: "150px", textAlign: "center" }}>Créditos Cerrados</th>
              <th style={{ minWidth: "180px", textAlign: "right" }}>Total Monto</th>
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
                <td style={{ textAlign: "center", fontWeight: "700", color: "#27ae60", fontSize: "1.05rem" }}>
                  {entrega.totalCreditos}
                </td>
                <td style={{ textAlign: "right", fontWeight: "600", fontSize: "1rem" }}>
                  ${(entrega.totalMontoCredito || 0).toLocaleString("es-CO")}
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
                <td style={{ textAlign: "center", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                  <button
                    onClick={() => onVerDetalle(entrega)}
                    className="btn-ver-detalle"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handlePrintDesprendible(entrega)}
                    className="btn-print-desprendible"
                    style={{
                      background: "#1e2753",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.4rem 1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "0.95rem"
                    }}
                  >
                    Imprimir
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
