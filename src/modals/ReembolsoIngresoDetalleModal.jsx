// src/modals/ReembolsoIngresoDetalleModal.jsx
import { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import ReembolsosIngresoService from "../services/ReembolsosIngresoService.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ReembolsoIngresoDetalleModal({
  isOpen,
  onClose,
  reembolsoId,
}) {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [reembolso, setReembolso] = useState(null);

  useEffect(() => {
    if (!isOpen || !reembolsoId) {
      setReembolso(null);
      return;
    }

    cargarReembolso();
  }, [isOpen, reembolsoId]);

  const cargarReembolso = async () => {
    setLoading(true);
    try {
      const data = await ReembolsosIngresoService.obtenerReembolso(reembolsoId);
      setReembolso(data);
    } catch (error) {
      console.error("Error cargando reembolso:", error);
      showError("No se pudo cargar la devolución.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const getEstadoBadge = (estado, procesado) => {
    if (estado === "ANULADO") {
      return <span className="estado-badge anulada">ANULADO</span>;
    }
    if (procesado || estado === "PROCESADO") {
      return <span className="estado-badge procesado">PROCESADO</span>;
    }
    return <span className="estado-badge pendiente">PENDIENTE</span>;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2>Detalles de la Devolución de Ingreso</h2>

        {loading && <p>Cargando...</p>}

        {!loading && reembolso && (
          <div className="form">
            <div className="form-two-columns">
              <div className="form-column">
                <h3>Información General</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  <p><strong>ID:</strong> {reembolso.id}</p>
                  <p><strong>Fecha:</strong> {fmtFecha(reembolso.fecha)}</p>
                  <p><strong>Estado:</strong> {getEstadoBadge(reembolso.estado, reembolso.procesado)}</p>
                  <p><strong>N° Factura Devolución:</strong> {reembolso.numeroFacturaDevolucion || "-"}</p>
                  <p><strong>Motivo:</strong> {reembolso.motivo || "-"}</p>
                </div>

                <h3>Ingreso Original</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  {reembolso.ingresoOriginal ? (
                    <>
                      <p><strong>ID:</strong> #{reembolso.ingresoOriginal.id}</p>
                      <p><strong>Fecha:</strong> {fmtFecha(reembolso.ingresoOriginal.fecha)}</p>
                      <p><strong>N° Factura:</strong> {reembolso.ingresoOriginal.numeroFactura || "-"}</p>
                    </>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>

                <h3>Proveedor</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  {reembolso.proveedor ? (
                    <>
                      <p><strong>Nombre:</strong> {reembolso.proveedor.nombre || "-"}</p>
                    </>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>
              </div>

              <div className="form-column">
                <h3>Resumen Financiero</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  <p><strong style={{ fontSize: "1.2em" }}>Total Devolución:</strong> {fmtCOP(reembolso.totalReembolso || 0)}</p>
                </div>
              </div>
            </div>

            {reembolso.detalles && reembolso.detalles.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h3>Productos Devueltos</h3>
                <table className="table" style={{ width: "100%", marginTop: "0.5rem" }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad Original</th>
                      <th>Cantidad Devuelta</th>
                      <th>Costo Unitario</th>
                      <th>Total Línea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reembolso.detalles.map((det, index) => (
                      <tr key={det.id || index}>
                        <td>
                          <strong>{det.producto?.nombre || "-"}</strong>
                          <br />
                          <small>{det.producto?.codigo || ""}</small>
                        </td>
                        <td>{det.ingresoDetalleOriginal?.cantidad || "-"}</td>
                        <td><strong>{det.cantidad}</strong></td>
                        <td>{fmtCOP(det.costoUnitario)}</td>
                        <td><strong>{fmtCOP(det.totalLinea)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                className="btn-cancelar"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

