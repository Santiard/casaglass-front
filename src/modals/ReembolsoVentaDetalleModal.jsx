// src/modals/ReembolsoVentaDetalleModal.jsx
import { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import ReembolsosVentaService from "../services/ReembolsosVentaService.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ReembolsoVentaDetalleModal({
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
      const data = await ReembolsosVentaService.obtenerReembolso(reembolsoId);
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

  const getFormaReembolso = (forma) => {
    const formas = {
      EFECTIVO: "EFECTIVO",
      TRANSFERENCIA: "TRANSFERENCIA",
      NOTA_CREDITO: "NOTA CRÉDITO",
      AJUSTE_CREDITO: "AJUSTE CRÉDITO"
    };
    return formas[forma] || forma || "-";
  };

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
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container modal-wide" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2>Detalles de la Devolución de Venta</h2>

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
                  <p><strong>Forma de Devolución:</strong> {getFormaReembolso(reembolso.formaReembolso)}</p>
                  <p><strong>Motivo:</strong> {reembolso.motivo || "-"}</p>
                </div>

                <h3>Orden Original</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  {reembolso.ordenOriginal ? (
                    <>
                      <p><strong>N° Orden:</strong> #{reembolso.ordenOriginal.numero || reembolso.ordenOriginal.id}</p>
                      <p><strong>Fecha:</strong> {fmtFecha(reembolso.ordenOriginal.fecha)}</p>
                      <p><strong>Obra:</strong> {reembolso.ordenOriginal.obra || "-"}</p>
                      <p><strong>Total Orden:</strong> {fmtCOP(reembolso.ordenOriginal.total || reembolso.ordenOriginal.subtotal)}</p>
                    </>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>

                <h3>Cliente</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  {reembolso.cliente ? (
                    <>
                      <p><strong>Nombre:</strong> {reembolso.cliente.nombre || "-"}</p>
                      <p><strong>NIT:</strong> {reembolso.cliente.nit || "-"}</p>
                      <p><strong>Dirección:</strong> {reembolso.cliente.direccion || "-"}</p>
                      <p><strong>Teléfono:</strong> {reembolso.cliente.telefono || "-"}</p>
                    </>
                  ) : (
                    <p>No disponible</p>
                  )}
                </div>
              </div>

              <div className="form-column">
                <h3>Resumen Financiero</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  <p><strong>Subtotal:</strong> {fmtCOP(reembolso.subtotal || 0)}</p>
                  <p><strong>Descuentos:</strong> {fmtCOP(reembolso.descuentos || 0)}</p>
                  <p><strong style={{ fontSize: "1.2em" }}>Total Devolución:</strong> {fmtCOP(reembolso.totalReembolso || 0)}</p>
                </div>

                <h3>Sede</h3>
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  {reembolso.sede ? (
                    <>
                      <p><strong>Nombre:</strong> {reembolso.sede.nombre || "-"}</p>
                      <p><strong>Dirección:</strong> {reembolso.sede.direccion || "-"}</p>
                      <p><strong>Ciudad:</strong> {reembolso.sede.ciudad || "-"}</p>
                    </>
                  ) : (
                    <p>No disponible</p>
                  )}
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
                      <th>Precio Unitario</th>
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
                        <td>{det.ordenItemOriginal?.cantidad || "-"}</td>
                        <td><strong>{det.cantidad}</strong></td>
                        <td>{fmtCOP(det.precioUnitario)}</td>
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

