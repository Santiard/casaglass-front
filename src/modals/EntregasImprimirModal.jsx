import { useEffect, useState } from "react";
import "../styles/EntregasImprimirModal.css";

export default function EntregasImprimirModal({ entregas = [], isOpen, onClose }) {
  const [entregasSeleccionadas, setEntregasSeleccionadas] = useState([]);

  useEffect(() => {
    if (isOpen && entregas.length > 0) {
      // Si hay entregas, seleccionar todas por defecto
      // Esto permite que si se abren desde la tabla con selección previa, se muestren todas
      setEntregasSeleccionadas(entregas.map(e => e.id));
    } else if (isOpen && entregas.length === 0) {
      // Si no hay entregas, limpiar selección
      setEntregasSeleccionadas([]);
    }
  }, [isOpen, entregas]);

  // Si solo hay una entrega, usar todas las entregas directamente (sin filtro)
  const entregasParaImprimir = entregas.length === 1 
    ? entregas 
    : entregas.filter(e => entregasSeleccionadas.includes(e.id));

  if (!isOpen) return null;

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
      totalGastos: acc.totalGastos + (Number(entrega.montoGastos) || 0),
      totalEntregado: acc.totalEntregado + totalEntregado,
    };
  }, { totalEfectivo: 0, totalTransferencia: 0, totalCheque: 0, totalDeposito: 0, totalGastos: 0, totalEntregado: 0 });

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

  const seleccionarTodas = () => {
    setEntregasSeleccionadas(entregas.map(e => e.id));
  };

  const deseleccionarTodas = () => {
    setEntregasSeleccionadas([]);
  };

  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  // Si solo hay una entrega, no mostrar la sección de selección
  const mostrarSeleccion = entregas.length > 1;

  return (
    <>
      <div className="entregas-imprimir-modal-overlay" onClick={onClose}>
        <div className="entregas-imprimir-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="entregas-imprimir-modal-header">
            <h2>Imprimir Entregas de Dinero</h2>
            <div className="entregas-imprimir-buttons">
              <button onClick={handleGuardarPDF} className="btn-imprimir">
                Guardar como PDF
              </button>
              <button onClick={handleImprimir} className="btn-imprimir">
                Imprimir
              </button>
              <button onClick={onClose} className="btn-cerrar">
                Cerrar
              </button>
            </div>
          </div>

          {/* Sección de selección mejorada - Solo mostrar si hay más de una entrega */}
          {mostrarSeleccion && (
          <div className="entregas-seleccion-section">
            <div className="entregas-seleccion-header">
              <h3>Seleccionar Entregas</h3>
              <span className="entregas-seleccion-count">
                {entregasSeleccionadas.length} de {entregas.length} seleccionadas
              </span>
            </div>
            
            <div className="entregas-seleccion-controls">
              <button onClick={seleccionarTodas} disabled={entregasSeleccionadas.length === entregas.length}>
                Seleccionar Todas
              </button>
              <button onClick={deseleccionarTodas} disabled={entregasSeleccionadas.length === 0}>
                Deseleccionar Todas
              </button>
            </div>

            <div className="entregas-seleccion-grid">
              {entregas.map(ent => {
                const monto = Number(ent.monto ?? 0);
                const estaSeleccionada = entregasSeleccionadas.includes(ent.id);
                return (
                  <div
                    key={ent.id}
                    className={`entregas-seleccion-item ${estaSeleccionada ? 'selected' : ''}`}
                    onClick={() => toggleEntrega(ent.id)}
                  >
                    <input
                      type="checkbox"
                      checked={estaSeleccionada}
                      onChange={() => toggleEntrega(ent.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="entregas-seleccion-item-info">
                      <div className="entregas-seleccion-item-numero">
                        Entrega #{ent.id}
                      </div>
                      <div className="entregas-seleccion-item-fecha">
                        {fmtFecha(ent.fechaEntrega)}
                      </div>
                      <div className="entregas-seleccion-item-monto">
                        {fmtCOP(monto)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

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
                  <div className="entrega-header">
                    <h3>
                      Entrega #{entrega.id} - Fecha: {fmtFecha(entrega.fechaEntrega)}
                    </h3>
                    <p>
                      Sede: {entrega.sede?.nombre || "-"}
                    </p>
                  </div>

                  {/* Tabla de órdenes */}
                  <table className="entregas-imprimir-table">
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
                          // Calcular valor entregado según tipo de venta
                          let valorEntregado = 0;
                          if (!detalle.ventaCredito) {
                            // Orden A CONTADO: se entrega el monto completo
                            valorEntregado = Number(detalle.montoOrden) || 0;
                          } else {
                            // Orden A CRÉDITO: usar abonos del período (calculado por el backend)
                            valorEntregado = Number(detalle.abonosDelPeriodo) || 0;
                          }
                          
                          // Calcular saldo
                          const saldo = detalle.ventaCredito 
                            ? Math.max(0, (Number(detalle.montoOrden) || 0) - valorEntregado)
                            : 0; // Contado siempre tiene saldo 0
                          
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
                              <td>${saldo.toLocaleString("es-CO")}</td>
                              <td>${valorEntregado.toLocaleString("es-CO")}</td>
                              <td>{medio}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Descripción de métodos de pago */}
                  {(() => {
                    // Recopilar descripciones de métodos de pago de los detalles
                    const descripciones = [];
                    
                    entrega.detalles?.forEach((detalle) => {
                    if (!detalle.ventaCredito) {
                        // Orden a contado: el backend envía la descripción en detalle.descripcion
                        // Este campo contiene el string con el método de pago de la orden
                        const desc = detalle.descripcion || "";
                        if (desc && desc.trim()) {
                          descripciones.push(`Orden #${detalle.numeroOrden}:\n${desc}`);
                        }
                      } else {
                        // Orden a crédito (abono): el backend envía el método de pago en detalle.metodoPago
                        // Este campo contiene el string con el método de pago del abono
                        const metodoPago = detalle.metodoPago || "";
                        if (metodoPago && metodoPago.trim()) {
                          descripciones.push(`Abono Orden #${detalle.numeroOrden}:\n${metodoPago}`);
                        }
                      }
                    });
                    
                    // Solo mostrar la sección si hay descripciones
                    if (descripciones.length === 0) return null;
                    
                    return (
                      <div className="metodos-pago-descripcion" style={{ marginTop: "20px", marginBottom: "20px" }}>
                        <h4 className="metodos-pago-titulo" style={{ marginBottom: "10px", color: "var(--color-dark-blue)", fontSize: "1rem", fontWeight: "600" }}>
                          Descripción de Métodos de Pago
                        </h4>
                        <div 
                          className="metodos-pago-descripcion-box"
                          style={{ 
                          background: "#f8f9fa", 
                          padding: "12px", 
                          borderRadius: "6px", 
                          border: "1px solid #e0e0e0",
                          whiteSpace: "pre-wrap",
                          fontSize: "0.85rem",
                          lineHeight: "1.6",
                          color: "#333",
                          fontFamily: "monospace"
                        }}>
                          {descripciones.join("\n\n")}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabla de gastos */}
                  {entrega.gastos && Array.isArray(entrega.gastos) && entrega.gastos.length > 0 && (
                    <div style={{ marginTop: "30px" }}>
                      <h4 style={{ marginBottom: "10px", color: "var(--color-dark-blue)" }}>Gastos Asociados</h4>
                      <table className="entregas-imprimir-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Concepto</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Empleado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entrega.gastos.map((gasto, idx) => (
                            <tr key={gasto.id || idx}>
                              <td>#{gasto.id || "-"}</td>
                              <td>{fmtFecha(gasto.fechaGasto)}</td>
                              <td>{gasto.concepto || gasto.descripcion || "-"}</td>
                              <td>{gasto.tipo || "OPERATIVO"}</td>
                              <td>${(Number(gasto.monto) || 0).toLocaleString("es-CO")}</td>
                              <td>{gasto.empleadoNombre || gasto.empleado?.nombre || "-"}</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                            <td colSpan={4} style={{ textAlign: "right" }}>Total Gastos:</td>
                            <td colSpan={2}>${(Number(entrega.montoGastos) || 0).toLocaleString("es-CO")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Subtotal por entrega */}
                  <div className="total" style={{ marginTop: "15px" }}>
                    <p><strong>Subtotal Entrega #{entrega.id}:</strong></p>
                    <p>Efectivo: ${(Number(entrega.montoEfectivo) || 0).toLocaleString("es-CO")}</p>
                    <p>Transferencia: ${(Number(entrega.montoTransferencia) || 0).toLocaleString("es-CO")}</p>
                    <p>Cheque: ${(Number(entrega.montoCheque) || 0).toLocaleString("es-CO")}</p>
                    <p>Depósito: ${(Number(entrega.montoDeposito) || 0).toLocaleString("es-CO")}</p>
                    <p>Total Gastos: ${(Number(entrega.montoGastos) || 0).toLocaleString("es-CO")}</p>
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
                <p><strong>Total Gastos: ${totalesGenerales.totalGastos.toLocaleString("es-CO")}</strong></p>
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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          #printable-entregas-content,
          #printable-entregas-content * {
            visibility: visible;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          #printable-entregas-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            min-height: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .entregas-imprimir-modal-header,
          .entregas-seleccion-section,
          .entregas-imprimir-buttons,
          .btn-imprimir,
          .btn-cerrar {
            display: none !important;
          }

          .metodos-pago-descripcion-box {
            background: transparent !important;
            border: 1px solid #000 !important;
            color: #000 !important;
          }

          .metodos-pago-titulo {
            color: #000 !important;
          }
        }
      `}</style>
    </>
  );
}

