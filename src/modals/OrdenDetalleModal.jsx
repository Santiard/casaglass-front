// src/modals/OrdenDetalleModal.jsx
import { useEffect, useState } from "react";
import { obtenerOrdenDetalle } from "../services/OrdenesService.js";
import "../styles/IngresoDetalleModal.css";

export default function OrdenDetalleModal({ ordenId, isOpen, onClose }) {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ordenId) {
      loadOrdenDetalle();
    } else {
      setOrden(null);
      setError(null);
    }
  }, [isOpen, ordenId]);

  const loadOrdenDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordenData = await obtenerOrdenDetalle(ordenId);
      setOrden(ordenData);
    } catch (e) {
      console.error("Error cargando detalles de orden:", e);
      setError(e?.response?.data?.message || "No se pudieron cargar los detalles de la orden.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : n ?? "-";

  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d)
      ? "-"
      : d.toLocaleString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
  };

  const detalles = Array.isArray(orden?.items) ? orden.items : [];

  // Valores monetarios de la orden
  const subtotal = (typeof orden?.subtotal === 'number' && orden.subtotal !== null && orden.subtotal !== undefined) ? orden.subtotal : 0;
  const descuentos = (typeof orden?.descuentos === 'number' && orden.descuentos !== null && orden.descuentos !== undefined) ? orden.descuentos : 0;
  const iva = (typeof orden?.iva === 'number' && orden.iva !== null && orden.iva !== undefined) ? orden.iva : 0;
  const retencionFuente = (typeof orden?.retencionFuente === 'number' && orden.retencionFuente !== null && orden.retencionFuente !== undefined) ? orden.retencionFuente : 0;
  const total = (typeof orden?.total === 'number' && orden.total !== null && orden.total !== undefined) ? orden.total : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-tall ingreso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Detalles de la Orden #{orden?.numero || orden?.id || "—"}</h2>
          <button className="btn" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        {/* Contenido principal */}
        {loading && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Cargando detalles de la orden...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#dc3545" }}>
            <p>{error}</p>
            <button className="btn" onClick={loadOrdenDetalle} style={{ marginTop: "1rem" }}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && orden && (
          <section className="ingreso-panel">
            {/* Información general */}
            <div className="ingreso-panel__meta">
              <div>
                <strong>N° Orden:</strong> {orden.numero || orden.id || "-"}
              </div>
              <div>
                <strong>Fecha:</strong> {fmtFecha(orden.fecha)}
              </div>
              <div>
                <strong>Cliente:</strong> {orden.cliente?.nombre ?? "-"}
              </div>
              <div>
                <strong>NIT:</strong> {orden.cliente?.nit ?? "-"}
              </div>
              <div>
                <strong>Obra:</strong> {orden.obra ?? "-"}
              </div>
              <div>
                <strong>Sede:</strong> {orden.sede?.nombre ?? "-"}
              </div>
              <div>
                <strong>Estado:</strong>{" "}
                <span className="status" style={{
                  backgroundColor: orden.estado === 'ACTIVA' ? '#d4edda' : orden.estado === 'COMPLETADA' ? '#cce5ff' : '#f8d7da',
                  color: orden.estado === 'ACTIVA' ? '#155724' : orden.estado === 'COMPLETADA' ? '#004085' : '#721c24',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}>
                  {orden.estado || "—"}
                </span>
              </div>
              {orden.credito && (
                <div>
                  <strong>Venta a Crédito:</strong> Sí
                </div>
              )}
              {orden.tieneRetencionFuente && (
                <div>
                  <strong>Retención en la Fuente:</strong> Sí ({retencionFuente > 0 ? fmtCOP(retencionFuente) : "—"})
                </div>
              )}
            </div>

            {/* Tabla de detalles de productos */}
            <div className="ingreso-detalle-scroll">
              <table className="subtable">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Total Línea</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        Sin ítems
                      </td>
                    </tr>
                  ) : (
                    detalles.map((d, i) => (
                      <tr key={d.id || `item-${i}`}>
                        <td>{d.producto?.codigo ?? "-"}</td>
                        <td>{d.producto?.nombre ?? "-"}</td>
                        <td>{d.descripcion ?? "-"}</td>
                        <td style={{ textAlign: "center" }}>{d.cantidad ?? "-"}</td>
                        <td>{fmtCOP(Number(d.precioUnitario))}</td>
                        <td>{fmtCOP(Number(d.totalLinea))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "0.375rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.95rem" }}>
                <div>
                  <strong>Subtotal (sin IVA):</strong> {fmtCOP(subtotal)}
                </div>
                {descuentos > 0 && (
                  <div>
                    <strong>Descuentos:</strong> {fmtCOP(descuentos)}
                  </div>
                )}
                <div>
                  <strong>IVA (19%):</strong> {fmtCOP(iva)}
                </div>
                {retencionFuente > 0 && (
                  <div>
                    <strong>Retención en la Fuente:</strong> {fmtCOP(retencionFuente)}
                  </div>
                )}
                <div style={{ fontWeight: "bold", fontSize: "1.1rem", gridColumn: "1 / -1", paddingTop: "0.5rem", borderTop: "2px solid #ddd" }}>
                  <strong>Total Facturado:</strong> {fmtCOP(total)}
                </div>
                {retencionFuente > 0 && (
                  <div style={{ fontSize: "0.9rem", color: "#666", gridColumn: "1 / -1" }}>
                    <strong>Valor a Pagar:</strong> {fmtCOP(total - retencionFuente)}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

