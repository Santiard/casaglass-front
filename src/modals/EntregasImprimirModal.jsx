import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/EntregasImprimirModal.css";

export default function EntregasImprimirModal({ entregas = [], isOpen, onClose }) {
  const [entregasSeleccionadas, setEntregasSeleccionadas] = useState([]);
  const { isAdmin } = useAuth();

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

  useEffect(() => {
    if (!isOpen || entregasParaImprimir.length === 0) return;

    // DEBUG: volcar detalles crudos para verificar campos que llegan del backend
    console.log('[EntregasImprimirModal] RAW detalles por entrega:');
    entregasParaImprimir.forEach((entrega) => {
      console.log(`  Entrega #${entrega.id} — detalles (${(entrega.detalles || []).length}):`, entrega.detalles);
    });

    console.groupCollapsed(
      `[EntregasImprimirModal] Verificación de mapeo de medios - entrega(s): ${entregasParaImprimir.map(e => e.id).join(', ')}`
    );

    entregasParaImprimir.forEach((entrega) => {
      console.groupCollapsed(
        `[Entrega #${entrega.id}] ${entrega.sedeNombre || entrega.sede?.nombre || 'Sin sede'} - ${entrega.fechaEntrega || 'Sin fecha'}`
      );

      (entrega.detalles || []).forEach((detalle, index) => {
        const textoBase = detalle.ventaCredito ? (detalle.metodoPago || '') : (detalle.descripcion || '');
        const { medio, metodosDetectados } = resolverMedioPagoDesdeTexto(textoBase);

        const efectivo = parseNumeroMonto((textoBase.match(/Efectivo:\s*\$?([\d.,]+)/i) || [])[1]);
        const transferencia = (() => {
          let total = 0;
          const regex = /Transferencia:\s*.*?(?:-\s*Monto:\s*\$?|:\s*\$?)([\d.,]+)/gi;
          let match;
          while ((match = regex.exec(textoBase)) !== null) {
            total += parseNumeroMonto(match[1]);
          }
          return total;
        })();
        const cheque = parseNumeroMonto((textoBase.match(/Cheque:\s*\$?([\d.,]+)/i) || [])[1]);
        const deposito = parseNumeroMonto((textoBase.match(/Dep[oó]sito:\s*\$?([\d.,]+)/i) || [])[1]);

        console.log(`[Entrega #${entrega.id}] Orden #${detalle.numeroOrden || detalle.ordenId || detalle.id || index + 1}`, {
          cliente: detalle.clienteNombre || '-',
          ventaCredito: Boolean(detalle.ventaCredito),
          valorEntregado: detalle.ventaCredito
            ? Number(detalle.abonosDelPeriodo) || 0
            : (Number(detalle.total) || 0) - (Number(detalle.retencionFuente) || 0) - (Number(detalle.retencionIca) || 0),
          medioDerivado: medio || 'SIN DETECTAR',
          metodosDetectados,
          montoEfectivoDetectado: efectivo,
          montoTransferenciaDetectado: transferencia,
          montoChequeDetectado: cheque,
          montoDepositoDetectado: deposito,
          modalidadEntregaFallback: entrega.modalidadEntrega || null,
          descripcion: detalle.descripcion || null,
          metodoPago: detalle.metodoPago || null,
        });
      });

      console.groupEnd();
    });

    console.groupEnd();
  }, [isOpen, entregasParaImprimir]);

  // Extraer resumen del mes de la primera entrega (todas tienen los mismos datos del mes)
  const resumenMes = entregasParaImprimir.length > 0 ? entregasParaImprimir[0].resumenMes : null;

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

  const parseNumeroMonto = (texto) => {
    if (!texto) return 0;
    const limpio = String(texto).replace(/[\s$]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const valor = Number(limpio);
    return Number.isFinite(valor) ? valor : 0;
  };

  const resolverMedioPagoDesdeTexto = (texto) => {
    const desc = String(texto || "");
    if (!desc.trim()) return { medio: null, metodosDetectados: [] };

    const efectivo = parseNumeroMonto((desc.match(/Efectivo:\s*\$?([\d.,]+)/i) || [])[1]);
    const cheques = parseNumeroMonto((desc.match(/Cheque:\s*\$?([\d.,]+)/i) || [])[1]);
    const depositos = parseNumeroMonto((desc.match(/Dep[oó]sito:\s*\$?([\d.,]+)/i) || [])[1]);

    let transferencias = 0;
    const transferenciasRegex = /Transferencia:\s*.*?(?:-\s*Monto:\s*\$?|:\s*\$?)([\d.,]+)/gi;
    let match;
    while ((match = transferenciasRegex.exec(desc)) !== null) {
      transferencias += parseNumeroMonto(match[1]);
    }

    const metodosDetectados = [];
    if (efectivo > 0) metodosDetectados.push("EFECTIVO");
    if (transferencias > 0) metodosDetectados.push("TRANSFERENCIA");
    if (cheques > 0) metodosDetectados.push("CHEQUE");
    if (depositos > 0) metodosDetectados.push("DEPÓSITO");

    let medio = null;
    if (metodosDetectados.length === 1) {
      medio = metodosDetectados[0];
    } else if (metodosDetectados.length > 1) {
      medio = "MIXTO";
    }

    return { medio, metodosDetectados };
  };

  const obtenerMontosDetalle = (detalle) => {
    return {
      efectivo: Number(detalle?.montoEfectivo) || 0,
      transferencia: Number(detalle?.montoTransferencia) || 0,
      cheque: Number(detalle?.montoCheque) || 0,
      deposito: Number(detalle?.montoDeposito) || 0,
    };
  };

  const normalizarMedioPago = (medioRaw) => {
    const medio = String(medioRaw || "").toUpperCase().trim();
    if (!medio) return null;
    if (medio === "DEPOSITO") return "DEPÓSITO";
    if (["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "DEPÓSITO", "MIXTO"].includes(medio)) {
      return medio;
    }
    return null;
  };

  const resolverMedioPagoDetalle = (detalle, entrega) => {
    // 1) Priorizar campo estructurado del backend
    const medioBackend = normalizarMedioPago(detalle?.medioPago);
    if (medioBackend) return medioBackend;

    // 2) Derivar por montos estructurados del detalle
    const montos = obtenerMontosDetalle(detalle);
    const metodosConValor = [];
    if (montos.efectivo > 0) metodosConValor.push("EFECTIVO");
    if (montos.transferencia > 0) metodosConValor.push("TRANSFERENCIA");
    if (montos.cheque > 0) metodosConValor.push("CHEQUE");
    if (montos.deposito > 0) metodosConValor.push("DEPÓSITO");

    if (metodosConValor.length === 1) return metodosConValor[0];
    if (metodosConValor.length > 1) return "MIXTO";

    // 3) Fallback a texto legado
    const textoBase = detalle?.ventaCredito ? (detalle?.metodoPago || "") : (detalle?.descripcion || "");
    const { medio } = resolverMedioPagoDesdeTexto(textoBase);
    if (medio) return medio;

    // 4) Fallback final: modalidad de entrega / montos globales de la entrega
    return entrega?.modalidadEntrega ||
      (Number(entrega?.montoEfectivo) > 0 ? "EFECTIVO" :
       Number(entrega?.montoTransferencia) > 0 ? "TRANSFERENCIA" :
       Number(entrega?.montoCheque) > 0 ? "CHEQUE" :
       Number(entrega?.montoDeposito) > 0 ? "DEPÓSITO" :
       "MIXTO");
  };

  /** Totales persistidos en cabecera al crear/editar la entrega (lista / GET por id). */
  const totalesDesdeCabecera = (entrega) => ({
    monto: Math.round(Number(entrega?.monto) || 0),
    montoEfectivo: Math.round(Number(entrega?.montoEfectivo) || 0),
    montoTransferencia: Math.round(Number(entrega?.montoTransferencia) || 0),
    montoCheque: Math.round(Number(entrega?.montoCheque) || 0),
    montoDeposito: Math.round(Number(entrega?.montoDeposito) || 0),
    montoRetencion: Math.round(Number(entrega?.montoRetencion) || 0),
  });

  /** Lee un número del DTO probando camelCase / PascalCase (serialización Java típica). */
  const leerBucketMedio = (d, camel, pascal) => {
    const raw = d?.[camel] ?? d?.[pascal];
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };

  /**
   * Impresión / verificación por caja: si GET envía totalesPorMedioDesdeDetalles (suma de buckets por línea),
   * usar esos montos por medio; si no existe, viene vacío o suma 0 con datos en cabecera → cabecera persistida.
   * Total neto con derivado = suma por medio + retención cabecera.
   */
  const totalesPorMedioParaImpresion = (entrega) => {
    const cab = totalesDesdeCabecera(entrega);
    const sumCabMedios =
      cab.montoEfectivo +
      cab.montoTransferencia +
      cab.montoCheque +
      cab.montoDeposito;

    const d =
      entrega?.totalesPorMedioDesdeDetalles ??
      entrega?.TotalesPorMedioDesdeDetalles;
    const tieneDto =
      d != null && typeof d === "object" && !Array.isArray(d);

    if (!tieneDto) {
      return { ...cab, usaTotalesDerivadosDetalle: false };
    }

    const montoEfectivo = leerBucketMedio(d, "efectivo", "Efectivo");
    const montoTransferencia = leerBucketMedio(d, "transferencia", "Transferencia");
    const montoCheque = leerBucketMedio(d, "cheque", "Cheque");
    const montoDeposito =
      leerBucketMedio(d, "deposito", "Deposito") ||
      leerBucketMedio(d, "deposit", "Deposit");

    const sumMedios =
      montoEfectivo + montoTransferencia + montoCheque + montoDeposito;

    // DTO presente pero todo en cero (clave mal nombrada u objeto vacío): no pisar cabecera si tiene valores
    if (sumMedios === 0 && sumCabMedios > 0) {
      return { ...cab, usaTotalesDerivadosDetalle: false };
    }

    if (sumMedios === 0) {
      return { ...cab, usaTotalesDerivadosDetalle: false };
    }

    return {
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito,
      montoRetencion: cab.montoRetencion,
      monto: sumMedios + cab.montoRetencion,
      usaTotalesDerivadosDetalle: true,
    };
  };

  const totalesGenerales = entregasParaImprimir.reduce((acc, entrega) => {
    const c = totalesPorMedioParaImpresion(entrega);
    return {
      totalEfectivo: acc.totalEfectivo + c.montoEfectivo,
      totalTransferencia: acc.totalTransferencia + c.montoTransferencia,
      totalCheque: acc.totalCheque + c.montoCheque,
      totalDeposito: acc.totalDeposito + c.montoDeposito,
      totalRetencion: acc.totalRetencion + c.montoRetencion,
      totalNeto: acc.totalNeto + c.monto,
    };
  }, {
    totalEfectivo: 0,
    totalTransferencia: 0,
    totalCheque: 0,
    totalDeposito: 0,
    totalRetencion: 0,
    totalNeto: 0,
  });

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
              color: #000;
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
            
            .resumen-cols {
              display: flex;
              gap: 16px;
            }
            .resumen-col {
              flex: 1;
            }
            .resumen-divider {
              width: 1px;
              background: #ccc;
              flex-shrink: 0;
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

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(Number(n) || 0));

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
            {entregasParaImprimir.map((entrega) => {
              const cab = totalesPorMedioParaImpresion(entrega);
              return (
                <div key={entrega.id} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                  {/* Encabezado de entrega */}
                  <div className="entrega-header">
                    <h3>
                      Entrega #{entrega.id} — Fecha: {fmtFecha(entrega.fechaEntrega)}
                      {(entrega.sede?.nombre || entrega.sedeNombre) && (
                        <> · Sede: {entrega.sede?.nombre || entrega.sedeNombre}</>
                      )}
                    </h3>
                  </div>

                  {/* Tabla de órdenes */}
                  <table className="entregas-imprimir-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Fecha</th>
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
                          <td colSpan={8} className="empty">Sin órdenes</td>
                        </tr>
                      ) : (
                        entrega.detalles?.map((detalle, idx) => {
                          // Detectar reembolso por reembolsoId O por tipoMovimiento === "EGRESO"
                          const esDevolucion = Boolean(detalle.reembolsoId) || detalle.tipoMovimiento === "EGRESO";
                          
                            // Usar total, con montoOrden como campo alternativo del backend
                            const total = Number(detalle.total) || Math.abs(Number(detalle.montoOrden) || 0);
                            const retencionFuente = Number(detalle.retencionFuente) || 0;
                            const retencionIca = Number(detalle.retencionIca) || 0;
                            
                            // Calcular valor entregado según tipo de venta
                            let valorEntregado = 0;
                            if (!detalle.ventaCredito) {
                              // Orden DE CONTADO: usar el total menos retenciones
                              valorEntregado = total - retencionFuente - retencionIca;
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
                            ? Math.max(0, (Number(detalle.total) || 0) - Math.abs(valorEntregado))
                            : 0; // Contado siempre tiene saldo 0
                          
                          // Medio de pago: priorizar campos estructurados del backend
                          const medio = resolverMedioPagoDetalle(detalle, entrega);

                          // Retención total por detalle (priorizar campos numéricos)
                          const retencionTotal = (Number(detalle.retencionFuente) || 0) + (Number(detalle.retencionIca) || 0);
                          const retencion = retencionTotal > 0 ? retencionTotal.toLocaleString("es-CO") : null;

                          return (
                            <tr key={detalle.id || idx}>
                              <td>
                                {esDevolucion
                                  ? `DEV ${detalle.numeroOrden ?? "-"}`
                                  : (detalle.numeroOrden || "-")}
                              </td>
                              <td>{fmtFecha(detalle.fechaAbono || detalle.fechaOrden || detalle.fecha || entrega.fechaEntrega)}</td>
                              <td>{detalle.clienteNombre || detalle.cliente?.nombre || "-"}</td>
                              <td>${(Number(detalle.total) || 0).toLocaleString("es-CO")}</td>
                              <td>${saldo.toLocaleString("es-CO")}</td>
                              <td>
                                {esDevolucion ? "− " : ""}
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
                    // Estructura separada para devoluciones
                    const devoluciones = [];
                    
                    entrega.detalles?.forEach((detalle) => {
                      const numeroOrden = detalle.numeroOrden;
                      const esAbono = detalle.ventaCredito;
                      const esDevolucion = Boolean(detalle.reembolsoId) || detalle.tipoMovimiento === "EGRESO";
                      const reembolsoId = detalle.reembolsoId || null;
                      const observacionReembolso = detalle.observacionReembolso || null;
                      const nombreCliente = detalle.clienteNombre || detalle.cliente?.nombre || "Cliente";
                      
                      // Si es devolución, agregarla a la lista especial
                      if (esDevolucion) {
                        // Mapear formaReembolso a método de pago
                        let metodoPagoDevolucion = "MIXTO"; // Por defecto
                        
                        if (detalle.formaReembolso === "EFECTIVO") {
                          metodoPagoDevolucion = "EFECTIVO";
                        } else if (detalle.formaReembolso === "TRANSFERENCIA") {
                          metodoPagoDevolucion = "TRANSFERENCIA";
                        } else if (detalle.formaReembolso === "NOTA_CREDITO" || detalle.formaReembolso === "AJUSTE_CREDITO") {
                          metodoPagoDevolucion = "MIXTO";
                        }
                        
                        devoluciones.push({
                          numeroOrden,
                          reembolsoId,
                          observacionReembolso,
                          nombreCliente,
                          monto: Math.abs(Number(detalle.total) || Number(detalle.montoOrden) || 0),
                          metodoPago: metodoPagoDevolucion
                        });
                        return; // No procesar como método de pago normal
                      }

                      const retencionTotal = (Number(detalle.retencionFuente) || 0) + (Number(detalle.retencionIca) || 0);
                      const retencion = retencionTotal > 0 ? retencionTotal.toLocaleString("es-CO") : null;
                      const ordenItemBase = {
                        orden: numeroOrden,
                        esAbono,
                        esDevolucion,
                        reembolsoId,
                        observacionReembolso,
                        retencion,
                      };

                      const agregarMetodoPago = (tipo, monto) => {
                        const montoNum = Number(monto) || 0;
                        if (montoNum <= 0) return false;
                        const montoStr = montoNum.toLocaleString("es-CO");
                        const clave = `${nombreCliente}|${tipo}|${montoStr}`;
                        if (!metodosPago[clave]) {
                          metodosPago[clave] = {
                            tipo,
                            monto: montoStr,
                            cliente: nombreCliente,
                            ordenes: []
                          };
                        }
                        metodosPago[clave].ordenes.push({ ...ordenItemBase });
                        return true;
                      };

                      // 1) Priorizar texto del backend para preservar detalle de bancos
                      let metodoPagoStr = esAbono ? (detalle.metodoPago || "") : (detalle.descripcion || "");

                      if (!esAbono && (metodoPagoStr.includes('\n') || metodoPagoStr.includes('Método de pago:'))) {
                        const lineas = metodoPagoStr.split('\n').map(l => l.trim()).filter(Boolean);
                        const partesNormalizadas = [];

                        lineas.forEach(linea => {
                          const efectivoMatch = linea.match(/Efectivo:\s*\$?([\d.,]+)/i);
                          if (efectivoMatch) partesNormalizadas.push(`EFECTIVO: ${efectivoMatch[1]}`);

                          const transferenciaMatch = linea.match(/Transferencia:\s*([A-Z\s]+)\s*-\s*Monto:\s*\$?([\d.,]+)/i);
                          if (transferenciaMatch) {
                            const banco = transferenciaMatch[1].trim();
                            const monto = transferenciaMatch[2];
                            partesNormalizadas.push(`TRANSFERENCIA: ${monto} (${banco})`);
                          }

                          const chequeMatch = linea.match(/Cheque:\s*\$?([\d.,]+)/i);
                          if (chequeMatch) partesNormalizadas.push(`CHEQUE: ${chequeMatch[1]}`);

                          const depositoMatch = linea.match(/Dep[óo]sito:\s*\$?([\d.,]+)/i);
                          if (depositoMatch) partesNormalizadas.push(`DEPÓSITO: ${depositoMatch[1]}`);
                        });

                        metodoPagoStr = partesNormalizadas.join(' | ');
                      }

                      let agregoDesdeTexto = false;
                      if (metodoPagoStr.trim()) {
                        const partes = metodoPagoStr.split(/[\n|]/).map(p => p.trim()).filter(Boolean);
                        partes.forEach(parte => {
                          const efectivoMatch = parte.match(/EFECTIVO:\s*([0-9.,]+)/i);
                          if (efectivoMatch) {
                            agregoDesdeTexto = agregarMetodoPago("EFECTIVO", parseNumeroMonto(efectivoMatch[1])) || agregoDesdeTexto;
                          }

                          const transferenciaMatch = parte.match(/TRANSFERENCIA:\s*([0-9.,]+)\s*\(([^)]+)\)/i);
                          if (transferenciaMatch) {
                            const monto = parseNumeroMonto(transferenciaMatch[1]);
                            const banco = transferenciaMatch[2].trim();
                            agregoDesdeTexto = agregarMetodoPago(`TRANSFERENCIA ${banco}`, monto) || agregoDesdeTexto;
                          }

                          const transferenciaSimpleMatch = parte.match(/TRANSFERENCIA:\s*([0-9.,]+)/i);
                          if (transferenciaSimpleMatch && !transferenciaMatch) {
                            agregoDesdeTexto = agregarMetodoPago("TRANSFERENCIA", parseNumeroMonto(transferenciaSimpleMatch[1])) || agregoDesdeTexto;
                          }

                          const chequeMatch = parte.match(/CHEQUE:\s*([0-9.,]+)/i);
                          if (chequeMatch) {
                            agregoDesdeTexto = agregarMetodoPago("CHEQUE", parseNumeroMonto(chequeMatch[1])) || agregoDesdeTexto;
                          }

                          const depositoMatch = parte.match(/DEP[OÓ]SITO:\s*([0-9.,]+)/i);
                          if (depositoMatch) {
                            agregoDesdeTexto = agregarMetodoPago("DEPÓSITO", parseNumeroMonto(depositoMatch[1])) || agregoDesdeTexto;
                          }
                        });
                      }

                      if (agregoDesdeTexto) return;

                      // 2) Fallback a montos estructurados del backend por detalle
                      const montos = obtenerMontosDetalle(detalle);
                      const tieneMontosEstructurados = Object.values(montos).some((v) => v > 0);
                      if (tieneMontosEstructurados) {
                        agregarMetodoPago("EFECTIVO", montos.efectivo);
                        agregarMetodoPago("TRANSFERENCIA", montos.transferencia);
                        agregarMetodoPago("CHEQUE", montos.cheque);
                        agregarMetodoPago("DEPÓSITO", montos.deposito);
                        return;
                      }

                      // 3) Último fallback: medio simple + monto principal
                      const medioSimple = resolverMedioPagoDetalle(detalle, entrega);
                      agregarMetodoPago(medioSimple || "MIXTO", Number(detalle.abonosDelPeriodo) || Number(detalle.total) || 0);
                    });
                    
                    // Generar las líneas agrupadas por método de pago
                    const lineas = [];
                    
                    // PRIMERO: Devoluciones — una sola línea por devolución
                    devoluciones.forEach(dev => {
                      const reemb = dev.reembolsoId ? ` Reemb #${dev.reembolsoId}` : '';
                      const obs   = dev.observacionReembolso ? ` - ${dev.observacionReembolso}` : '';
                      lineas.push(`[DEV] ${dev.nombreCliente} — ${dev.metodoPago} $${dev.monto.toLocaleString("es-CO")}: Ord #${dev.numeroOrden}${reemb}${obs}`);
                      lineas.push('');
                    });

                    // SEGUNDO: Agrupar por cliente
                    const porCliente = {};
                    Object.keys(metodosPago).forEach(clave => {
                      const grupo = metodosPago[clave];
                      if (!porCliente[grupo.cliente]) porCliente[grupo.cliente] = [];
                      porCliente[grupo.cliente].push({ clave, grupo });
                    });
                    
                    // Una sola línea por grupo: "Cliente — TIPO $monto: Ord #X, ABONO #Y (-Ret $Z)"
                    Object.keys(porCliente).sort().forEach(cliente => {
                      porCliente[cliente].forEach(({ grupo }) => {
                        const partes = grupo.ordenes.map(item => {
                          const prefijo = item.esAbono ? 'ABONO' : 'Ord';
                          let txt = `${prefijo} #${item.orden}`;
                          if (item.retencion) txt += ` (-Ret $${item.retencion})`;
                          return txt;
                        });
                        lineas.push(`${grupo.cliente} — ${grupo.tipo} $${grupo.monto}: ${partes.join(', ')}`);
                        lineas.push('');
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

                  {/* Subtotal por medio: totalesPorMedioDesdeDetalles (GET) si existe; si no, cabecera persistida */}
                  <div className="total total-horizontal" style={{ marginTop: "8px" }}>
                    <div className="total-row">
                      <span><strong>Subtotal Entrega #{entrega.id} (total a verificar): </strong></span>
                      <span>Efectivo: {fmtCOP(cab.montoEfectivo)} | </span>
                      <span>Transferencia: {fmtCOP(cab.montoTransferencia)} | </span>
                      <span>Cheque: {fmtCOP(cab.montoCheque)} | </span>
                      <span>Depósito: {fmtCOP(cab.montoDeposito)}</span>
                      {cab.montoRetencion > 0 && (
                        <span> | Retención: {fmtCOP(cab.montoRetencion)}</span>
                      )}
                      <span><strong> | Total neto: {fmtCOP(cab.monto)}</strong></span>
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
                  <span><strong>Total Efectivo: {fmtCOP(totalesGenerales.totalEfectivo)}</strong></span>
                  <span><strong>Total Transferencia: {fmtCOP(totalesGenerales.totalTransferencia)}</strong></span>
                  <span><strong>Total Cheque: {fmtCOP(totalesGenerales.totalCheque)}</strong></span>
                  <span><strong>Total Depósito: {fmtCOP(totalesGenerales.totalDeposito)}</strong></span>
                  {totalesGenerales.totalRetencion > 0 && (
                    <span><strong>Total Retención: {fmtCOP(totalesGenerales.totalRetencion)}</strong></span>
                  )}
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                    <strong>TOTAL NETO: {fmtCOP(totalesGenerales.totalNeto)}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Resumen del mes */}
            {resumenMes && (
              <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #ccc" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "8px", color: "#1e2753" }}>
                  RESUMEN DEL MES {resumenMes.mesNombre || resumenMes.mes || ""}
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", lineHeight: "1.8", color: "#333" }}>
                  {/* Columna izquierda: datos de la entrega */}
                  <div style={{ flex: 1 }}>
                    <div><strong>DINERO ENTREGADO (esta entrega):</strong> ${Number(resumenMes.totalDineroEntregado ?? 0).toLocaleString("es-CO")}</div>
                    <div><strong>VENTAS DEL MES (contado + crédito):</strong> ${Number(resumenMes.totalDelMes ?? 0).toLocaleString("es-CO")}</div>
                  </div>
                  {/* Separador */}
                  <div style={{ width: "1px", background: "#ccc", flexShrink: 0 }} />
                  {/* Columna derecha: contexto de deudas */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contexto de deudas</div>
                    <div><strong>DEL MES:</strong> ${Number(resumenMes.totalDeudasMensuales ?? 0).toLocaleString("es-CO")}</div>
                    {resumenMes.totalCreditosActivosHistorico != null && (
                      <div><strong>HISTÓRICO:</strong> ${Number(resumenMes.totalCreditosActivosHistorico).toLocaleString("es-CO")}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

