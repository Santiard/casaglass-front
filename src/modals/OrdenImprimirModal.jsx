import { useEffect, useState } from "react";
import "../styles/OrdenImprimirModal.css";
import { obtenerOrden, obtenerOrdenDetalle } from "../services/OrdenesService.js";
import { obtenerFacturaPorOrden } from "../services/FacturasService.js";
import html2pdf from "html2pdf.js";

export default function OrdenImprimirModal({ orden, isOpen, onClose }) {
  // Cargar SIEMPRE la orden detallada (con items completos)
  const [form, setForm] = useState(null);
  const [formato, setFormato] = useState("ambos"); // "orden" | "trabajadores" | "ambos"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !orden?.id) {
      setForm(null);
      return;
    }

    // Cargar la orden detallada (con items completos)
    // El backend ahora usa fetch joins para cargar todas las relaciones de una vez,
    // por lo que funciona correctamente tanto para órdenes normales como facturadas.
    // Mantenemos el fallback a factura por si acaso hay algún problema.
    const cargarOrdenDetallada = async () => {
      setLoading(true);
      try {
        // Intentar cargar la orden directamente (el backend ya está corregido)
        let ordenDetallada = null;
        
        try {
          ordenDetallada = await obtenerOrdenDetalle(orden.id);
        } catch (ordenError) {
          // Fallback: si falla cargar la orden directamente y está facturada,
          // intentar cargar desde la factura (que incluye la orden completa)
          const yaFacturada = Boolean(orden.facturada === true || orden.numeroFactura);
          if (yaFacturada) {
            try {
              const facturaData = await obtenerFacturaPorOrden(orden.id);
              if (facturaData?.orden) {
                ordenDetallada = facturaData.orden;
              } else {
                throw ordenError; // Si no hay orden en la factura, lanzar el error original
              }
            } catch (facturaError) {
              // Si también falla la factura, lanzar el error original de la orden
              throw ordenError;
            }
          } else {
            // Si no está facturada, lanzar el error directamente
            throw ordenError;
          }
        }
        
        const base = {
          id: ordenDetallada.id,
          numero: ordenDetallada.numero,
          fecha: ordenDetallada.fecha,
          obra: ordenDetallada.obra ?? "",
          venta: ordenDetallada.venta ?? false,
          credito: ordenDetallada.credito ?? false,
          estado: ordenDetallada.estado ?? "ACTIVA",
          subtotal: typeof ordenDetallada.subtotal === "number" ? ordenDetallada.subtotal : null, // Base sin IVA
          iva: typeof ordenDetallada.iva === "number" ? ordenDetallada.iva : null, // IVA calculado
          retencionFuente: typeof ordenDetallada.retencionFuente === "number" ? ordenDetallada.retencionFuente : 0,
          tieneRetencionFuente: Boolean(ordenDetallada.tieneRetencionFuente ?? false),
          retencionIca: typeof ordenDetallada.retencionIca === "number" ? ordenDetallada.retencionIca : 0,
          tieneRetencionIca: Boolean(ordenDetallada.tieneRetencionIca ?? false),
          porcentajeIca: ordenDetallada.porcentajeIca !== undefined && ordenDetallada.porcentajeIca !== null 
            ? Number(ordenDetallada.porcentajeIca) 
            : null,
          total: typeof ordenDetallada.total === "number" ? ordenDetallada.total : null, // Total facturado
          cliente: ordenDetallada.cliente || {},
          sede: ordenDetallada.sede || {},
          trabajador: ordenDetallada.trabajador || {},
          items: ordenDetallada.items || [],
        };
        setForm(base);
      } catch (error) {
        console.error("Error cargando orden detallada:", error);
        // Si falla, usar los datos que vienen en la orden (aunque puedan estar incompletos)
        const base = {
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          obra: orden.obra ?? "",
          venta: orden.venta ?? false,
          credito: orden.credito ?? false,
          estado: orden.estado ?? "ACTIVA",
          subtotal: typeof orden.subtotal === "number" ? orden.subtotal : null, // Base sin IVA
          iva: typeof orden.iva === "number" ? orden.iva : null, // IVA calculado
          retencionFuente: typeof orden.retencionFuente === "number" ? orden.retencionFuente : 0,
          tieneRetencionFuente: Boolean(orden.tieneRetencionFuente ?? false),
          retencionIca: typeof orden.retencionIca === "number" ? orden.retencionIca : 0,
          tieneRetencionIca: Boolean(orden.tieneRetencionIca ?? false),
          porcentajeIca: orden.porcentajeIca !== undefined && orden.porcentajeIca !== null 
            ? Number(orden.porcentajeIca) 
            : null,
          total: typeof orden.total === "number" ? orden.total : null, // Total facturado
          cliente: orden.cliente || {},
          sede: orden.sede || {},
          trabajador: orden.trabajador || {},
          items: orden.items || [],
        };
        setForm(base);
      } finally {
        setLoading(false);
      }
    };

    cargarOrdenDetallada();
  }, [orden, isOpen]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="orden-imprimir-modal-overlay">
        <div className="orden-imprimir-modal-container">
          <div className="orden-imprimir-modal-header">
            <h2>Cargando orden...</h2>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Cargando datos de la orden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  // Usar valores del backend (ya calculados correctamente)
  // El backend ahora calcula: subtotal = base sin IVA, iva = valor del IVA, total = total facturado
  const subtotalSinIva = form.subtotal !== null 
    ? form.subtotal 
    : form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0) / 1.19; // Fallback: calcular si no viene del backend
  const iva = form.iva !== null 
    ? form.iva 
    : (form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0) - subtotalSinIva); // Fallback: calcular si no viene del backend
  const retencionFuente = form.retencionFuente || 0;
  const retencionIca = form.retencionIca || 0;
  const tieneRetencionIca = form.tieneRetencionIca || false;
  const porcentajeIca = form.porcentajeIca !== undefined && form.porcentajeIca !== null 
    ? Number(form.porcentajeIca) 
    : null;
  const totalOrden = form.total !== null 
    ? form.total 
    : form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0); // Fallback: calcular si no viene del backend

  // Formatear fecha
  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // Función para crear ventana de impresión (compartida entre imprimir y PDF)
  const crearVentanaImpresion = () => {
    const contenido = document.getElementById('printable-orden-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden #${form.numero}</title>
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
              /* Aumentar tamaños de fuente para mejor legibilidad */
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
              
              /* Tabla sin bordes para ahorrar tinta */
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
                padding: 6px 8px;
                font-size: 0.85rem;
              }
              
              .orden-imprimir-table td {
                color: #000 !important;
                border: none !important;
                padding: 5px 8px;
                font-size: 0.85rem;
              }
              
              .orden-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              /* Solo línea inferior para el encabezado */
              .orden-imprimir-header {
                border-bottom: 2px solid #000 !important;
              }
              
              /* Totales con línea superior solamente */
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
          </style>
        </head>
        <body>
          ${contenido}
          <script>
            // Cerrar la ventana después de imprimir o cancelar
            window.addEventListener('afterprint', function() {
              window.close();
            });
            
            // Fallback: cerrar después de un tiempo si el evento no se dispara
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
    const elemento = document.getElementById('printable-orden-content');
    
    // Configuración de html2pdf
    const opciones = {
      margin: 10, // 10mm de margen
      filename: `Orden-${form.numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Mejor calidad
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
      <div className="orden-imprimir-modal-overlay" onClick={onClose} style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <div className="orden-imprimir-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="orden-imprimir-modal-header">
            <h2>Imprimir Orden #{form.numero}</h2>
            <div className="orden-imprimir-modal-actions">
              {/* Selector de formato */}
              <select 
                value={formato} 
                onChange={(e) => setFormato(e.target.value)}
                className="orden-imprimir-formato-select"
              >
                <option value="orden">Formato: Orden</option>
                <option value="trabajadores">Formato: Para Trabajadores</option>
                <option value="ambos">Imprimir Ambos Formatos</option>
              </select>
              <button onClick={handleGuardarPDF} className="orden-imprimir-btn-guardar">
                Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="orden-imprimir-btn-imprimir">
                Imprimir
              </button>
              <button onClick={onClose} className="orden-imprimir-btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="printable-orden-content" className="orden-imprimir-printable-content">
            {(formato === "orden" || formato === "ambos") && (
              /* ========== FORMATO 1: ORDEN ========== */
              <>
                {/* Encabezado */}
                <div className="orden-imprimir-header">
                  <h1>ALUMINIOS CASAGLASS S.A.S</h1>
                  <h2>Orden de {form.venta ? "Venta" : "Cotización"} #{form.numero}</h2>
                  <p>Fecha: {fmtFecha(form.fecha)}</p>
                </div>

                {/* Información general */}
                <div className="orden-imprimir-info">
                  <div className="orden-imprimir-info-section">
                    <h3>Sede</h3>
                    <p>{form.sede.nombre || "-"}</p>
                  </div>

                  <div className="orden-imprimir-info-section">
                    <h3>Cliente</h3>
                    <p>{form.cliente.nombre || "-"}</p>
                  </div>
                </div>

                {/* Items con color y tipo */}
                <table className="orden-imprimir-table">
                  <thead>
                    <tr>
                      <th>Cantidad</th>
                      <th>Color</th>
                      <th>Tipo</th>
                      <th>Producto</th>
                      <th>Valor Unitario</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty">Sin ítems</td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => {
                        // Para cortes, usar el nombre formateado del detalle si existe, sino el del producto
                        const nombreProducto = item.nombre || item.nombreProducto || item.producto?.nombre || "-";
                        return (
                          <tr key={item.id || index}>
                            <td className="text-center">{item.cantidad || 0}</td>
                            <td>{item.producto?.color || "-"}</td>
                            <td>{item.producto?.tipo || "-"}</td>
                            <td>{nombreProducto}</td>
                            <td>${item.precioUnitario?.toLocaleString("es-CO") || "0"}</td>
                            <td>${item.totalLinea?.toLocaleString("es-CO") || "0"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="orden-imprimir-total">
                  <p><strong>Total: ${totalOrden.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                </div>
              </>
            )}

            {formato === "ambos" && (
              <div className="orden-imprimir-separador">
                {/* Separador visual entre formatos */}
              </div>
            )}

            {(formato === "trabajadores" || formato === "ambos") && (
              /* ========== FORMATO 2: PARA TRABAJADORES ========== */
              <>
                {/* Encabezado */}
                <div className="orden-imprimir-header">
                  <h1>ALUMINIOS CASAGLASS S.A.S</h1>
                  <h2>Orden de Producción #{form.numero}</h2>
                  <p>Fecha: {fmtFecha(form.fecha)}</p>
                </div>

                {/* Información general */}
                <div className="orden-imprimir-info">
                  <div className="orden-imprimir-info-section">
                    <h3>Sede</h3>
                    <p>{form.sede.nombre || "-"}</p>
                  </div>
                </div>

                {/* Items sin valores monetarios */}
                <table className="orden-imprimir-table">
                  <thead>
                    <tr>
                      <th>Cantidad</th>
                      <th>Color</th>
                      <th>Tipo</th>
                      <th>Producto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty">Sin ítems</td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => {
                        // Para cortes, usar el nombre formateado del detalle si existe, sino el del producto
                        const nombreProducto = item.nombre || item.nombreProducto || item.producto?.nombre || "-";
                        return (
                          <tr key={item.id || index}>
                            <td className="text-center">{item.cantidad || 0}</td>
                            <td>{item.producto?.color || "-"}</td>
                            <td>{item.producto?.tipo || "-"}</td>
                            <td>{nombreProducto}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
