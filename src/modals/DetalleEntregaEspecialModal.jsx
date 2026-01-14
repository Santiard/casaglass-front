import React, { useState, useEffect } from "react";
import "../styles/Modal.css";
import { obtenerDetalleEntregaEspecial } from "../services/EstadoCuentaService";

export default function DetalleEntregaEspecialModal({ isOpen, onClose, entregaId }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && entregaId) {
      cargarDetalle();
    }
  }, [isOpen, entregaId]);

  const cargarDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerDetalleEntregaEspecial(entregaId);
      setDetalle(data);
    } catch (err) {
      setError(err.message || "Error al cargar el detalle");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDetalle(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "900px", 
          width: "90vw",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div style={{
          padding: "1.5rem",
          background: "#1e2753",
          color: "white",
          borderRadius: "12px 12px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "600" }}>Detalle de Entrega Especial #{entregaId}</h2>
          <button 
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "2rem",
              cursor: "pointer",
              padding: "0",
              lineHeight: "1",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={(e) => e.target.style.background = "none"}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: "1.5rem",
          overflowY: "auto",
          flex: 1
        }}>
          {loading && (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>Cargando detalle...</p>
            </div>
          )}

          {error && (
            <div style={{ 
              padding: "1rem", 
              background: "#fee", 
              border: "1px solid #fcc",
              borderRadius: "6px",
              color: "#c33"
            }}>
              {error}
            </div>
          )}

          {detalle && !loading && (
            <>
              {/* Resumen general */}
              <div style={{ 
                background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1.5rem"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                  <div>
                    <strong>Fecha de Registro:</strong>
                    <p>{new Date(detalle.fechaRegistro).toLocaleString("es-CO")}</p>
                  </div>
                  <div>
                    <strong>Ejecutado Por:</strong>
                    <p>{detalle.ejecutadoPor || "SISTEMA"}</p>
                  </div>
                  <div>
                    <strong>Total Créditos Cerrados:</strong>
                    <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#27ae60" }}>
                      {detalle.totalCreditos}
                    </p>
                  </div>
                  <div>
                    <strong>Monto Total:</strong>
                    <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#27ae60" }}>
                      ${(detalle.totalMontoCredito || 0).toLocaleString("es-CO")}
                    </p>
                  </div>
                  {detalle.totalRetencion > 0 && (
                    <div>
                      <strong>Total Retención:</strong>
                      <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#e74c3c" }}>
                        ${(detalle.totalRetencion || 0).toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}
                </div>
                {detalle.observaciones && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #dee2e6" }}>
                    <strong>Observaciones:</strong>
                    <p style={{ marginTop: "0.5rem", color: "#495057" }}>{detalle.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Tabla de créditos */}
              <div>
                <h3 style={{ marginBottom: "1rem", color: "#1e2753" }}>
                  Créditos Cerrados ({detalle.detalles?.length || 0})
                </h3>
                <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "collapse",
                    fontSize: "0.9rem"
                  }}>
                    <thead style={{ 
                      position: "sticky", 
                      top: 0, 
                      background: "#1e2753", 
                      color: "white",
                      zIndex: 1
                    }}>
                      <tr>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>Crédito ID</th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>N° Orden</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", minWidth: "180px" }}>Obra</th>
                        <th style={{ padding: "0.75rem", textAlign: "left" }}>Fecha Crédito</th>
                        <th style={{ padding: "0.75rem", textAlign: "right" }}>Total Crédito</th>
                        <th style={{ padding: "0.75rem", textAlign: "right" }}>Saldo Anterior</th>
                        <th style={{ padding: "0.75rem", textAlign: "right" }}>Retención</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.detalles && detalle.detalles.length > 0 ? (
                        detalle.detalles.map((item, index) => (
                          <tr 
                            key={item.creditoId}
                            style={{ 
                              borderBottom: "1px solid #e9ecef",
                              background: index % 2 === 0 ? "#fff" : "#f8f9fa"
                            }}
                          >
                            <td style={{ padding: "0.75rem" }}>{item.creditoId}</td>
                            <td style={{ padding: "0.75rem" }}>{item.numeroOrden}</td>
                            <td style={{ padding: "0.75rem", fontWeight: "500", color: "#1e2753" }}>
                              {item.obra || "-"}
                            </td>
                            <td style={{ padding: "0.75rem" }}>
                              {new Date(item.fechaCredito).toLocaleDateString("es-CO")}
                            </td>
                            <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "600" }}>
                              ${(item.totalCredito || 0).toLocaleString("es-CO")}
                            </td>
                            <td style={{ padding: "0.75rem", textAlign: "right", color: "#e67e22" }}>
                              ${(item.saldoAnterior || 0).toLocaleString("es-CO")}
                            </td>
                            <td style={{ padding: "0.75rem", textAlign: "right", color: "#e74c3c" }}>
                              ${(item.retencionFuente || 0).toLocaleString("es-CO")}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                            No hay detalles disponibles
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: "1rem 1.5rem",
          background: "#f8f9fa",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem"
        }}>
          <button 
            onClick={handleClose}
            style={{
              padding: "0.625rem 1.5rem",
              background: "white",
              color: "#1e2753",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
              fontFamily: "'Roboto', sans-serif"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f3f4f6";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
