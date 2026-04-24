import React, { useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "../styles/OrdenImprimirModal.css";
import {
  etiquetaProductoDescInsula,
  trasladoDetallesTienenDescInsula,
} from "../lib/trasladoDetalleUi.js";

/** Misma hoja que embebe OrdenImprimirModal en la ventana de impresión (tabla con bordes / líneas en pantalla; líneas tipo documento al imprimir). */
const ESTILOS_VENTANA_IMPRESION_ORDEN = `
            @page {
              margin: 10mm;
              size: auto;
            }
            
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            
            body { 
              font-family: 'Roboto', sans-serif; 
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 0.8rem;
            }
            
            .orden-imprimir-header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #000;
            }
            
            .orden-imprimir-header h1 {
              margin: 0 0 4px 0;
              color: #000;
              font-size: 1.1rem;
              font-weight: 700;
            }
            
            .orden-imprimir-header h2 {
              margin: 2px 0;
              color: #000;
              font-size: 0.95rem;
              font-weight: 600;
            }
            
            .orden-imprimir-header p {
              margin: 2px 0;
              color: #000;
              font-size: 0.75rem;
            }
            
            .orden-imprimir-info {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }
            
            .orden-imprimir-info-section h3 {
              margin: 0 0 2px 0;
              color: #000;
              font-size: 0.75rem;
              font-weight: 600;
            }
            
            .orden-imprimir-info-section p {
              margin: 2px 0;
              color: #000;
              font-size: 0.7rem;
            }
            
            .orden-imprimir-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 0.7rem;
              page-break-inside: auto;
            }
            
            .orden-imprimir-table thead {
              display: table-header-group;
              background-color: #1e2753;
              color: #fff;
            }
            
            .orden-imprimir-table th {
              padding: 4px 6px;
              text-align: left;
              font-weight: 600;
              font-size: 0.65rem;
              border: 1px solid #1e2753;
            }
            
            .orden-imprimir-table td {
              padding: 3px 6px;
              border-bottom: 1px solid #e0e0e0;
              border-right: 1px solid #f0f0f0;
              font-size: 0.65rem;
              color: #333;
            }
            
            .orden-imprimir-table tbody tr {
              page-break-inside: avoid;
            }
            
            .orden-imprimir-table tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .orden-imprimir-table .text-center {
              text-align: center;
            }
            
            .orden-imprimir-table .empty {
              text-align: center;
              color: #999;
              padding: 10px;
              font-style: italic;
            }
            
            .orden-imprimir-total {
              text-align: right;
              margin-top: 8px;
              padding: 6px 8px;
              background: #f8f9fa;
              border-radius: 4px;
            }
            
            .orden-imprimir-total p {
              margin: 2px 0;
              font-size: 0.75rem;
              color: #333;
            }
            
            .orden-imprimir-total p strong {
              font-size: 0.85rem;
              font-weight: 600;
              color: #000;
            }
            
            .orden-imprimir-separador {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            
            @media print {
              body {
                font-size: 1rem;
              }
              
              .orden-imprimir-header h1 {
                font-size: 1.3rem;
                color: #000 !important;
              }
              
              .orden-imprimir-header h2 {
                font-size: 1.1rem;
                color: #000 !important;
              }
              
              .orden-imprimir-header p {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .orden-imprimir-info-section h3 {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .orden-imprimir-info-section p {
                font-size: 0.85rem;
                color: #000 !important;
              }
              
              .orden-imprimir-table {
                font-size: 0.9rem;
              }
              
              .orden-imprimir-table thead {
                background-color: transparent !important;
                color: #000 !important;
                border-bottom: 2px solid #000 !important;
              }
              
              .orden-imprimir-table th {
                background-color: transparent !important;
                color: #000 !important;
                border: none !important;
                border-bottom: 2px solid #000 !important;
                padding: 3px 6px;
                font-size: 0.85rem;
                line-height: 1.1;
              }
              
              .orden-imprimir-table td {
                color: #000 !important;
                border: none !important;
                padding: 2px 6px;
                font-size: 0.85rem;
                line-height: 1.1;
              }
              
              .orden-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              .orden-imprimir-header {
                border-bottom: 2px solid #000 !important;
              }
              
              .orden-imprimir-total {
                background: transparent !important;
                border: none !important;
                border-top: 2px solid #000 !important;
                padding-top: 8px;
              }
              
              .orden-imprimir-total p {
                color: #000 !important;
                font-size: 0.95rem;
              }
              
              .orden-imprimir-total p strong {
                color: #000 !important;
                font-size: 1.05rem;
              }
            }
`;

function fmtFecha(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function colorEnDetalleTraslado(d) {
  const p = d?.producto;
  if (!p) return d?.color ?? "—";
  return (
    p.color ??
    p.nombreColor ??
    (typeof p.colorProducto === "string" ? p.colorProducto : p.colorProducto?.nombre) ??
    d.color ??
    "—"
  );
}

export default function TrasladoImprimirModal({ isOpen, onClose, traslado }) {
  useEffect(() => {
    const appRoot = document.getElementById("root") || document.getElementById("app");
    if (isOpen) {
      document.body.classList.add("modal-open");
      appRoot?.setAttribute("inert", "");
    } else {
      document.body.classList.remove("modal-open");
      appRoot?.removeAttribute("inert");
    }
    return () => {
      document.body.classList.remove("modal-open");
      appRoot?.removeAttribute("inert");
    };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleImprimir = useCallback(() => {
    if (!traslado) return;
    const el = document.getElementById("printable-traslado-content");
    if (!el) return;
    const contenido = el.innerHTML;
    const ventana = window.open("", "", "width=800,height=600");
    if (!ventana) return;

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Traslado #${traslado.id}</title>
          <style>${ESTILOS_VENTANA_IMPRESION_ORDEN}</style>
        </head>
        <body>
          ${contenido}
          <script>
            window.addEventListener("afterprint", function () { window.close(); });
            setTimeout(function () {
              if (!window.closed) window.close();
            }, 5000);
          </script>
        </body>
      </html>
    `);
    ventana.document.close();

    let printHecho = false;
    const dispararPrint = () => {
      if (printHecho || ventana.closed) return;
      try {
        ventana.focus();
        ventana.print();
        printHecho = true;
      } catch (_) {}
    };
    ventana.onload = () => dispararPrint();
    setTimeout(dispararPrint, 400);
  }, [traslado]);

  const detalles = useMemo(() => (Array.isArray(traslado?.detalles) ? traslado.detalles : []), [traslado]);
  const muestraColDescInsula = useMemo(
    () => trasladoDetallesTienenDescInsula(detalles),
    [detalles]
  );

  const totalCantidad = useMemo(
    () => detalles.reduce((s, d) => s + Number(d.cantidad ?? 0), 0),
    [detalles]
  );

  if (!isOpen || !traslado) return null;

  const estadoTxt = traslado.trabajadorConfirmacion ? "Confirmado" : "Pendiente";
  const confirmPor = traslado.trabajadorConfirmacion?.nombre ?? "—";

  const modalUI = (
    <div
      className="orden-imprimir-modal-overlay"
      onClick={onClose}
      style={{ overflowY: "auto", maxHeight: "100vh" }}
      role="presentation"
    >
      <div
        className="orden-imprimir-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="traslado-imprimir-modal-title"
      >
        <div className="orden-imprimir-modal-header">
          <h2 id="traslado-imprimir-modal-title">Imprimir Traslado #{traslado.id}</h2>
          <div className="orden-imprimir-modal-actions">
            <button type="button" className="orden-imprimir-btn-imprimir" onClick={handleImprimir}>
              Imprimir
            </button>
            <button type="button" className="orden-imprimir-btn-cerrar" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        <div id="printable-traslado-content" className="orden-imprimir-printable-content">
          <div className="orden-imprimir-header">
            <h1>ALUMINIOS CASAGLASS S.A.S</h1>
            <h2>Traslado #{traslado.id}</h2>
            <p>Fecha: {fmtFecha(traslado.fecha)}</p>
          </div>

          <div className="orden-imprimir-info">
            <div className="orden-imprimir-info-section">
              <h3>Sede origen</h3>
              <p>{traslado.sedeOrigen?.nombre ?? "—"}</p>
            </div>
            <div className="orden-imprimir-info-section">
              <h3>Sede destino</h3>
              <p>{traslado.sedeDestino?.nombre ?? "—"}</p>
            </div>
            <div className="orden-imprimir-info-section">
              <h3>Estado</h3>
              <p>{estadoTxt}</p>
            </div>
            <div className="orden-imprimir-info-section">
              <h3>Confirmado por</h3>
              <p>{confirmPor}</p>
            </div>
          </div>

          <table className="orden-imprimir-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Color</th>
                {muestraColDescInsula && <th>Desc. Insula (entero)</th>}
                <th className="text-center">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan={muestraColDescInsula ? 5 : 4} className="empty">
                    Sin ítems
                  </td>
                </tr>
              ) : (
                detalles.map((d, i) => (
                  <tr key={d.id ?? i}>
                    <td>{d.producto?.codigo ?? "—"}</td>
                    <td>{d.producto?.nombre ?? "—"}</td>
                    <td>{colorEnDetalleTraslado(d)}</td>
                    {muestraColDescInsula && (
                      <td>{etiquetaProductoDescInsula(d)}</td>
                    )}
                    <td className="text-center">{d.cantidad ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="orden-imprimir-total">
            <p>
              <strong>
                Ítems: {detalles.length} · Cantidad total: {totalCantidad}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalUI, document.body);
}
