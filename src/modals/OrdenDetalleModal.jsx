// src/modals/OrdenDetalleModal.jsx
import { useEffect, useState } from "react";
import { obtenerOrdenDetalle } from "../services/OrdenesService.js";
import { obtenerFactura } from "../services/FacturasService.js";
import { getBusinessSettings } from "../services/businessSettingsService.js";
import "../styles/IngresoDetalleModal.css";

export default function OrdenDetalleModal({ ordenId, facturaId, isOpen, onClose }) {
  const [orden, setOrden] = useState(null);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ivaRate, setIvaRate] = useState(19);
  const [retefuenteRate, setRetefuenteRate] = useState(2.5);

  useEffect(() => {
    if (isOpen && ordenId) {
      // Cargar configuración de impuestos
      getBusinessSettings().then((settings) => {
        if (settings) {
          setIvaRate(Number(settings.ivaRate) || 19);
          setRetefuenteRate(Number(settings.retefuenteRate) || 2.5);
        }
      });
      loadOrdenDetalle();
      
      // Si hay facturaId, cargar también la factura para usar sus valores monetarios
      if (facturaId) {
        loadFactura();
      }
    } else {
      setOrden(null);
      setFactura(null);
      setError(null);
    }
  }, [isOpen, ordenId, facturaId]);

  const loadOrdenDetalle = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordenData = await obtenerOrdenDetalle(ordenId);
      console.log("[OrdenDetalleModal] Datos recibidos del backend:", {
        id: ordenData?.id,
        numero: ordenData?.numero,
        subtotal: ordenData?.subtotal,
        iva: ordenData?.iva,
        retencionFuente: ordenData?.retencionFuente,
        total: ordenData?.total,
        tieneRetencionFuente: ordenData?.tieneRetencionFuente
      });
      setOrden(ordenData);
    } catch (e) {
      console.error("Error cargando detalles de orden:", e);
      setError(e?.response?.data?.message || "No se pudieron cargar los detalles de la orden.");
    } finally {
      setLoading(false);
    }
  };

  const loadFactura = async () => {
    try {
      const facturaData = await obtenerFactura(facturaId);
      console.log("[OrdenDetalleModal] Datos de factura recibidos:", {
        id: facturaData?.id,
        numeroFactura: facturaData?.numeroFactura,
        subtotal: facturaData?.subtotal,
        iva: facturaData?.iva,
        retencionFuente: facturaData?.retencionFuente,
        total: facturaData?.total,
        // descuentos ya no existe en factura
      });
      setFactura(facturaData);
    } catch (e) {
      console.error("Error cargando detalles de factura:", e);
      // No mostrar error si falla cargar la factura, solo usar valores de la orden
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

  // Valores monetarios: usar los de la factura si están disponibles, sino usar los de la orden
  // IMPORTANTE: Si hay factura, usar sus valores porque son los que realmente se facturaron
  // Estos son datos para facturación electrónica y deben ser exactos del backend
  const subtotal = factura 
    ? ((typeof factura?.subtotal === 'number' && factura.subtotal !== null && factura.subtotal !== undefined) ? factura.subtotal : 0)
    : ((typeof orden?.subtotal === 'number' && orden.subtotal !== null && orden.subtotal !== undefined) ? orden.subtotal : 0);
  
  // Los descuentos ya no existen en las órdenes
  
  const iva = factura
    ? ((typeof factura?.iva === 'number' && factura.iva !== null && factura.iva !== undefined) ? factura.iva : 0)
    : ((typeof orden?.iva === 'number' && orden.iva !== null && orden.iva !== undefined) ? orden.iva : 0);
  
  const retencionFuente = factura
    ? ((typeof factura?.retencionFuente === 'number' && factura.retencionFuente !== null && factura.retencionFuente !== undefined) ? factura.retencionFuente : 0)
    : ((typeof orden?.retencionFuente === 'number' && orden.retencionFuente !== null && orden.retencionFuente !== undefined) ? orden.retencionFuente : 0);
  
  const total = factura
    ? ((typeof factura?.total === 'number' && factura.total !== null && factura.total !== undefined) ? factura.total : 0)
    : ((typeof orden?.total === 'number' && orden.total !== null && orden.total !== undefined) ? orden.total : 0);
  
  // Para tieneRetencionFuente, usar el de la orden (la factura no tiene este campo boolean)
  const tieneRetencionFuente = orden?.tieneRetencionFuente || false;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container modal-tall ingreso-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            {factura 
              ? `Detalles de la Factura #${factura.numeroFactura || factura.numero || factura.id || "—"} (Orden #${orden?.numero || orden?.id || "—"})`
              : `Detalles de la Orden #${orden?.numero || orden?.id || "—"}`
            }
          </h2>
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
              {tieneRetencionFuente && (
                <div>
                  <strong>Retención en la Fuente:</strong> Sí ({fmtCOP(retencionFuente)})
                </div>
              )}
              {factura && (
                <div>
                  <strong>N° Factura:</strong> {factura.numeroFactura || factura.numero || "-"}
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
                <div>
                  <strong>IVA:</strong> {fmtCOP(iva)}
                </div>
                <div>
                  <strong>Retención en la Fuente:</strong> {fmtCOP(retencionFuente)}
                </div>
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


