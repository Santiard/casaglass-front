import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/FacturaImprimirModal.css";
import { obtenerFactura } from "../services/FacturasService.js";
import html2pdf from "html2pdf.js";
import {
  buildFacturaImpresionPrintHtmlDocument,
  IVA_FACTOR,
  mapFacturaCompletaToForm,
  mapFacturaListRowToForm,
  ordenItemsFromOrden,
  resolverColorItem,
  resolverNombreImpresion,
  resolverTipoItem,
  sinIva,
} from "../lib/facturaImpresionUtils.js";

function precioUnitarioDesdeItem(item) {
  const n = Number(item?.precioUnitario ?? item?.precio ?? item?.valorUnitario ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Una sola tabla de factura: la columna de precio con IVA es un campo editable (solo impresión/PDF).
 */
export default function FacturaImpresionAjustadaModal({ factura, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filasPrecio, setFilasPrecio] = useState([]);

  useEffect(() => {
    if (!isOpen || !factura?.id) {
      setForm(null);
      setFilasPrecio([]);
      return;
    }

    const cargar = async () => {
      setLoading(true);
      try {
        const facturaCompleta = await obtenerFactura(factura.id);
        const base = mapFacturaCompletaToForm(facturaCompleta);
        const items = base.items?.length ? base.items : ordenItemsFromOrden(base.orden || {});
        setForm({ ...base, items });
        setFilasPrecio(
          items.map((item, i) => {
            const pu = precioUnitarioDesdeItem(item);
            return {
              key: item.id != null ? String(item.id) : `idx-${i}`,
              item,
              precioOriginal: pu,
              precioImpresion: pu,
            };
          })
        );
      } catch (e) {
        console.error("Error cargando factura para ajuste de impresión:", e);
        const base = mapFacturaListRowToForm(factura);
        const items = base.items?.length ? base.items : ordenItemsFromOrden(base.orden || {});
        setForm({ ...base, items });
        setFilasPrecio(
          items.map((item, i) => {
            const pu = precioUnitarioDesdeItem(item);
            return {
              key: item.id != null ? String(item.id) : `idx-${i}`,
              item,
              precioOriginal: pu,
              precioImpresion: pu,
            };
          })
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [factura, isOpen]);

  const totalesImpresion = useMemo(() => {
    const totalConIvaLineas = filasPrecio.reduce((sum, f) => {
      const c = Number(f.item.cantidad ?? 0);
      const pu = Number(f.precioImpresion ?? 0);
      return sum + c * pu;
    }, 0);
    const subtotalSinIva = totalConIvaLineas / IVA_FACTOR;
    const iva = totalConIvaLineas - subtotalSinIva;
    return { totalConIvaLineas, subtotalSinIva, iva };
  }, [filasPrecio]);

  const retencionFuente = form?.retencionFuente ?? 0;
  const retencionIca = form?.retencionIca ?? 0;
  const totalFacturaImpresion = totalesImpresion.totalConIvaLineas;
  const valorAPagarImpresion = totalFacturaImpresion - retencionFuente - retencionIca;

  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const tieneRetencionIca = form?.orden?.tieneRetencionIca || false;
  const porcentajeIca =
    form?.orden?.porcentajeIca !== undefined && form?.orden?.porcentajeIca !== null
      ? Number(form.orden.porcentajeIca)
      : null;

  const actualizarPrecio = useCallback((key, valorStr) => {
    const raw = String(valorStr).replace(/\s/g, "").replace(",", ".");
    const n = Number(raw);
    const precio = Number.isFinite(n) && n >= 0 ? n : 0;
    setFilasPrecio((prev) =>
      prev.map((f) => (f.key === key ? { ...f, precioImpresion: precio } : f))
    );
  }, []);

  const restablecerFila = useCallback((key) => {
    setFilasPrecio((prev) =>
      prev.map((f) => (f.key === key ? { ...f, precioImpresion: f.precioOriginal } : f))
    );
  }, []);

  const restablecerTodo = useCallback(() => {
    setFilasPrecio((prev) =>
      prev.map((f) => ({ ...f, precioImpresion: f.precioOriginal }))
    );
  }, []);

  const crearVentanaImpresion = () => {
    const el = document.getElementById("printable-factura-ajustada-content");
    if (!el) return null;
    const contenido = el.innerHTML;
    const ventana = window.open("", "", "width=800,height=600");
    ventana.document.write(
      buildFacturaImpresionPrintHtmlDocument(form.numeroFactura, contenido)
    );
    ventana.document.close();
    return ventana;
  };

  const handleImprimir = () => {
    const ventana = crearVentanaImpresion();
    if (ventana) {
      ventana.onload = () => ventana.print();
    }
  };

  const handleGuardarPDF = () => {
    const elemento = document.getElementById("printable-factura-ajustada-content");
    if (!elemento) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `Factura-${form.numeroFactura}-ajuste.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll(".factura-no-imprimir").forEach((el) => el.remove());
          },
        },
        jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
      })
      .from(elemento)
      .save();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="factura-imprimir-modal-overlay">
        <div className="factura-imprimir-modal-container">
          <div className="factura-imprimir-modal-header">
            <h2>Cargando factura…</h2>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Cargando datos para ajustar impresión…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <>
      <div
        className="factura-imprimir-modal-overlay"
        onClick={onClose}
        style={{ overflowY: "auto", maxHeight: "100vh" }}
      >
        <div
          className="factura-imprimir-modal-container factura-ajuste-modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxHeight: "90vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="factura-imprimir-modal-header">
            <h2>Vista para impresión — Factura #{form.numeroFactura}</h2>
            <div className="factura-imprimir-modal-actions">
              <button
                type="button"
                onClick={handleGuardarPDF}
                className="factura-imprimir-btn-guardar"
              >
                Guardar como PDF
              </button>
              <button
                type="button"
                onClick={handleImprimir}
                className="factura-imprimir-btn-imprimir"
              >
                Imprimir
              </button>
              <button type="button" onClick={onClose} className="factura-imprimir-btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          <div className="factura-ajuste-aviso factura-ajuste-aviso--destacado">
            <strong>Ajuste para impresión:</strong> puede modificar el precio unitario (con IVA) en la
            tabla. Los valores no se guardan en el sistema; aplican únicamente al PDF o a la impresión.
            Los totales se recalculan de forma automática.
          </div>

          <div
            id="printable-factura-ajustada-content"
            className="factura-imprimir-printable-content factura-ajuste-print-root"
          >
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

            {filasPrecio.length > 0 && (
              <div className="factura-ajuste-toolbar factura-no-imprimir">
                <span className="factura-ajuste-toolbar-text">
                  Cambios temporales; no se persisten en la base de datos
                </span>
                <button type="button" className="factura-ajuste-btn-restablecer" onClick={restablecerTodo}>
                  Restablecer precios de la orden
                </button>
              </div>
            )}

            <div className="factura-ajuste-table-wrap">
              <table className="factura-imprimir-table factura-ajuste-tabla-precios">
                <thead>
                  <tr>
                    <th>Cantidad</th>
                    <th>Color</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th className="text-right">Valor unitario (sin IVA)</th>
                    <th className="text-right factura-ajuste-col-editable">
                      Precio unitario (con IVA)
                    </th>
                    <th className="text-right">Total línea</th>
                    <th className="factura-no-imprimir"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filasPrecio.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty">
                        Sin productos en esta factura
                      </td>
                    </tr>
                  ) : (
                    filasPrecio.map((f) => {
                      const cant = Number(f.item.cantidad ?? 0);
                      const pu = Number(f.precioImpresion ?? 0);
                      const totalLinea = cant * pu;
                      return (
                        <tr key={f.key}>
                          <td className="text-center">{cant}</td>
                          <td>{resolverColorItem(f.item)}</td>
                          <td>{resolverTipoItem(f.item)}</td>
                          <td>{resolverNombreImpresion(f.item)}</td>
                          <td className="text-right">
                            $
                            {sinIva(pu).toLocaleString("es-CO", {
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 0,
                            })}
                          </td>
                          <td className="text-right factura-ajuste-celda-precio">
                            <input
                              type="number"
                              className="factura-ajuste-precio-input--large"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              aria-label={`Precio con IVA — ${resolverNombreImpresion(f.item)}`}
                              value={pu}
                              onChange={(e) => actualizarPrecio(f.key, e.target.value)}
                            />
                          </td>
                          <td className="text-right">
                            $
                            {totalLinea.toLocaleString("es-CO", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="factura-no-imprimir">
                            <button
                              type="button"
                              className="factura-ajuste-link-original"
                              onClick={() => restablecerFila(f.key)}
                              title={`Original: $${f.precioOriginal.toLocaleString("es-CO")}`}
                            >
                              Original
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="factura-imprimir-total">
              <p>
                Subtotal: $
                {totalesImpresion.subtotalSinIva.toLocaleString("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p>
                IVA (19%): $
                {totalesImpresion.iva.toLocaleString("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {tieneRetencionIca && retencionIca > 0 && (
                <p>
                  Retención ICA
                  {porcentajeIca ? ` (${porcentajeIca}%)` : ""}: $
                  {retencionIca.toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
              <p>
                Retención en la Fuente: $
                {retencionFuente.toLocaleString("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                <strong>
                  TOTAL: $
                  {totalFacturaImpresion.toLocaleString("es-CO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </p>
              {(retencionFuente > 0 || retencionIca > 0) && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                  Valor a pagar: $
                  {valorAPagarImpresion.toLocaleString("es-CO", {
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
