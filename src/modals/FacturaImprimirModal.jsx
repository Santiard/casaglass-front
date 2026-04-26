import { useEffect, useState } from "react";
import "../styles/FacturaImprimirModal.css";
import { obtenerFactura } from "../services/FacturasService.js";
import html2pdf from "html2pdf.js";
import {
  buildFacturaImpresionPrintHtmlDocument,
  mapFacturaCompletaToForm,
  mapFacturaListRowToForm,
  resolverColorItem,
  resolverNombreImpresion,
  resolverTipoItem,
  sinIva,
} from "../lib/facturaImpresionUtils.js";

export default function FacturaImprimirModal({ factura, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !factura?.id) {
      setForm(null);
      return;
    }

    const cargarFacturaCompleta = async () => {
      setLoading(true);
      try {
        const facturaCompleta = await obtenerFactura(factura.id);
        setForm(mapFacturaCompletaToForm(facturaCompleta));
      } catch (error) {
        console.error("Error cargando factura completa:", error);
        setForm(mapFacturaListRowToForm(factura));
      } finally {
        setLoading(false);
      }
    };

    cargarFacturaCompleta();
  }, [factura, isOpen]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="factura-imprimir-modal-overlay">
        <div className="factura-imprimir-modal-container">
          <div className="factura-imprimir-modal-header">
            <h2>Cargando factura...</h2>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Cargando datos de la factura...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const subtotal = form.subtotal || 0;
  const iva = form.iva || 0;
  const retencionFuente = form.retencionFuente || 0;
  const retencionIca = form.retencionIca || 0;
  const totalFactura = form.total || 0;

  const tieneRetencionIca = form.orden?.tieneRetencionIca || false;
  const porcentajeIca =
    form.orden?.porcentajeIca !== undefined && form.orden?.porcentajeIca !== null
      ? Number(form.orden.porcentajeIca)
      : null;

  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const crearVentanaImpresion = () => {
    const contenido = document.getElementById("printable-factura-content").innerHTML;
    const ventana = window.open("", "", "width=800,height=600");
    ventana.document.write(buildFacturaImpresionPrintHtmlDocument(form.numeroFactura, contenido));
    ventana.document.close();
    return ventana;
  };

  const handleImprimir = () => {
    const ventana = crearVentanaImpresion();
    ventana.onload = () => {
      ventana.print();
    };
  };

  const handleGuardarPDF = () => {
    const elemento = document.getElementById("printable-factura-content");

    const opciones = {
      margin: 10,
      filename: `Factura-${form.numeroFactura}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: "letter",
        orientation: "portrait",
      },
    };

    html2pdf().set(opciones).from(elemento).save();
  };

  return (
    <>
      <div
        className="factura-imprimir-modal-overlay"
        onClick={onClose}
        style={{ overflowY: "auto", maxHeight: "100vh" }}
      >
        <div
          className="factura-imprimir-modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
        >
          <div className="factura-imprimir-modal-header">
            <h2>Imprimir Factura #{form.numeroFactura}</h2>
            <div className="factura-imprimir-modal-actions">
              <button type="button" onClick={handleGuardarPDF} className="factura-imprimir-btn-guardar">
                Guardar como PDF
              </button>
              <button type="button" onClick={handleImprimir} className="factura-imprimir-btn-imprimir">
                Imprimir
              </button>
              <button type="button" onClick={onClose} className="factura-imprimir-btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          <div id="printable-factura-content" className="factura-imprimir-printable-content">
            <div className="factura-imprimir-header">
              <h1>ALUMINIOS CASAGLASS S.A.S</h1>
              <h2>Factura #{form.numeroFactura}</h2>
              <p>Fecha: {fmtFecha(form.fecha)}</p>
            </div>

            <div className="factura-imprimir-info">
              <div className="factura-imprimir-info-section">
                <h3>Cliente</h3>
                <p>
                  <strong>{form.cliente?.nombre || "-"}</strong>
                </p>
                <p>NIT: {form.cliente?.nit || "-"}</p>
                {form.cliente?.direccion && <p>Dirección: {form.cliente.direccion}</p>}
                {form.cliente?.ciudad && <p>Ciudad: {form.cliente.ciudad}</p>}
                {form.cliente?.correo && <p>Correo: {form.cliente.correo}</p>}
              </div>

              <div className="factura-imprimir-info-section">
                <h3>Información de Factura</h3>
                {form.orden?.numero && <p>Orden: #{form.orden.numero}</p>}
                {form.orden?.obra && <p>Obra: {form.orden.obra}</p>}
                <p>Forma de Pago: {form.formaPago}</p>
                <p>Estado: {form.estado}</p>
              </div>
            </div>

            <table className="factura-imprimir-table">
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Color</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th className="text-right">Valor Unitario (sin IVA)</th>
                  <th className="text-right">Valor Unitario (con IVA)</th>
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Sin productos
                    </td>
                  </tr>
                ) : (
                  form.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="text-center">{item.cantidad || 0}</td>
                      <td>{resolverColorItem(item)}</td>
                      <td>{resolverTipoItem(item)}</td>
                      <td>{resolverNombreImpresion(item)}</td>
                      <td className="text-right">${sinIva(item.precioUnitario).toLocaleString("es-CO")}</td>
                      <td className="text-right">${Number(item.precioUnitario || 0).toLocaleString("es-CO")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="factura-imprimir-total">
              <p>
                Subtotal: $
                {subtotal.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p>
                IVA (19%): $
                {iva.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {tieneRetencionIca && retencionIca > 0 && (
                <p>
                  Retención ICA{porcentajeIca ? ` (${porcentajeIca}%)` : ""}: $
                  {retencionIca.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              <p>
                Retención en la Fuente: $
                {retencionFuente.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                <strong>
                  TOTAL: $
                  {totalFactura.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </p>
              {(retencionFuente > 0 || retencionIca > 0) && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                  Valor a pagar: $
                  {(totalFactura - retencionFuente - retencionIca).toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>

            {form.observaciones && (
              <div style={{ marginTop: "15px", padding: "8px", borderTop: "1px solid #e0e0e0" }}>
                <p style={{ fontSize: "0.75rem", color: "#333", margin: 0 }}>
                  <strong>Observaciones:</strong> {form.observaciones}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
