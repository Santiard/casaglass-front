import { useEffect, useState } from "react";
import "../styles/OrdenImprimirModal.css";

export default function OrdenImprimirModal({ orden, isOpen, onClose }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!isOpen || !orden?.id) return;

    const base = {
      id: orden.id,
      numero: orden.numero,
      fecha: orden.fecha,
      obra: orden.obra ?? "",
      venta: orden.venta ?? false,
      credito: orden.credito ?? false,
      estado: orden.estado ?? "ACTIVA",
      cliente: orden.cliente || {},
      sede: orden.sede || {},
      trabajador: orden.trabajador || {},
      items: orden.items || [],
    };

    setForm(base);
  }, [orden, isOpen]);

  if (!isOpen || !form) return null;

  // Calcular totales
  const totalOrden = form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
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
            body { font-family: Arial, sans-serif; padding: 20px; }
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
              <button onClick={handleGuardarPDF} className="btn-guardar">
                📄 Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="btn-guardar">
                🖨️ Imprimir
              </button>
              <button onClick={onClose} className="btn-cancelar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div id="printable-content" className="printable-content">
            {/* Encabezado */}
            <div className="orden-header">
              <h1>ALUMINIOS CASAGLASS S.A.S</h1>
              <h2>Orden de {form.venta ? "Venta" : "Cotización"} #{form.numero}</h2>
              <p>Fecha: {fmtFecha(form.fecha)}</p>
            </div>

            {/* Información general */}
            <div className="info">
              <div className="info-section">
                <h3>Cliente</h3>
                <p>{form.cliente.nombre || "-"}</p>
                {form.cliente.nit && <p>NIT: {form.cliente.nit}</p>}
                {form.cliente.direccion && <p>Dirección: {form.cliente.direccion}</p>}
              </div>

              <div className="info-section">
                <h3>Sede</h3>
                <p>{form.sede.nombre || "-"}</p>
              </div>

              <div className="info-section">
                <h3>Trabajador</h3>
                <p>{form.trabajador.nombre || "-"}</p>
              </div>
            </div>

            {/* Obra */}
            {form.obra && (
              <div className="obra">
                <h3>Obra</h3>
                <p>{form.obra}</p>
              </div>
            )}

            {/* Items */}
            <table className="items-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
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
                      <td>{item.producto?.codigo || "-"}</td>
                      <td>{item.producto?.nombre || "-"}</td>
                      <td>{item.descripcion || "-"}</td>
                      <td className="text-center">{item.cantidad || 0}</td>
                      <td>${item.precioUnitario?.toLocaleString("es-CO") || "0"}</td>
                      <td>${item.totalLinea?.toLocaleString("es-CO") || "0"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totales */}
            <div className="total">
              <p>Total de productos: {totalProductos}</p>
              <p>Total: ${totalOrden.toLocaleString("es-CO")}</p>
              {form.credito && <p className="credito">💳 Esta orden es a crédito</p>}
            </div>

            {/* Estado */}
            <div className="estado">
              <p>Estado: {formatearEstado(form.estado)}</p>
            </div>

            {/* Pie de página */}
            <div className="footer">
              <p>Documento generado el {new Date().toLocaleString("es-CO")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
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
          .modal-header button {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
