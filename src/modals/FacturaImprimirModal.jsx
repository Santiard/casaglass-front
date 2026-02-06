import { useEffect, useState } from "react";
import "../styles/FacturaImprimirModal.css";
import { obtenerFactura } from "../services/FacturasService.js";
import html2pdf from "html2pdf.js";

export default function FacturaImprimirModal({ factura, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !factura?.id) {
      setForm(null);
      return;
    }

    // Cargar la factura completa (ahora incluye la orden completa con items)
    const cargarFacturaCompleta = async () => {
      setLoading(true);
      try {
        // Obtener factura completa - ahora retorna FacturaDetalleDTO con orden completa incluida
        const facturaCompleta = await obtenerFactura(factura.id);
        
        // El backend ahora retorna facturaCompleta.orden con todos los detalles (items, etc.)
        // Ya no necesitamos hacer una llamada adicional a obtenerOrdenDetalle
        const ordenCompleta = facturaCompleta.orden || {};
        const items = ordenCompleta.items || [];
        
        // IMPORTANTE: Usar el cliente de la factura (no el de la orden)
        // El backend retorna factura.cliente (cliente al que se factura)
        // factura.orden.cliente será null para evitar redundancia
        const cliente = facturaCompleta.cliente || {};

        const base = {
          id: facturaCompleta.id,
          numeroFactura: facturaCompleta.numeroFactura || facturaCompleta.numero || facturaCompleta.id,
          fecha: facturaCompleta.fecha,
          subtotal: typeof facturaCompleta.subtotal === "number" ? facturaCompleta.subtotal : 0,
          iva: typeof facturaCompleta.iva === "number" ? facturaCompleta.iva : 0,
          retencionFuente: typeof facturaCompleta.retencionFuente === "number" ? facturaCompleta.retencionFuente : 0,
          retencionIca: typeof facturaCompleta.retencionIca === "number" ? facturaCompleta.retencionIca : 0,
          total: typeof facturaCompleta.total === "number" ? facturaCompleta.total : 0,
          formaPago: facturaCompleta.formaPago || "-",
          observaciones: facturaCompleta.observaciones || "",
          estado: facturaCompleta.estado || "PENDIENTE",
          cliente: cliente,
          orden: {
            numero: ordenCompleta.numero,
            fecha: ordenCompleta.fecha,
            obra: ordenCompleta.obra || "",
            tieneRetencionIca: ordenCompleta.tieneRetencionIca || false,
            porcentajeIca: ordenCompleta.porcentajeIca !== undefined && ordenCompleta.porcentajeIca !== null 
              ? Number(ordenCompleta.porcentajeIca) 
              : null
          },
          items: items,
        };
        setForm(base);
      } catch (error) {
        console.error("Error cargando factura completa:", error);
        // Si falla, usar los datos que vienen en la factura (aunque puedan estar incompletos)
        const ordenCompleta = factura.orden || {};
        // Usar el cliente de la factura (no el de la orden)
        const cliente = factura.cliente || {};
        const base = {
          id: factura.id,
          numeroFactura: factura.numeroFactura || factura.numero || factura.id,
          fecha: factura.fecha,
          subtotal: typeof factura.subtotal === "number" ? factura.subtotal : 0,
          iva: typeof factura.iva === "number" ? factura.iva : 0,
          retencionFuente: typeof factura.retencionFuente === "number" ? factura.retencionFuente : 0,
          retencionIca: typeof factura.retencionIca === "number" ? factura.retencionIca : 0,
          total: typeof factura.total === "number" ? factura.total : 0,
          formaPago: factura.formaPago || "-",
          observaciones: factura.observaciones || "",
          estado: factura.estado || "PENDIENTE",
          cliente: cliente,
          orden: {
            numero: ordenCompleta.numero,
            fecha: ordenCompleta.fecha,
            obra: ordenCompleta.obra || "",
            tieneRetencionIca: ordenCompleta.tieneRetencionIca || false,
            porcentajeIca: ordenCompleta.porcentajeIca !== undefined && ordenCompleta.porcentajeIca !== null 
              ? Number(ordenCompleta.porcentajeIca) 
              : null
          },
          items: ordenCompleta.items || [],
        };
        setForm(base);
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

  // Usar valores del backend (ya calculados correctamente)
  const subtotal = form.subtotal || 0;
  const iva = form.iva || 0;
  const retencionFuente = form.retencionFuente || 0;
  const retencionIca = form.retencionIca || 0;
  const totalFactura = form.total || 0;
  
  // Obtener información de ICA de la orden si está disponible
  const tieneRetencionIca = form.orden?.tieneRetencionIca || false;
  const porcentajeIca = form.orden?.porcentajeIca !== undefined && form.orden?.porcentajeIca !== null 
    ? Number(form.orden.porcentajeIca) 
    : null;

  // Formatear fecha
  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // Formatear moneda
  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : "-";

  // Función para crear ventana de impresión (compartida entre imprimir y PDF)
  const crearVentanaImpresion = () => {
    const contenido = document.getElementById('printable-factura-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura #${form.numeroFactura}</title>
          <style>
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
            
            .factura-imprimir-header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #000;
            }
            
            .factura-imprimir-header h1 {
              margin: 0 0 4px 0;
              color: #000;
              font-size: 1.1rem;
              font-weight: 700;
            }
            
            .factura-imprimir-header h2 {
              margin: 2px 0;
              color: #000;
              font-size: 0.95rem;
              font-weight: 600;
            }
            
            .factura-imprimir-header p {
              margin: 2px 0;
              color: #000;
              font-size: 0.75rem;
            }
            
            .factura-imprimir-info {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }
            
            .factura-imprimir-info-section h3 {
              margin: 0 0 2px 0;
              color: #000;
              font-size: 0.75rem;
              font-weight: 600;
            }
            
            .factura-imprimir-info-section p {
              margin: 2px 0;
              color: #000;
              font-size: 0.7rem;
            }
            
            .factura-imprimir-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 0.7rem;
              page-break-inside: auto;
            }
            
            .factura-imprimir-table thead {
              display: table-header-group;
              background-color: #1e2753;
              color: #fff;
            }
            
            .factura-imprimir-table th {
              padding: 4px 6px;
              text-align: left;
              font-weight: 600;
              font-size: 0.65rem;
              border: 1px solid #1e2753;
            }
            
            .factura-imprimir-table td {
              padding: 3px 6px;
              border-bottom: 1px solid #e0e0e0;
              border-right: 1px solid #f0f0f0;
              font-size: 0.65rem;
              color: #333;
            }
            
            .factura-imprimir-table tbody tr {
              page-break-inside: avoid;
            }
            
            .factura-imprimir-table tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .factura-imprimir-table .text-center {
              text-align: center;
            }
            
            .factura-imprimir-table .text-right {
              text-align: right;
            }
            
            .factura-imprimir-table .empty {
              text-align: center;
              color: #999;
              padding: 10px;
              font-style: italic;
            }
            
            .factura-imprimir-total {
              text-align: right;
              margin-top: 8px;
              padding: 6px 8px;
              background: #f8f9fa;
              border-radius: 4px;
            }
            
            .factura-imprimir-total p {
              margin: 2px 0;
              font-size: 0.75rem;
              color: #333;
            }
            
            .factura-imprimir-total p strong {
              font-size: 0.85rem;
              font-weight: 600;
              color: #000;
            }
            
            @media print {
              body {
                font-size: 1rem;
              }
              
              .factura-imprimir-header h1 {
                font-size: 1.3rem;
                color: #000 !important;
              }
              
              .factura-imprimir-header h2 {
                font-size: 1.1rem;
                color: #000 !important;
              }
              
              .factura-imprimir-header p {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .factura-imprimir-info-section h3 {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .factura-imprimir-info-section p {
                font-size: 0.85rem;
                color: #000 !important;
              }
              
              .factura-imprimir-table {
                font-size: 0.9rem;
              }
              
              .factura-imprimir-table thead {
                background-color: transparent !important;
                color: #000 !important;
                border-bottom: 2px solid #000 !important;
              }
              
              .factura-imprimir-table th {
                background-color: transparent !important;
                color: #000 !important;
                border: none !important;
                border-bottom: 2px solid #000 !important;
                padding: 6px 8px;
                font-size: 0.85rem;
              }
              
              .factura-imprimir-table td {
                color: #000 !important;
                border: none !important;
                padding: 5px 8px;
                font-size: 0.85rem;
              }
              
              .factura-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              .factura-imprimir-header {
                border-bottom: 2px solid #000 !important;
              }
              
              .factura-imprimir-total {
                background: transparent !important;
                border: none !important;
                border-top: 2px solid #000 !important;
                padding-top: 8px;
              }
              
              .factura-imprimir-total p {
                color: #000 !important;
                font-size: 0.95rem;
              }
              
              .factura-imprimir-total p strong {
                color: #000 !important;
                font-size: 1.05rem;
              }
            }
          </style>
        </head>
        <body>
          ${contenido}
          <script>
            window.addEventListener('afterprint', function() {
              window.close();
            });
            
            setTimeout(function() {
              if (!window.closed) {
                window.close();
              }
            }, 5000);
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
    return ventana;
  };

  // Función para imprimir
  const handleImprimir = () => {
    const ventana = crearVentanaImpresion();
    ventana.onload = () => {
      ventana.print();
    };
  };

  // Función para guardar como PDF
  const handleGuardarPDF = () => {
    const elemento = document.getElementById('printable-factura-content');
    
    // Configuración de html2pdf
    const opciones = {
      margin: 10,
      filename: `Factura-${form.numeroFactura}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'letter', 
        orientation: 'portrait' 
      }
    };
    
    // Generar y descargar PDF
    html2pdf().set(opciones).from(elemento).save();
  };

  return (
    <>
      <div className="factura-imprimir-modal-overlay" onClick={onClose} style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <div className="factura-imprimir-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="factura-imprimir-modal-header">
            <h2>Imprimir Factura #{form.numeroFactura}</h2>
            <div className="factura-imprimir-modal-actions">
              <button onClick={handleGuardarPDF} className="factura-imprimir-btn-guardar">
                Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="factura-imprimir-btn-imprimir">
                Imprimir
              </button>
              <button onClick={onClose} className="factura-imprimir-btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="printable-factura-content" className="factura-imprimir-printable-content">
            {/* Encabezado */}
            <div className="factura-imprimir-header">
              <h1>ALUMINIOS CASAGLASS S.A.S</h1>
              <h2>Factura #{form.numeroFactura}</h2>
              <p>Fecha: {fmtFecha(form.fecha)}</p>
            </div>

            {/* Información general */}
            <div className="factura-imprimir-info">
              <div className="factura-imprimir-info-section">
                <h3>Cliente</h3>
                <p><strong>{form.cliente?.nombre || "-"}</strong></p>
                <p>NIT: {form.cliente?.nit || "-"}</p>
                {form.cliente?.direccion && <p>Dirección: {form.cliente.direccion}</p>}
                {form.cliente?.ciudad && <p>Ciudad: {form.cliente.ciudad}</p>}
              </div>

              <div className="factura-imprimir-info-section">
                <h3>Información de Factura</h3>
                {form.orden?.numero && <p>Orden: #{form.orden.numero}</p>}
                {form.orden?.obra && <p>Obra: {form.orden.obra}</p>}
                <p>Forma de Pago: {form.formaPago}</p>
                <p>Estado: {form.estado}</p>
              </div>
            </div>

            {/* Items de la factura (productos de la orden) */}
            <table className="factura-imprimir-table">
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Color</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th className="text-right">Valor Unitario</th>
                  <th className="text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">Sin productos</td>
                  </tr>
                ) : (
                  form.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="text-center">{item.cantidad || 0}</td>
                      <td>{item.producto?.color || "-"}</td>
                      <td>{item.producto?.tipo || "-"}</td>
                      <td>{item.producto?.nombre || "-"}</td>
                      <td className="text-right">${(item.precioUnitario || 0).toLocaleString("es-CO")}</td>
                      <td className="text-right">${(item.totalLinea || 0).toLocaleString("es-CO")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totales */}
            <div className="factura-imprimir-total">
              <p>Subtotal: ${subtotal.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p>IVA (19%): ${iva.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              {tieneRetencionIca && retencionIca > 0 && (
                <p>Retención ICA{porcentajeIca ? ` (${porcentajeIca}%)` : ''}: ${retencionIca.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              )}
              <p>Retención en la Fuente: ${retencionFuente.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>TOTAL: ${totalFactura.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </p>
              {(retencionFuente > 0 || retencionIca > 0) && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                  Valor a pagar: ${(totalFactura - retencionFuente - retencionIca).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Observaciones */}
            {form.observaciones && (
              <div style={{ marginTop: '15px', padding: '8px', borderTop: '1px solid #e0e0e0' }}>
                <p style={{ fontSize: '0.75rem', color: '#333', margin: 0 }}>
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

