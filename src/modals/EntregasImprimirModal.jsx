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
      // totalGastos eliminado - ya no se usan gastos en entregas
      totalEntregado: acc.totalEntregado + totalEntregado,
    };
  }, { totalEfectivo: 0, totalTransferencia: 0, totalCheque: 0, totalDeposito: 0, totalEntregado: 0 });

  // Función para crear ventana de impresión (compartida entre imprimir y PDF)
  const crearVentanaImpresion = () => {
    const contenido = document.getElementById('printable-entregas-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Entregas de Dinero</title>
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
            
            .entrega-header {
              margin-bottom: 8px;
              padding: 6px 8px;
              background: #f8f9fa;
              border-radius: 4px;
              border-left: 3px solid #000;
            }
            
            .entrega-header h3 {
              margin: 0 0 2px 0;
              color: #000;
              font-size: 0.95rem;
              font-weight: 600;
            }
            
            .entrega-header p {
              margin: 1px 0;
              color: #666;
              font-size: 0.75rem;
            }
            
            .entregas-imprimir-table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: 0.75rem;
              page-break-inside: auto;
            }
            
            .entregas-imprimir-table thead {
              display: table-header-group;
              background-color: #1e2753;
              color: #fff;
            }
            
            .entregas-imprimir-table th {
              padding: 4px 6px;
              text-align: left;
              font-weight: 600;
              font-size: 0.7rem;
              border: 1px solid #1e2753;
            }
            
            .entregas-imprimir-table td {
              padding: 3px 6px;
              border-bottom: 1px solid #e0e0e0;
              border-right: 1px solid #f0f0f0;
              font-size: 0.7rem;
              color: #333;
            }
            
            .entregas-imprimir-table tbody tr {
              page-break-inside: avoid;
            }
            
            .entregas-imprimir-table tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .entregas-imprimir-table .empty {
              text-align: center;
              color: #999;
              padding: 10px;
              font-style: italic;
            }
            
            .metodos-pago-descripcion {
              margin-top: 8px;
              margin-bottom: 8px;
            }
            
            .metodos-pago-titulo {
              margin-bottom: 4px;
              color: #1e2753;
              font-size: 0.8rem;
              font-weight: 600;
            }
            
            .metodos-pago-descripcion-box {
              background: #f8f9fa;
              padding: 6px 8px;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
              white-space: pre-wrap;
              font-size: 0.7rem;
              line-height: 1.4;
              color: #333;
              font-family: monospace;
            }
            
            .total {
              margin-top: 8px;
              padding: 6px 8px;
              background: #f8f9fa;
              border-radius: 4px;
            }
            
            .total-horizontal {
              text-align: left;
            }
            
            .total-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              align-items: center;
              justify-content: flex-start;
            }
            
            .total-row span {
              font-size: 0.75rem;
              color: #333;
              white-space: nowrap;
            }
            
            .total-row span strong {
              color: #1e2753;
              font-weight: 600;
            }
            
            .total h3 {
              margin: 0 0 4px 0;
              color: #1e2753;
              width: 100%;
              font-size: 0.85rem;
            }
            
            @media print {
              .entregas-imprimir-table thead {
                background-color: transparent !important;
                color: #000 !important;
              }
              
              .entregas-imprimir-table th {
                background-color: transparent !important;
                color: #000 !important;
                border: 1px solid #000 !important;
              }
              
              .entregas-imprimir-table td {
                color: #000 !important;
                border: 1px solid #000 !important;
              }
              
              .entregas-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              .entrega-header {
                background: transparent !important;
                border-left: 2px solid #000 !important;
              }
              
              .total {
                background: transparent !important;
                border: 1px solid #000 !important;
              }
              
              .metodos-pago-descripcion-box {
                background: transparent !important;
                border: 1px solid #000 !important;
                color: #000 !important;
              }
              
              .entrega-header h3,
              .metodos-pago-titulo,
              .total h3 {
                color: #000 !important;
              }
              
              .total-row span {
                color: #000 !important;
              }
              
              .total-row span strong {
                color: #000 !important;
              }
            }
          </style>
        </head>
        <body>
          ${contenido}
          <script>
            // Cerrar la ventana después de imprimir o cancelar
            var timeoutId;
            
            function cerrarVentana() {
              if (!window.closed) {
                window.close();
              }
            }
            
            // Escuchar el evento afterprint (cuando se completa la impresión o se cancela)
            window.addEventListener('afterprint', function() {
              clearTimeout(timeoutId);
              setTimeout(cerrarVentana, 100);
            });
            
            // Fallback: cerrar después de un tiempo si el evento no se dispara
            // Esto es necesario porque algunos navegadores no disparan afterprint correctamente
            timeoutId = setTimeout(cerrarVentana, 5000);
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
    // Esperar a que la ventana cargue antes de imprimir
    ventana.onload = () => {
      ventana.print();
    };
  };

  // Función para guardar como PDF
  const handleGuardarPDF = () => {
    const ventana = crearVentanaImpresion();
    // Esperar a que la ventana cargue antes de imprimir
    ventana.onload = () => {
    ventana.print();
    };
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
            {/* Listado de entregas */}
            {entregasParaImprimir.map((entrega, idxEntrega) => {
              const { totalOrdenes, totalEntregado } = calcularTotalesPorEntrega(entrega);
              return (
                <div key={entrega.id} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
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
                        <th>Retención</th>
                        <th>Medio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrega.detalles?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="empty">Sin órdenes</td>
                        </tr>
                      ) : (
                        entrega.detalles?.map((detalle, idx) => {
                          // 🆕 DETECTAR SI ES DEVOLUCIÓN: solo si tiene reembolsoId (es un reembolso real)
                          const esDevolucion = Boolean(detalle.reembolsoId);
                          
                          // Calcular valor entregado según tipo de venta
                          let valorEntregado = 0;
                          if (!detalle.ventaCredito) {
                            // Orden A CONTADO: se entrega el monto completo
                            valorEntregado = Number(detalle.montoOrden) || 0;
                          } else {
                            // Orden A CRÉDITO: usar abonos del período (calculado por el backend)
                            valorEntregado = Number(detalle.abonosDelPeriodo) || 0;
                          }
                          
                          // Si es devolución, el valor es negativo
                          if (esDevolucion) {
                            valorEntregado = -Math.abs(valorEntregado);
                          }
                          
                          // Calcular saldo
                          const saldo = detalle.ventaCredito 
                            ? Math.max(0, (Number(detalle.montoOrden) || 0) - Math.abs(valorEntregado))
                            : 0; // Contado siempre tiene saldo 0
                          
                          // Medio de pago - extraer del detalle individual
                          let medio = "MIXTO"; // Por defecto
                          
                          if (!detalle.ventaCredito) {
                            // Orden a CONTADO: extraer de detalle.descripcion
                            const desc = detalle.descripcion || "";
                            if (desc && desc.trim()) {
                              // Parsear la descripción para extraer métodos de pago
                              // Formato típico: "EFECTIVO: 100.000 | TRANSFERENCIA: 50.000"
                              const partes = desc.toUpperCase().split('|').map(p => p.trim());
                              const metodosEncontrados = [];
                              
                              for (const parte of partes) {
                                // Ignorar RETEFUENTE (es una deducción, no un método de pago)
                                if (parte.includes('RETEFUENTE')) continue;
                                
                                if (parte.includes('EFECTIVO')) {
                                  metodosEncontrados.push('EFECTIVO');
                                } else if (parte.includes('TRANSFERENCIA')) {
                                  metodosEncontrados.push('TRANSFERENCIA');
                                } else if (parte.includes('CHEQUE')) {
                                  metodosEncontrados.push('CHEQUE');
                                } else if (parte.includes('DEPÓSITO') || parte.includes('DEPOSITO')) {
                                  metodosEncontrados.push('DEPÓSITO');
                                }
                              }
                              
                              // Si hay un solo método, usarlo; si hay múltiples, usar MIXTO
                              if (metodosEncontrados.length === 1) {
                                medio = metodosEncontrados[0];
                              } else if (metodosEncontrados.length > 1) {
                                medio = "MIXTO";
                              }
                            }
                            
                            // Si no se pudo extraer de la descripción, usar el de la entrega como fallback
                            if (medio === "MIXTO" && !desc.trim()) {
                              medio = entrega.modalidadEntrega || 
                                      (entrega.montoEfectivo > 0 ? "EFECTIVO" : 
                                       entrega.montoTransferencia > 0 ? "TRANSFERENCIA" :
                                       entrega.montoCheque > 0 ? "CHEQUE" : "DEPÓSITO");
                            }
                          } else {
                            // Orden a CRÉDITO (abono): usar detalle.metodoPago
                            // Formato: "EFECTIVO: 100.000 | TRANSFERENCIA: 50.000 (Banco de Bogotá) | RETEFUENTE Orden #1057: 12.500"
                            const metodoPago = detalle.metodoPago || "";
                            if (metodoPago && metodoPago.trim()) {
                              // Parsear el método de pago del abono
                              const metodoUpper = metodoPago.toUpperCase();
                              // Dividir por " | " para obtener cada método
                              const partes = metodoUpper.split('|').map(p => p.trim());
                              const metodosEncontrados = [];
                              
                              for (const parte of partes) {
                                // Ignorar RETEFUENTE (es una deducción, no un método de pago)
                                if (parte.includes('RETEFUENTE')) continue;
                                
                                if (parte.includes('EFECTIVO')) {
                                  metodosEncontrados.push('EFECTIVO');
                                } else if (parte.includes('TRANSFERENCIA')) {
                                  metodosEncontrados.push('TRANSFERENCIA');
                                } else if (parte.includes('CHEQUE')) {
                                  metodosEncontrados.push('CHEQUE');
                                } else if (parte.includes('DEPÓSITO') || parte.includes('DEPOSITO')) {
                                  metodosEncontrados.push('DEPÓSITO');
                                }
                              }
                              
                              // Si hay un solo método, usarlo; si hay múltiples, usar MIXTO
                              if (metodosEncontrados.length === 1) {
                                medio = metodosEncontrados[0];
                              } else if (metodosEncontrados.length > 1) {
                                medio = "MIXTO";
                              } else {
                                // Si no se encontró ningún método reconocido, usar el string completo o fallback
                                medio = metodoPago.length > 50 ? "MIXTO" : metodoPago;
                              }
                            } else {
                              // Fallback: usar el de la entrega
                              medio = entrega.modalidadEntrega || 
                                      (entrega.montoEfectivo > 0 ? "EFECTIVO" : 
                                       entrega.montoTransferencia > 0 ? "TRANSFERENCIA" :
                                       entrega.montoCheque > 0 ? "CHEQUE" : "DEPÓSITO");
                            }
                          }

                          // Extraer retención del método de pago
                          let retencion = null;
                          const metodoPagoStr = detalle.ventaCredito ? (detalle.metodoPago || "") : (detalle.descripcion || "");
                          const retencionMatch = metodoPagoStr.match(/RETEFUENTE.*?:\s*([0-9.,]+)/i);
                          if (retencionMatch) {
                            retencion = retencionMatch[1];
                          }

                          return (
                            <tr 
                              key={detalle.id || idx}
                              style={esDevolucion ? {
                                backgroundColor: '#ffebee',
                                borderLeft: '4px solid #c62828'
                              } : {}}
                            >
                              <td>
                                {esDevolucion && (
                                  <span style={{
                                    display: 'inline-block',
                                    marginRight: '0.5rem',
                                    padding: '0.1rem 0.4rem',
                                    backgroundColor: '#c62828',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold'
                                  }}>🔄 DEVOLUCIÓN</span>
                                )}
                                {detalle.numeroOrden || "-"}
                              </td>
                              <td>{detalle.clienteNombre || detalle.cliente?.nombre || "-"}</td>
                              <td>${(Number(detalle.montoOrden) || 0).toLocaleString("es-CO")}</td>
                              <td>${saldo.toLocaleString("es-CO")}</td>
                              <td style={esDevolucion ? {
                                color: '#c62828',
                                fontWeight: 'bold'
                              } : {}}>
                                {esDevolucion && '−'}
                                ${Math.abs(valorEntregado).toLocaleString("es-CO")}
                              </td>
                              <td>{retencion ? `$${retencion}` : "-"}</td>
                              <td>{medio}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Descripción de métodos de pago */}
                  {(() => {
                    // Estructura para agrupar por método de pago y monto
                    const metodosPago = {};
                    // Formato: { "EFECTIVO|1000000": {tipo, monto, cliente, ordenes: [{orden, retencion}]} }
                    
                    entrega.detalles?.forEach((detalle) => {
                      const numeroOrden = detalle.numeroOrden;
                      const esAbono = detalle.ventaCredito;
                      const nombreCliente = detalle.clienteNombre || detalle.cliente?.nombre || "Cliente";
                      let metodoPagoStr = "";
                      
                      // 🔍 DEBUG: Ver qué tiene cada detalle
                      console.log(`🔍 [Impresión] Orden #${numeroOrden}:`, {
                        esAbono,
                        ventaCredito: detalle.ventaCredito,
                        descripcion: detalle.descripcion,
                        metodoPago: detalle.metodoPago,
                        montoEfectivo: detalle.montoEfectivo,
                        montoTransferencia: detalle.montoTransferencia
                      });
                      
                      // Obtener el string completo del método de pago
                      if (esAbono) {
                        // Para abonos: usar metodoPago
                        metodoPagoStr = detalle.metodoPago || "";
                      } else {
                        // Para órdenes a contado: usar descripcion
                        metodoPagoStr = detalle.descripcion || "";
                        
                        // Normalizar formato alternativo del backend (con saltos de línea)
                        if (metodoPagoStr.includes('\n') || metodoPagoStr.includes('Método de pago:')) {
                          const lineas = metodoPagoStr.split('\n').map(l => l.trim()).filter(Boolean);
                          const partes = [];
                          
                          lineas.forEach(linea => {
                            // Parsear "Efectivo: $6.500.000"
                            const efectivoMatch = linea.match(/Efectivo:\s*\$?([\d.,]+)/i);
                            if (efectivoMatch) {
                              partes.push(`EFECTIVO: ${efectivoMatch[1]}`);
                            }
                            
                            // Parsear "Transferencia: BANCOLOMBIA - Monto: $30.000.000"
                            const transferenciaMatch = linea.match(/Transferencia:\s*([A-Z\s]+)\s*-\s*Monto:\s*\$?([\d.,]+)/i);
                            if (transferenciaMatch) {
                              const banco = transferenciaMatch[1].trim();
                              const monto = transferenciaMatch[2];
                              partes.push(`TRANSFERENCIA: ${monto} (${banco})`);
                            }
                            
                            // Parsear "Cheque: $100.000"
                            const chequeMatch = linea.match(/Cheque:\s*\$?([\d.,]+)/i);
                            if (chequeMatch) {
                              partes.push(`CHEQUE: ${chequeMatch[1]}`);
                            }
                          });
                          
                          metodoPagoStr = partes.join(' | ');
                        }
                      }
                      
                      console.log(`🔍 [Impresión] Orden #${numeroOrden} - metodoPagoStr:`, metodoPagoStr);
                      
                      if (!metodoPagoStr.trim()) return;
                      
                      // Parsear el string para extraer cada método de pago
                      const partes = metodoPagoStr.split('|').map(p => p.trim());
                      let retencion = null;
                      
                      partes.forEach(parte => {
                        // Extraer RETEFUENTE (solo una vez por orden)
                        const retencionMatch = parte.match(/RETEFUENTE.*?:\s*([0-9.,]+)/i);
                        if (retencionMatch) {
                          retencion = retencionMatch[1];
                          return; // No procesar como método de pago
                        }
                        
                        // EFECTIVO
                        const efectivoMatch = parte.match(/EFECTIVO:\s*([0-9.,]+)/i);
                        if (efectivoMatch) {
                          const monto = efectivoMatch[1];
                          const clave = `EFECTIVO|${monto}`;
                          if (!metodosPago[clave]) {
                            metodosPago[clave] = {
                              tipo: "EFECTIVO",
                              monto: monto,
                              cliente: nombreCliente,
                              ordenes: []
                            };
                          }
                          metodosPago[clave].ordenes.push({
                            orden: numeroOrden,
                            esAbono,
                            retencion: null
                          });
                        }
                        
                        // TRANSFERENCIA (con banco)
                        const transferenciaMatch = parte.match(/TRANSFERENCIA:\s*([0-9.,]+)\s*\(([^)]+)\)/i);
                        if (transferenciaMatch) {
                          const monto = transferenciaMatch[1];
                          const banco = transferenciaMatch[2].trim();
                          const clave = `TRANSFERENCIA ${banco}|${monto}`;
                          if (!metodosPago[clave]) {
                            metodosPago[clave] = {
                              tipo: `TRANSFERENCIA ${banco}`,
                              monto: monto,
                              cliente: nombreCliente,
                              ordenes: []
                            };
                          }
                          metodosPago[clave].ordenes.push({
                            orden: numeroOrden,
                            esAbono,
                            retencion: null
                          });
                        }
                        
                        // CHEQUE
                        const chequeMatch = parte.match(/CHEQUE:\s*([0-9.,]+)/i);
                        if (chequeMatch) {
                          const monto = chequeMatch[1];
                          const clave = `CHEQUE|${monto}`;
                          if (!metodosPago[clave]) {
                            metodosPago[clave] = {
                              tipo: "CHEQUE",
                              monto: monto,
                              cliente: nombreCliente,
                              ordenes: []
                            };
                          }
                          metodosPago[clave].ordenes.push({
                            orden: numeroOrden,
                            esAbono,
                            retencion: null
                          });
                        }
                        
                        // DEPÓSITO
                        const depositoMatch = parte.match(/DEP[OÓ]SITO:\s*([0-9.,]+)/i);
                        if (depositoMatch) {
                          const monto = depositoMatch[1];
                          const clave = `DEPÓSITO|${monto}`;
                          if (!metodosPago[clave]) {
                            metodosPago[clave] = {
                              tipo: "DEPÓSITO",
                              monto: monto,
                              cliente: nombreCliente,
                              ordenes: []
                            };
                          }
                          metodosPago[clave].ordenes.push({
                            orden: numeroOrden,
                            esAbono,
                            retencion: null
                          });
                        }
                      });
                      
                      // Agregar la retención a la orden correspondiente
                      if (retencion) {
                        for (const clave in metodosPago) {
                          const grupo = metodosPago[clave];
                          const ordenItem = grupo.ordenes.find(o => o.orden === numeroOrden && !o.retencion);
                          if (ordenItem) {
                            ordenItem.retencion = retencion;
                            break;
                          }
                        }
                      }
                    });
                    
                    // Generar las líneas agrupadas por método de pago
                    const lineas = [];
                    
                    // Agrupar por cliente primero
                    const porCliente = {};
                    Object.keys(metodosPago).forEach(clave => {
                      const grupo = metodosPago[clave];
                      if (!porCliente[grupo.cliente]) {
                        porCliente[grupo.cliente] = [];
                      }
                      porCliente[grupo.cliente].push({ clave, grupo });
                    });
                    
                    // Generar líneas ordenadas por cliente
                    Object.keys(porCliente).sort().forEach(cliente => {
                      const pagosCliente = porCliente[cliente];
                      
                      pagosCliente.forEach(({ clave, grupo }) => {
                        // Encabezado del método con cliente y monto
                        lineas.push(`${grupo.cliente} - ${grupo.tipo}: $${grupo.monto}`);
                        
                        // Listar órdenes de este método
                        grupo.ordenes.forEach(item => {
                          const prefijo = item.esAbono ? "ABONO Orden" : "Orden";
                          let linea = `${prefijo} #${item.orden}`;
                          
                          if (item.retencion) {
                            linea += ` | (-) Retención: $${item.retencion}`;
                          }
                          
                          lineas.push(linea);
                        });
                        
                        lineas.push(""); // Línea vacía entre métodos
                      });
                    });
                    
                    // Solo mostrar la sección si hay líneas
                    if (lineas.length === 0) return null;
                    
                    return (
                      <div className="metodos-pago-descripcion" style={{ marginTop: "8px", marginBottom: "8px" }}>
                        <h4 className="metodos-pago-titulo" style={{ marginBottom: "4px", color: "var(--color-dark-blue)", fontSize: "0.8rem", fontWeight: "600" }}>
                          Descripción de Métodos de Pago
                        </h4>
                        <div 
                          className="metodos-pago-descripcion-box"
                          style={{ 
                          background: "#f8f9fa", 
                          padding: "6px 8px", 
                          borderRadius: "4px", 
                          border: "1px solid #e0e0e0",
                          whiteSpace: "pre-wrap",
                          fontSize: "0.7rem",
                          lineHeight: "1.4",
                          color: "#333",
                          fontFamily: "monospace"
                        }}>
                          {lineas.join("\n")}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sección de gastos eliminada - ya no se usan gastos en entregas */}

                  {/* Subtotal por entrega */}
                  <div className="total total-horizontal" style={{ marginTop: "8px" }}>
                    <div className="total-row">
                      <span><strong>Subtotal Entrega #{entrega.id}: </strong></span>
                      <span>Efectivo: ${(Number(entrega.montoEfectivo) || 0).toLocaleString("es-CO")} | </span>
                      <span>Transferencia: ${(Number(entrega.montoTransferencia) || 0).toLocaleString("es-CO")} | </span>
                      <span>Cheque: ${(Number(entrega.montoCheque) || 0).toLocaleString("es-CO")} | </span>
                      <span>Depósito: ${(Number(entrega.montoDeposito) || 0).toLocaleString("es-CO")} | </span>
                      {/* Total Gastos eliminado - ya no se usan gastos en entregas */}
                      <span><strong>Total Entregado: ${totalEntregado.toLocaleString("es-CO")}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Totales generales */}
            {entregasParaImprimir.length > 1 && (
              <div className="total total-horizontal" style={{ marginTop: "15px", borderTop: "2px solid var(--color-dark-blue)", paddingTop: "8px" }}>
                <h3 style={{ margin: "0 0 4px 0", color: "var(--color-dark-blue)", width: "100%", fontSize: "0.85rem" }}>TOTALES GENERALES</h3>
                <div className="total-row">
                  <span><strong>Total Efectivo: ${totalesGenerales.totalEfectivo.toLocaleString("es-CO")}</strong></span>
                  <span><strong>Total Transferencia: ${totalesGenerales.totalTransferencia.toLocaleString("es-CO")}</strong></span>
                  <span><strong>Total Cheque: ${totalesGenerales.totalCheque.toLocaleString("es-CO")}</strong></span>
                  <span><strong>Total Depósito: ${totalesGenerales.totalDeposito.toLocaleString("es-CO")}</strong></span>
                  {/* Total Gastos eliminado - ya no se usan gastos en entregas */}
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                    <strong>TOTAL A ENTREGAR: ${totalesGenerales.totalEntregado.toLocaleString("es-CO")}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

