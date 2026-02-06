import { useEffect, useState } from "react";
import "../styles/RemisionImprimirModal.css";
import { obtenerOrdenDetalle } from "../services/OrdenesService.js";
import { obtenerFacturaPorOrden } from "../services/FacturasService.js";
import html2pdf from "html2pdf.js";
import logocasaglass from "../assets/logocasaglass.png";

export default function RemisionImprimirModal({ orden, isOpen, onClose }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);

  // Datos de la empresa - Por favor confirma o corrige estos valores
  const empresaInfo = {
    nombre: "COMERCIALIZADORA Aluminios CASA GLASS S.A.S",
    nit: "901234103-3",
    tipo: "DISTRIBUIDOR MAYORISTA ALUMINIO Y VIDRIO",
    direcciones: [
      "Avenida 7 No.1-96 la Insula Tel: (607) 5281830 Cel. 317 867.0627",
      "Centro: Cll 7 No. 8-59 B. Latino Tel. (607) 5002649 Cel. 3212389946",
      "Patios: Av.10 No. 34-01 B. Colorados (607) 555 7701"
    ],
    email: "aluminios_casaglass@hotmail.com"
  };

  useEffect(() => {
    if (!isOpen || !orden?.id) {
      setForm(null);
      return;
    }

    const cargarOrdenDetallada = async () => {
      setLoading(true);
      try {
        let ordenDetallada = null;
        
        try {
          ordenDetallada = await obtenerOrdenDetalle(orden.id);
        } catch (ordenError) {
          const yaFacturada = Boolean(orden.facturada === true || orden.numeroFactura);
          if (yaFacturada) {
            try {
              const facturaData = await obtenerFacturaPorOrden(orden.id);
              if (facturaData?.orden) {
                ordenDetallada = facturaData.orden;
              } else {
                throw ordenError;
              }
            } catch (facturaError) {
              throw ordenError;
            }
          } else {
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
          subtotal: typeof ordenDetallada.subtotal === "number" ? ordenDetallada.subtotal : null,
          iva: typeof ordenDetallada.iva === "number" ? ordenDetallada.iva : null,
          total: typeof ordenDetallada.total === "number" ? ordenDetallada.total : null,
          cliente: ordenDetallada.cliente || {},
          sede: ordenDetallada.sede || {},
          trabajador: ordenDetallada.trabajador || {},
          items: ordenDetallada.items || [],
        };
        setForm(base);
      } catch (error) {
        console.error("Error cargando orden detallada:", error);
        const base = {
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          obra: orden.obra ?? "",
          venta: orden.venta ?? false,
          credito: orden.credito ?? false,
          estado: orden.estado ?? "ACTIVA",
          subtotal: typeof orden.subtotal === "number" ? orden.subtotal : null,
          iva: typeof orden.iva === "number" ? orden.iva : null,
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

    cargarOrdenDetallada();
  }, [orden, isOpen]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="remision-imprimir-modal-overlay">
        <div className="remision-imprimir-modal-container">
          <div className="remision-imprimir-modal-header">
            <h2>Cargando remisión...</h2>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Cargando datos de la orden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const totalOrden = form.total !== null 
    ? form.total 
    : form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);

  // Formatear fecha para mostrar día, mes y año separados
  const parsearFecha = (iso) => {
    if (!iso) return { dia: "", mes: "", año: "" };
    const fecha = new Date(iso);
    return {
      dia: fecha.getDate().toString().padStart(2, '0'),
      mes: (fecha.getMonth() + 1).toString().padStart(2, '0'),
      año: fecha.getFullYear().toString()
    };
  };

  const fechaFormateada = parsearFecha(form.fecha);

  // Determinar unidad del producto (por defecto UNID, pero puede ser CM, M, etc.)
  const obtenerUnidad = (item) => {
    // Si el producto tiene una unidad definida, usarla
    // Por ahora usamos UNID por defecto, pero puedes ajustar según tus datos
    return item.producto?.unidad || "UNID";
  };

  const crearVentanaImpresion = () => {
    const contenido = document.getElementById('printable-remision-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Remisión #${form.numero}</title>
          <style>
            @page {
              margin: 10mm;
              size: letter;
            }
            
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            
            body { 
              font-family: Arial, sans-serif; 
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 10pt;
            }
            
            .remision-header-company {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #000;
            }
            
            .remision-logo-section {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .remision-logo {
              width: 120px;
              height: auto;
            }
            
            .remision-company-info {
              flex: 1;
            }
            
            .remision-company-name {
              font-size: 12pt;
              font-weight: bold;
              margin: 0 0 4px 0;
              color: #000;
              white-space: nowrap;
            }
            
            .remision-company-nit {
              font-size: 10pt;
              margin: 0 0 4px 0;
              color: #000;
            }
            
            .remision-company-type {
              font-size: 9pt;
              font-weight: 600;
              margin: 0;
              color: #000;
            }
            
            .remision-number-box {
              border: 2px solid #dc3545;
              padding: 8px 12px;
              text-align: center;
              background: #fff;
            }
            
            .remision-number-box p {
              margin: 0;
              font-size: 11pt;
              font-weight: bold;
              color: #dc3545;
            }
            
            .remision-contact-info {
              font-size: 8pt;
              margin: 8px 0;
              line-height: 1.4;
              color: #000;
            }
            
            .remision-contact-info p {
              margin: 2px 0;
            }
            
            .remision-client-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 15px 0;
            }
            
            .remision-client-info {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 8px 15px;
              font-size: 9pt;
            }
            
            .remision-client-label {
              font-weight: bold;
              color: #000;
            }
            
            .remision-client-value {
              color: #000;
            }
            
            .remision-dates-section {
              display: flex;
              flex-direction: column;
              gap: 5px;
              margin: 10px 0;
            }
            
            .remision-date-field {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 8pt;
            }
            
            .remision-date-label {
              font-weight: bold;
              color: #000;
              white-space: nowrap;
              min-width: 120px;
            }
            
            .remision-date-inputs {
              display: flex;
              gap: 3px;
              align-items: center;
            }
            
            .remision-date-inputs span:not(.remision-date-input) {
              font-size: 7pt;
              color: #666;
            }
            
            .remision-date-input {
              width: 25px;
              text-align: center;
              border-bottom: 1px solid #000;
              padding: 1px 2px;
              font-size: 8pt;
            }
            
            .remision-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 9pt;
            }
            
            .remision-table th {
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
              background-color: #f0f0f0;
              font-weight: bold;
              color: #000;
            }
            
            .remision-table td {
              border: 1px solid #000;
              padding: 4px;
              text-align: center;
              color: #000;
            }
            
            .remision-table td.text-left {
              text-align: left;
            }
            
            .remision-table td.text-right {
              text-align: right;
            }
            
            .remision-footer {
              margin-top: 20px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            
            .remision-signatures {
              font-size: 9pt;
            }
            
            .remision-signature-line {
              margin: 15px 0;
              padding-bottom: 30px;
              border-bottom: 1px solid #000;
            }
            
            .remision-signature-label {
              font-weight: bold;
              margin-bottom: 5px;
              color: #000;
            }
            
            .remision-total-section {
              text-align: right;
              font-size: 10pt;
              margin-top: 20px;
            }
            
            .remision-total-label {
              font-weight: bold;
              margin-bottom: 5px;
              color: #000;
            }
            
            .remision-total-value {
              font-size: 12pt;
              font-weight: bold;
              color: #000;
            }
            
            @media print {
              body {
                font-size: 10pt;
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

  const handleImprimir = () => {
    const ventana = crearVentanaImpresion();
    ventana.onload = () => {
      ventana.print();
    };
  };

  const handleGuardarPDF = () => {
    const elemento = document.getElementById('printable-remision-content');
    
    const opciones = {
      margin: 10,
      filename: `Remision-${form.numero}.pdf`,
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
    
    html2pdf().set(opciones).from(elemento).save();
  };

  return (
    <>
      <div className="remision-imprimir-modal-overlay" onClick={onClose} style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <div className="remision-imprimir-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="remision-imprimir-modal-header">
            <h2>Imprimir Remisión #{form.numero}</h2>
            <div className="remision-imprimir-modal-actions">
              <button onClick={handleGuardarPDF} className="remision-imprimir-btn-guardar">
                Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="remision-imprimir-btn-imprimir">
                Imprimir
              </button>
              <button onClick={onClose} className="remision-imprimir-btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="printable-remision-content" className="remision-imprimir-printable-content">
            {/* Header con logo y datos de empresa */}
            <div className="remision-header-company">
              <div className="remision-logo-section">
                <img src={logocasaglass} alt="Logo Casaglass" className="remision-logo" />
                <div className="remision-company-info">
                  <p className="remision-company-name">{empresaInfo.nombre}</p>
                  <p className="remision-company-nit">NIT {empresaInfo.nit}</p>
                  <p className="remision-company-type">{empresaInfo.tipo}</p>
                </div>
              </div>
              <div className="remision-number-box">
                <p>REMISIÓN N° {form.numero}</p>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="remision-contact-info">
              {empresaInfo.direcciones.map((dir, idx) => (
                <p key={idx}>{dir}</p>
              ))}
              <p>E-mail: {empresaInfo.email}</p>
            </div>

            {/* Información del cliente */}
            <div className="remision-client-section">
              <div className="remision-client-info">
                <span className="remision-client-label">CLIENTE:</span>
                <span className="remision-client-value">{form.cliente.nombre || "-"}</span>
                
                <span className="remision-client-label">DIRECCION:</span>
                <span className="remision-client-value">{form.cliente.direccion || "-"}</span>
                
                <span className="remision-client-label">TELEFONO:</span>
                <span className="remision-client-value">{form.cliente.telefono || "-"}</span>
                
                <span className="remision-client-label">NIT o C.C.:</span>
                <span className="remision-client-value">{form.cliente.nit || "-"}</span>
                
                <span className="remision-client-label">CIUDAD:</span>
                <span className="remision-client-value">{form.cliente.ciudad || "-"}</span>
              </div>

              {/* Fechas */}
              <div className="remision-dates-section">
                <div className="remision-date-field">
                  <span className="remision-date-label">FECHA FACTURA:</span>
                  <div className="remision-date-inputs">
                    <span>DIA</span>
                    <span className="remision-date-input">{fechaFormateada.dia}</span>
                    <span>MES</span>
                    <span className="remision-date-input">{fechaFormateada.mes}</span>
                    <span>AÑO</span>
                    <span className="remision-date-input">{fechaFormateada.año}</span>
                  </div>
                </div>
                
                <div className="remision-date-field">
                  <span className="remision-date-label">FECHA VENCIMIENTO:</span>
                  <div className="remision-date-inputs">
                    <span>DIA</span>
                    <span className="remision-date-input"></span>
                    <span>MES</span>
                    <span className="remision-date-input"></span>
                    <span>AÑO</span>
                    <span className="remision-date-input"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de items */}
            <table className="remision-table">
              <thead>
                <tr>
                  <th>CANT</th>
                  <th>DESCRIPCION</th>
                  <th>UNID</th>
                  <th>VR. UNITARIO</th>
                  <th>VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Sin ítems</td>
                  </tr>
                ) : (
                  form.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.cantidad || 0}</td>
                      <td className="text-left">
                        {item.producto?.nombre || "-"}
                        {item.producto?.color && ` ${item.producto.color}`}
                        {item.producto?.tipo && ` ${item.producto.tipo}`}
                      </td>
                      <td>{obtenerUnidad(item)}</td>
                      <td className="text-right">${(item.precioUnitario || 0).toLocaleString("es-CO")}</td>
                      <td className="text-right">${(item.totalLinea || 0).toLocaleString("es-CO")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Footer con firmas y total */}
            <div className="remision-footer">
              <div className="remision-signatures">
                <div className="remision-signature-line">
                  <div className="remision-signature-label">EMISOR:</div>
                </div>
                <div className="remision-signature-line">
                  <div className="remision-signature-label">ACEPTADA - NOMBRE, C.C.:</div>
                </div>
                <div className="remision-signature-line">
                  <div className="remision-signature-label">RECIBIDO POR: NOMBRE, C.C.:</div>
                </div>
              </div>
              
              <div className="remision-total-section">
                <div className="remision-total-label">TOTAL $:</div>
                <div className="remision-total-value">${totalOrden.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
