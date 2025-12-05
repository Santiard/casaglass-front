import { useEffect, useState } from "react";
import "../styles/OrdenImprimirModal.css";
import { obtenerOrden, obtenerOrdenDetalle } from "../services/OrdenesService.js";

export default function OrdenImprimirModal({ orden, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [formato, setFormato] = useState("ambos"); // "orden" | "trabajadores" | "ambos"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !orden?.id) {
      setForm(null);
      return;
    }

    // Cargar la orden completa con todos los datos del producto (color, tipo)
    const cargarOrdenCompleta = async () => {
      setLoading(true);
      try {
        // Intentar primero con obtenerOrden
        let ordenCompleta = await obtenerOrden(orden.id);
        
        // Verificar si los items tienen información completa del producto (color, tipo)
        // Si no, intentar con el endpoint de detalle
        if (ordenCompleta.items && ordenCompleta.items.length > 0) {
          const primerItem = ordenCompleta.items[0];
          const tieneColorYTipo = primerItem?.producto?.color !== null && 
                                  primerItem?.producto?.color !== undefined &&
                                  primerItem?.producto?.tipo !== null && 
                                  primerItem?.producto?.tipo !== undefined;
          
          if (!tieneColorYTipo) {
            console.log(" Orden sin datos completos del producto (color/tipo), usando endpoint de detalle...");
            try {
              const ordenDetalle = await obtenerOrdenDetalle(orden.id);
              // Combinar información de ambos endpoints, priorizando el detalle
              ordenCompleta = {
                ...ordenCompleta,
                items: ordenDetalle.items || ordenCompleta.items || []
              };
            } catch (detalleError) {
              console.warn(" No se pudo obtener detalle, usando orden básica:", detalleError);
            }
          }
        }

        const base = {
          id: ordenCompleta.id,
          numero: ordenCompleta.numero,
          fecha: ordenCompleta.fecha,
          obra: ordenCompleta.obra ?? "",
          venta: ordenCompleta.venta ?? false,
          credito: ordenCompleta.credito ?? false,
          estado: ordenCompleta.estado ?? "ACTIVA",
          subtotal: typeof ordenCompleta.subtotal === "number" ? ordenCompleta.subtotal : null,
          descuentos: typeof ordenCompleta.descuentos === "number" ? ordenCompleta.descuentos : 0,
          total: typeof ordenCompleta.total === "number" ? ordenCompleta.total : null,
          cliente: ordenCompleta.cliente || {},
          sede: ordenCompleta.sede || {},
          trabajador: ordenCompleta.trabajador || {},
          items: ordenCompleta.items || [],
        };

        setForm(base);
      } catch (error) {
        console.error("Error cargando orden completa:", error);
        // Si falla, usar los datos que vienen en la orden (aunque puedan estar incompletos)
        const base = {
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          obra: orden.obra ?? "",
          venta: orden.venta ?? false,
          credito: orden.credito ?? false,
          estado: orden.estado ?? "ACTIVA",
          subtotal: typeof orden.subtotal === "number" ? orden.subtotal : null,
          descuentos: typeof orden.descuentos === "number" ? orden.descuentos : 0,
          total: typeof orden.total === "number" ? orden.total : null,
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

    cargarOrdenCompleta();
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

  // Calcular totales
  const subtotal = form.subtotal !== null 
    ? form.subtotal 
    : form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
  const descuentos = form.descuentos || 0;
  const totalOrden = form.total !== null 
    ? form.total 
    : subtotal - descuentos;

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
              .orden-imprimir-table thead {
                background-color: transparent !important;
                color: #000 !important;
              }
              
              .orden-imprimir-table th {
                background-color: transparent !important;
                color: #000 !important;
                border: 1px solid #000 !important;
              }
              
              .orden-imprimir-table td {
                color: #000 !important;
                border: 1px solid #000 !important;
              }
              
              .orden-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              .orden-imprimir-header {
                border-bottom: 2px solid #000 !important;
              }
              
              .orden-imprimir-header h1,
              .orden-imprimir-header h2,
              .orden-imprimir-header p {
                color: #000 !important;
              }
              
              .orden-imprimir-info-section h3,
              .orden-imprimir-info-section p {
                color: #000 !important;
              }
              
              .orden-imprimir-total {
                background: transparent !important;
                border: 1px solid #000 !important;
              }
              
              .orden-imprimir-total p {
                color: #000 !important;
              }
              
              .orden-imprimir-total p strong {
                color: #000 !important;
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
    const ventana = crearVentanaImpresion();
    ventana.onload = () => {
      ventana.print();
    };
  };

  return (
    <>
      <div className="orden-imprimir-modal-overlay" onClick={onClose}>
        <div className="orden-imprimir-modal-container" onClick={(e) => e.stopPropagation()}>
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
                      form.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="text-center">{item.cantidad || 0}</td>
                          <td>{item.producto?.color || "-"}</td>
                          <td>{item.producto?.tipo || "-"}</td>
                          <td>{item.producto?.nombre || "-"}</td>
                          <td>${item.precioUnitario?.toLocaleString("es-CO") || "0"}</td>
                          <td>${item.totalLinea?.toLocaleString("es-CO") || "0"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Totales */}
                <div className="orden-imprimir-total">
                  <p>Subtotal: ${subtotal.toLocaleString("es-CO")}</p>
                  {descuentos > 0 && (
                    <p>Descuentos: ${descuentos.toLocaleString("es-CO")}</p>
                  )}
                  <p><strong>Total: ${totalOrden.toLocaleString("es-CO")}</strong></p>
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
                      form.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="text-center">{item.cantidad || 0}</td>
                          <td>{item.producto?.color || "-"}</td>
                          <td>{item.producto?.tipo || "-"}</td>
                          <td>{item.producto?.nombre || "-"}</td>
                        </tr>
                      ))
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
