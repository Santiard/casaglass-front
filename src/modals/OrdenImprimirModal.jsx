import { useEffect, useState } from "react";
import "../styles/OrdenImprimirModal.css";
import { obtenerOrden, obtenerOrdenDetalle } from "../services/OrdenesService.js";

export default function OrdenImprimirModal({ orden, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [formato, setFormato] = useState("orden"); // "orden" | "trabajadores" | "ambos"
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
            console.log("⚠️ Orden sin datos completos del producto (color/tipo), usando endpoint de detalle...");
            try {
              const ordenDetalle = await obtenerOrdenDetalle(orden.id);
              // Combinar información de ambos endpoints, priorizando el detalle
              ordenCompleta = {
                ...ordenCompleta,
                items: ordenDetalle.items || ordenCompleta.items || []
              };
            } catch (detalleError) {
              console.warn("⚠️ No se pudo obtener detalle, usando orden básica:", detalleError);
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
      <div className="modal-overlay">
        <div className="modal-container modal-print">
          <div className="modal-header">
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
  const totalProductos = form.items.length;

  // Formatear fecha
  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // Formatear estado
  const formatearEstado = (estado) => {
    const estadoLimpio = estado?.toLowerCase() || 'activa';
    const textos = {
      'activa': 'Activa',
      'anulada': 'Anulada',
      'pendiente': 'Pendiente',
      'completada': 'Completada'
    };
    return textos[estadoLimpio] || estado || 'Activa';
  };

  // Función para imprimir
  const handleImprimir = () => {
    window.print();
  };

  // Función para guardar como PDF
  const handleGuardarPDF = () => {
    const contenido = document.getElementById('printable-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden #${form.numero}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            
            body { 
              font-family: 'Roboto', sans-serif; 
              padding: 20px; 
              margin: 0;
            }
            
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info-section { flex: 1; }
            .info-section h3 { margin: 0 0 10px 0; color: #555; }
            .info-section p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            table th { background-color: #f2f2f2; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          ${contenido}
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-container modal-print">
          <div className="modal-header">
            <h2>Imprimir Orden #{form.numero}</h2>
            <div className="modal-actions">
              {/* Selector de formato */}
              <select 
                value={formato} 
                onChange={(e) => setFormato(e.target.value)}
                className="formato-select"
                style={{
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid var(--color-light-gray)",
                  backgroundColor: "var(--color-white)",
                  color: "var(--color-dark-blue)",
                  fontSize: "14px",
                  marginRight: "10px"
                }}
              >
                <option value="orden">Formato: Orden</option>
                <option value="trabajadores">Formato: Para Trabajadores</option>
                <option value="ambos">Imprimir Ambos Formatos</option>
              </select>
              <button onClick={handleGuardarPDF} className="btn-guardar">
                Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="btn-guardar">
                Imprimir
              </button>
              <button onClick={onClose} className="btn-cancelar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="printable-content" className="printable-content">
            {(formato === "orden" || formato === "ambos") && (
              /* ========== FORMATO 1: ORDEN ========== */
              <>
                {/* Encabezado */}
                <div className="orden-header">
                  <h1>ALUMINIOS CASAGLASS S.A.S</h1>
                  <h2>Orden de {form.venta ? "Venta" : "Cotización"} #{form.numero}</h2>
                  <p>Fecha: {fmtFecha(form.fecha)}</p>
                </div>

                {/* Información general */}
                <div className="info">
                  <div className="info-section">
                    <h3>Sede</h3>
                    <p>{form.sede.nombre || "-"}</p>
                  </div>

                  <div className="info-section">
                    <h3>Cliente</h3>
                    <p>{form.cliente.nombre || "-"}</p>
                  </div>
                </div>

                {/* Items con color y tipo */}
                <table className="items-table">
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
                <div className="total">
                  <p>Subtotal: ${subtotal.toLocaleString("es-CO")}</p>
                  {descuentos > 0 && (
                    <p>Descuentos: ${descuentos.toLocaleString("es-CO")}</p>
                  )}
                  <p><strong>Total: ${totalOrden.toLocaleString("es-CO")}</strong></p>
                </div>
              </>
            )}

            {formato === "ambos" && (
              <div style={{ 
                pageBreakBefore: "always", 
                marginTop: "50px",
                borderTop: "3px solid var(--color-dark-blue)",
                paddingTop: "30px"
              }}>
                {/* Separador visual entre formatos */}
              </div>
            )}

            {(formato === "trabajadores" || formato === "ambos") && (
              /* ========== FORMATO 2: PARA TRABAJADORES ========== */
              <>
                {/* Encabezado */}
                <div className="orden-header">
                  <h1>ALUMINIOS CASAGLASS S.A.S</h1>
                  <h2>Orden de Producción #{form.numero}</h2>
                  <p>Fecha: {fmtFecha(form.fecha)}</p>
                </div>

                {/* Información general */}
                <div className="info">
                  <div className="info-section">
                    <h3>Sede</h3>
                    <p>{form.sede.nombre || "-"}</p>
                  </div>
                </div>

                {/* Items sin valores monetarios */}
                <table className="items-table">
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

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          body * {
            visibility: hidden;
          }
          
          #printable-content,
          #printable-content * {
            visibility: visible;
          }
          
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .modal-actions,
          .modal-header button,
          .modal-header select {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
