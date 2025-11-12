import { useEffect, useState } from "react";
import "../styles/OrdenImprimirModal.css";

export default function EntregasImprimirModal({ entregas = [], isOpen, onClose }) {
  const [entregasSeleccionadas, setEntregasSeleccionadas] = useState([]);

  useEffect(() => {
    if (isOpen && entregas.length > 0) {
      // Por defecto seleccionar todas las entregas
      setEntregasSeleccionadas(entregas.map(e => e.id));
    }
  }, [isOpen, entregas]);

  if (!isOpen) return null;

  // Filtrar entregas seleccionadas
  const entregasParaImprimir = entregas.filter(e => entregasSeleccionadas.includes(e.id));

  // Formatear fecha
  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Calcular totales por entrega
  const calcularTotalesPorEntrega = (entrega) => {
    const totalOrdenes = entrega.detalles?.reduce((sum, det) => sum + (Number(det.montoOrden) || 0), 0) || 0;
    const totalEntregado = (Number(entrega.montoEfectivo) || 0) + 
                          (Number(entrega.montoTransferencia) || 0) + 
                          (Number(entrega.montoCheque) || 0) + 
                          (Number(entrega.montoDeposito) || 0);
    return { totalOrdenes, totalEntregado };
  };

  // Calcular totales generales
  const totalesGenerales = entregasParaImprimir.reduce((acc, entrega) => {
    const { totalOrdenes, totalEntregado } = calcularTotalesPorEntrega(entrega);
    return {
      totalEfectivo: acc.totalEfectivo + (Number(entrega.montoEfectivo) || 0),
      totalTransferencia: acc.totalTransferencia + (Number(entrega.montoTransferencia) || 0),
      totalCheque: acc.totalCheque + (Number(entrega.montoCheque) || 0),
      totalDeposito: acc.totalDeposito + (Number(entrega.montoDeposito) || 0),
      totalEntregado: acc.totalEntregado + totalEntregado,
    };
  }, { totalEfectivo: 0, totalTransferencia: 0, totalCheque: 0, totalDeposito: 0, totalEntregado: 0 });

  // Función para imprimir
  const handleImprimir = () => {
    window.print();
  };

  // Función para guardar como PDF
  const handleGuardarPDF = () => {
    const contenido = document.getElementById('printable-entregas-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Entregas de Dinero</title>
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
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table th, table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            table th { background-color: #f2f2f2; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
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

  const toggleEntrega = (id) => {
    setEntregasSeleccionadas(prev => 
      prev.includes(id) 
        ? prev.filter(eid => eid !== id)
        : [...prev, id]
    );
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-container modal-print">
          <div className="modal-header">
            <h2>Imprimir Entregas de Dinero</h2>
            <div className="modal-actions">
              {/* Selector de entregas */}
              <div style={{ marginRight: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", color: "var(--color-dark-gray)" }}>
                  Seleccionar entregas ({entregasSeleccionadas.length} de {entregas.length})
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", maxHeight: "100px", overflowY: "auto" }}>
                  {entregas.map(ent => (
                    <label key={ent.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
                      <input
                        type="checkbox"
                        checked={entregasSeleccionadas.includes(ent.id)}
                        onChange={() => toggleEntrega(ent.id)}
                      />
                      #{ent.id} - {fmtFecha(ent.fechaEntrega)}
                    </label>
                  ))}
                </div>
              </div>
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
          <div id="printable-entregas-content" className="printable-content">
            {/* Encabezado */}
            <div className="orden-header">
              <h1>ALUMINIOS CASAGLASS S.A.S</h1>
              <h2>Reporte de Entregas de Dinero</h2>
              <p>Fecha de impresión: {new Date().toLocaleDateString("es-CO")}</p>
            </div>

            {/* Listado de entregas */}
            {entregasParaImprimir.map((entrega, idxEntrega) => {
              const { totalOrdenes, totalEntregado } = calcularTotalesPorEntrega(entrega);
              return (
                <div key={entrega.id} style={{ marginBottom: "40px", pageBreakInside: "avoid" }}>
                  {/* Encabezado de entrega */}
                  <div style={{ marginBottom: "20px", padding: "10px", background: "var(--color-light-gray)", borderRadius: "4px" }}>
                    <h3 style={{ margin: "0 0 10px 0", color: "var(--color-dark-blue)" }}>
                      Entrega #{entrega.id} - Fecha: {fmtFecha(entrega.fechaEntrega)}
                    </h3>
                    <p style={{ margin: "5px 0", color: "var(--color-dark-gray)" }}>
                      Sede: {entrega.sede?.nombre || "-"}
                    </p>
                  </div>

                  {/* Tabla de órdenes */}
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Cliente</th>
                        <th>Total Orden</th>
                        <th>Saldo</th>
                        <th>Valor Entregado</th>
                        <th>Medio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrega.detalles?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty">Sin órdenes</td>
                        </tr>
                      ) : (
                        entrega.detalles?.map((detalle, idx) => {
                          // Calcular saldo (si la orden está saldada = 0, sino = montoOrden - valorEntregado)
                          // Asumimos que si no hay más entregas pendientes, el saldo es 0
                          const saldo = detalle.saldoPendiente !== undefined 
                            ? Number(detalle.saldoPendiente) 
                            : (Number(detalle.montoOrden) || 0) - (Number(detalle.valorEntregado) || 0);
                          
                          // Valor entregado en esta entrega (puede venir en el detalle o calcularse)
                          const valorEntregado = Number(detalle.valorEntregado) || 
                                                 (Number(entrega.montoEfectivo) || 0) / (entrega.detalles?.length || 1);
                          
                          // Medio de pago
                          const medio = entrega.modalidadEntrega || 
                                       (entrega.montoEfectivo > 0 ? "EFECTIVO" : 
                                        entrega.montoTransferencia > 0 ? "TRANSFERENCIA" :
                                        entrega.montoCheque > 0 ? "CHEQUE" : "DEPÓSITO");

                          return (
                            <tr key={detalle.id || idx}>
                              <td>{detalle.numeroOrden || "-"}</td>
                              <td>{detalle.clienteNombre || detalle.cliente?.nombre || "-"}</td>
                              <td>${(Number(detalle.montoOrden) || 0).toLocaleString("es-CO")}</td>
                              <td>${Math.max(0, saldo).toLocaleString("es-CO")}</td>
                              <td>${valorEntregado.toLocaleString("es-CO")}</td>
                              <td>{medio}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Subtotal por entrega */}
                  <div className="total" style={{ marginTop: "15px" }}>
                    <p><strong>Subtotal Entrega #{entrega.id}:</strong></p>
                    <p>Efectivo: ${(Number(entrega.montoEfectivo) || 0).toLocaleString("es-CO")}</p>
                    <p>Transferencia: ${(Number(entrega.montoTransferencia) || 0).toLocaleString("es-CO")}</p>
                    <p>Cheque: ${(Number(entrega.montoCheque) || 0).toLocaleString("es-CO")}</p>
                    <p>Depósito: ${(Number(entrega.montoDeposito) || 0).toLocaleString("es-CO")}</p>
                    <p><strong>Total Entregado: ${totalEntregado.toLocaleString("es-CO")}</strong></p>
                  </div>
                </div>
              );
            })}

            {/* Totales generales */}
            {entregasParaImprimir.length > 1 && (
              <div className="total" style={{ marginTop: "30px", borderTop: "2px solid var(--color-dark-blue)", paddingTop: "15px" }}>
                <h3 style={{ margin: "0 0 10px 0", color: "var(--color-dark-blue)" }}>TOTALES GENERALES</h3>
                <p><strong>Total Efectivo: ${totalesGenerales.totalEfectivo.toLocaleString("es-CO")}</strong></p>
                <p><strong>Total Transferencia: ${totalesGenerales.totalTransferencia.toLocaleString("es-CO")}</strong></p>
                <p><strong>Total Cheque: ${totalesGenerales.totalCheque.toLocaleString("es-CO")}</strong></p>
                <p><strong>Total Depósito: ${totalesGenerales.totalDeposito.toLocaleString("es-CO")}</strong></p>
                <p style={{ fontSize: "20px", marginTop: "10px" }}>
                  <strong>TOTAL A ENTREGAR: ${totalesGenerales.totalEntregado.toLocaleString("es-CO")}</strong>
                </p>
              </div>
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
          
          #printable-entregas-content,
          #printable-entregas-content * {
            visibility: visible;
          }
          
          #printable-entregas-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .modal-actions,
          .modal-header button,
          .modal-header select,
          .modal-header label {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

