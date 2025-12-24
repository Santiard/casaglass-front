import "../styles/EntregaDetalleModal.css";

export default function EntregaDetalleModal({ entrega, isOpen, onClose }) {
  if (!isOpen || !entrega) return null;

  const dets = Array.isArray(entrega.detalles) ? entrega.detalles : [];
  // gastos eliminado - ya no se usan gastos en entregas
  
  // 🔍 DEBUG: Ver todos los detalles y sus tipos de movimiento
  console.log('🔍 [EntregaDetalleModal] Total detalles:', dets.length);
  dets.forEach((d, idx) => {
    console.log(`  [${idx + 1}] Orden #${d.numeroOrden} - tipoMovimiento: "${d.tipoMovimiento}" - montoOrden: ${d.montoOrden} - reembolsoId: ${d.reembolsoId}`);
  });
  
  // Separar detalles por tipo de movimiento
  const ingresos = dets.filter(d => !d.tipoMovimiento || d.tipoMovimiento === 'INGRESO');
  const egresos = dets.filter(d => d.tipoMovimiento === 'EGRESO');
  
  console.log(`[EntregaDetalleModal] Ingresos: ${ingresos.length}, Egresos: ${egresos.length}`);

  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  // Usar monto (único campo de monto según el modelo simplificado)
  const monto = Number(entrega.monto ?? 0);
  const montoEfectivo = Number(entrega.montoEfectivo ?? 0);
  const montoTransferencia = Number(entrega.montoTransferencia ?? 0);
  const montoCheque = Number(entrega.montoCheque ?? 0);
  const montoDeposito = Number(entrega.montoDeposito ?? 0);
  const montoRetencion = Number(entrega.montoRetencion ?? 0); // 🆕 Campo nuevo
  
  // Calcular suma del desglose para validación
  const sumaDesglose = montoEfectivo + montoTransferencia + montoCheque + montoDeposito;

  return (
    <div className="entrega-detalle-modal-overlay" onClick={onClose}>
      <div className="entrega-detalle-modal-container" onClick={(e) => e.stopPropagation()}>
        <h2>Detalles de Entrega #{entrega.id ?? "—"}</h2>

        {/* Información general compacta */}
        <div className="entrega-detalle-info-header">
          <div className="entrega-detalle-info-item">
            <label>Fecha</label>
            <span>{fmtFecha(entrega.fechaEntrega)}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Sede</label>
            <span>{entrega.sede?.nombre ?? "-"}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Empleado</label>
            <span>{entrega.empleado?.nombre ?? "-"}</span>
          </div>
          <div className="entrega-detalle-info-item">
            <label>Estado</label>
            <span className={`estado-badge ${entrega.estado?.toLowerCase()}`}>
              {entrega.estado}
            </span>
          </div>
        </div>

        {/* Tabla de ingresos (órdenes y abonos) */}
        <div className="entrega-detalle-section">
          <h3>INGRESOS (Órdenes y Abonos)</h3>
          <div className="entrega-detalle-table-wrapper">
            <table className="entrega-detalle-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th># Orden</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Valor Entregado</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Sin ingresos</td></tr>
                ) : ingresos.map((d) => {
                  // Calcular valor entregado según tipo de venta
                  let valorEntregado = 0;
                  if (!d.ventaCredito) {
                    valorEntregado = Number(d.montoOrden) || 0;
                  } else {
                    valorEntregado = Number(d.abonosDelPeriodo) || 0;
                  }
                  
                  // Calcular saldo
                  const saldo = d.ventaCredito 
                    ? Math.max(0, (Number(d.montoOrden) || 0) - valorEntregado)
                    : 0;

                  return (
                    <tr key={d.id}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: d.ventaCredito ? '#2196f3' : '#4caf50',
                          color: 'white'
                        }}>
                          {d.ventaCredito ? 'ABONO' : 'CONTADO'}
                        </span>
                      </td>
                      <td>{d.numeroOrden}</td>
                      <td>{d.clienteNombre || "-"}</td>
                      <td>{fmtFecha(d.fechaOrden)}</td>
                      <td>{fmtCOP(d.montoOrden)}</td>
                      <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        {fmtCOP(valorEntregado)}
                      </td>
                      <td>{fmtCOP(saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de egresos (reembolsos) */}
        {egresos.length > 0 && (
          <div className="entrega-detalle-section">
            <h3 style={{ color: '#d32f2f' }}>EGRESOS (Devoluciones/Reembolsos) - {egresos.length}</h3>
            <div className="entrega-detalle-table-wrapper">
              <table className="entrega-detalle-table">
                <thead style={{ backgroundColor: '#ffebee' }}>
                  <tr>
                    <th>Tipo</th>
                    <th># Orden Original</th>
                    <th>Cliente</th>
                    <th>Fecha Devolución</th>
                    <th>Monto Reembolsado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {egresos.map((d) => {
                    const montoReembolso = Math.abs(Number(d.montoOrden) || 0);
                    
                    return (
                      <tr key={d.id} style={{ backgroundColor: '#ffebee', borderLeft: '4px solid #c62828' }}>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            backgroundColor: '#c62828',
                            color: 'white'
                          }}>
                            DEVOLUCIÓN
                          </span>
                        </td>
                        <td style={{ fontWeight: '500' }}>{d.numeroOrden}</td>
                        <td>{d.clienteNombre || "-"}</td>
                        <td>{fmtFecha(d.fechaOrden)}</td>
                        <td style={{ color: '#c62828', fontWeight: 'bold', fontSize: '1.1rem' }}>
                          <span style={{ marginRight: '0.25rem' }}>−</span>
                          {fmtCOP(montoReembolso)}
                        </td>
                        <td style={{ fontStyle: 'italic', color: '#666' }}>
                          {d.observaciones || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sección de gastos eliminada - ya no se usan gastos en entregas */}

        {/* Resumen financiero compacto */}
        <div className="entrega-detalle-resumen">
          <div className="entrega-detalle-resumen-item">
            <label>Efectivo</label>
            <span>{fmtCOP(montoEfectivo)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Transferencia</label>
            <span>{fmtCOP(montoTransferencia)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Cheque</label>
            <span>{fmtCOP(montoCheque)}</span>
          </div>
          <div className="entrega-detalle-resumen-item">
            <label>Depósito</label>
            <span>{fmtCOP(montoDeposito)}</span>
          </div>
          {montoRetencion > 0 && (
            <div className="entrega-detalle-resumen-item" style={{ color: '#d32f2f' }}>
              <label>Retención de Fuente</label>
              <span>{fmtCOP(montoRetencion)}</span>
            </div>
          )}
          <div className="entrega-detalle-resumen-item monto-total">
            <label>Monto Total</label>
            <span>{fmtCOP(monto)}</span>
          </div>
          {sumaDesglose !== monto && (
            <div className="entrega-detalle-warning">
              Advertencia: La suma del desglose (${sumaDesglose.toLocaleString()}) no coincide con el monto total (${monto.toLocaleString()})
            </div>
          )}
        </div>

        <div className="entrega-detalle-modal-buttons">
          <button className="btn-cerrar" onClick={onClose} type="button">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

