import React, { useState, useEffect, useMemo } from "react";
import { listarOrdenesTabla } from "../services/OrdenesService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import "../styles/Table.css";

export default function HistoricoGeneralModal({ isOpen, onClose, ordenes: ordenesProp = [] }) {
  const { isAdmin, sedeId } = useAuth();
  const { showError } = useToast();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  // Usar fecha local en lugar de ISO para evitar problemas de zona horaria
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  });
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [añoActual, setAñoActual] = useState(new Date().getFullYear());

  // Cargar órdenes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      cargarOrdenes();
    }
  }, [isOpen, isAdmin, sedeId]);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      const params = isAdmin ? {} : { sedeId };
      const ordenesData = await listarOrdenesTabla(params);
      setOrdenes(Array.isArray(ordenesData) ? ordenesData : []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      showError("No se pudieron cargar las órdenes.");
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha sin problemas de zona horaria
  const fmtFecha = (iso) => {
    if (!iso) return "-";
    
    // Si es formato YYYY-MM-DD, formatearlo directamente sin conversión de zona horaria
    if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const [año, mes, dia] = iso.split('T')[0].split('-');
      return `${dia}/${mes}/${año}`;
    }
    
    // Fallback: usar Date con zona horaria local
    const fecha = new Date(iso);
    return fecha.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Formatear moneda
  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : n ?? "-";

  // Calcular total de una orden
  const calcularTotal = (orden) => {
    if (orden?.total !== undefined && orden?.total !== null) {
      return orden.total;
    }
    if (!Array.isArray(orden?.items)) return 0;
    return orden.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0);
  };

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

  // Función para crear ventana de impresión
  const crearVentanaImpresion = () => {
    if (!fechaSeleccionada || ordenesFiltradas.length === 0) return null;
    
    const contenido = document.getElementById('printable-dia-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Órdenes del ${fmtFecha(fechaSeleccionada)}</title>
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
              font-size: 0.75rem;
              line-height: 1.3;
            }
            
            .dia-header {
              text-align: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #999;
            }
            
            .dia-header h1 {
              margin: 0 0 4px 0;
              color: #000;
              font-size: 1.2rem;
              font-weight: 700;
            }
            
            .dia-header p {
              margin: 1px 0;
              color: #333;
              font-size: 0.7rem;
            }
            
            .orden-print-row {
              margin-bottom: 8px;
              page-break-inside: avoid;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 4px;
              background: transparent;
            }
            
            .orden-print-row-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;
              padding-bottom: 3px;
              border-bottom: 1px solid #999;
            }
            
            .orden-print-row-header h3 {
              margin: 0;
              color: #000;
              font-size: 0.8rem;
              font-weight: 600;
            }
            
            .orden-print-row-info {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 4px;
              margin-bottom: 4px;
              font-size: 0.65rem;
            }
            
            .orden-print-row-info-item {
              display: flex;
              justify-content: space-between;
            }
            
            .orden-print-row-totals {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              font-size: 0.7rem;
              margin-top: 4px;
              padding-top: 3px;
              border-top: 1px solid #999;
            }
            
            .orden-print-row-totals-item {
              text-align: right;
            }
            
            .orden-print-row-totals-item strong {
              font-weight: 600;
            }
            
            .dia-totales {
              margin-top: 16px;
              padding-top: 8px;
              border-top: 1px solid #999;
              page-break-inside: avoid;
            }
            
            .dia-totales h3 {
              margin: 0 0 6px 0;
              color: #000;
              font-size: 0.9rem;
              font-weight: 700;
            }
            
            .dia-totales-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.75rem;
            }
            
            .dia-totales-table th,
            .dia-totales-table td {
              padding: 4px 6px;
              text-align: right;
              border: 1px solid #999;
            }
            
            .dia-totales-table th {
              background-color: transparent;
              color: #000;
              font-weight: 600;
              text-align: left;
              border-bottom: 2px solid #000;
            }
            
            .dia-totales-table td {
              font-weight: 500;
              color: #000;
              background-color: transparent;
            }
            
            @media print {
              body {
                font-size: 0.7rem;
              }
              
              .orden-print-row {
                page-break-inside: avoid;
              }
              
              .dia-totales {
                page-break-inside: avoid;
              }
              
              * {
                -webkit-print-color-adjust: economy;
                print-color-adjust: economy;
                color-adjust: economy;
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
            
            // Escuchar el evento afterprint
            window.addEventListener('afterprint', function() {
              clearTimeout(timeoutId);
              setTimeout(cerrarVentana, 100);
            });
            
            // Fallback: cerrar después de un tiempo
            timeoutId = setTimeout(cerrarVentana, 5000);
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
    return ventana;
  };

  // Función para imprimir
  const handleImprimirDia = () => {
    if (!fechaSeleccionada || ordenesFiltradas.length === 0) {
      showError("No hay órdenes para imprimir en esta fecha");
      return;
    }
    const ventana = crearVentanaImpresion();
    if (ventana) {
      ventana.onload = () => {
        ventana.print();
      };
    }
  };

  // Filtrar órdenes por fecha seleccionada
  const ordenesFiltradas = useMemo(() => {
    if (!fechaSeleccionada) return ordenes;
    return ordenes.filter(orden => {
      if (!orden.fecha) return false;
      const fechaOrden = new Date(orden.fecha).toISOString().slice(0, 10);
      return fechaOrden === fechaSeleccionada;
    });
  }, [ordenes, fechaSeleccionada]);

  // Obtener días del mes
  const obtenerDiasDelMes = (mes, año) => {
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const dias = [];
    
    // Días de la semana
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Función helper para obtener fecha local
    const obtenerFechaLocal = (fecha = new Date()) => {
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    };
    
    // Agregar días vacíos al inicio si el mes no empieza en domingo
    for (let i = 0; i < primerDia.getDay(); i++) {
      dias.push(null);
    }
    
    // Agregar todos los días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(año, mes, dia);
      const fechaStr = obtenerFechaLocal(fecha);
      const tieneOrdenes = ordenes.some(orden => {
        if (!orden.fecha) return false;
        // Extraer solo la parte de fecha del string sin conversión de zona horaria
        const fechaOrdenStr = orden.fecha.split('T')[0]; // "2025-12-22"
        return fechaOrdenStr === fechaStr;
      });
      dias.push({
        dia,
        fecha: fechaStr,
        tieneOrdenes,
        esHoy: fechaStr === obtenerFechaLocal(),
        esSeleccionado: fechaStr === fechaSeleccionada
      });
    }
    
    return { dias, diasSemana };
  };

  const { dias, diasSemana } = obtenerDiasDelMes(mesActual, añoActual);

  // Cambiar mes
  const cambiarMes = (delta) => {
    const nuevaFecha = new Date(añoActual, mesActual + delta, 1);
    setMesActual(nuevaFecha.getMonth());
    setAñoActual(nuevaFecha.getFullYear());
  };

  // Nombres de meses
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ 
        maxWidth: '1600px', 
        width: '98vw', 
        height: '95vh',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
        margin: '2vh auto'
      }} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header" style={{ 
          background: 'var(--color-light-blue)', 
          color: '#fff',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #1e2753'
        }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', fontWeight: '600' }}>
            Histórico General de Órdenes
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {fechaSeleccionada && ordenesFiltradas.length > 0 && (
              <button
                onClick={handleImprimirDia}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  background: '#fff',
                  color: '#1e2753',
                  border: '2px solid #1e2753',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#1e2753';
                  e.target.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fff';
                  e.target.style.color = '#1e2753';
                }}
                title="Imprimir órdenes del día seleccionado"
              >
                Imprimir Día
              </button>
            )}
            <button 
            className="close-btn" 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
              fontWeight: '700',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(231, 76, 60, 0.9)';
              e.target.style.borderColor = 'rgba(231, 76, 60, 1)';
            }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              ✕
            </button>
          </div>
        </header>

        {/* Contenido imprimible (oculto) */}
        {fechaSeleccionada && ordenesFiltradas.length > 0 && (
          <div id="printable-dia-content" style={{ display: 'none' }}>
            <div className="dia-header">
              <h1>ÓRDENES DEL DÍA</h1>
              <p>Fecha: {fmtFecha(fechaSeleccionada)} | Fecha de impresión: {new Date().toLocaleDateString('es-CO')}</p>
            </div>

            {ordenesFiltradas.map((orden) => {
              const total = calcularTotal(orden);
              const totalFinal = total;
              const esCredito = Boolean(orden.credito);
              const saldoPendiente = esCredito ? (orden.creditoDetalle?.saldoPendiente || 0) : 0;

              return (
                <div key={orden.id} className="orden-print-row">
                  <div className="orden-print-row-header">
                    <h3>Orden #{orden.numero}</h3>
                  </div>
                  
                  <div className="orden-print-row-info">
                    <div className="orden-print-row-info-item">
                      <span><strong>Cliente:</strong></span>
                      <span>{orden.cliente?.nombre || '-'}</span>
                    </div>
                    <div className="orden-print-row-info-item">
                      <span><strong>Estado:</strong></span>
                      <span>{formatearEstado(orden.estado)}</span>
                    </div>
                    <div className="orden-print-row-info-item">
                      <span><strong>Tipo:</strong></span>
                      <span>{orden.venta ? 'VENTA' : 'COTIZACIÓN'}</span>
                    </div>
                    <div className="orden-print-row-info-item">
                      <span><strong>Sede:</strong></span>
                      <span>{orden.sede?.nombre || '-'}</span>
                    </div>
                  </div>

                  <div className="orden-print-row-totals">
                    <div className="orden-print-row-totals-item">
                      <span>Subtotal: </span>
                      <strong>{fmtCOP(total)}</strong>
                    </div>
                    <div className="orden-print-row-totals-item">
                      <span>Total: </span>
                      <strong>{fmtCOP(totalFinal)}</strong>
                    </div>
                    {esCredito && (
                      <div className="orden-print-row-totals-item">
                        <span>Saldo Pendiente: </span>
                        <strong style={{ color: '#000' }}>{fmtCOP(saldoPendiente)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="dia-totales">
              <h3>RESUMEN DEL DÍA</h3>
              <table className="dia-totales-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total de Órdenes</strong></td>
                    <td>{ordenesFiltradas.length}</td>
                  </tr>
                  <tr>
                    <td><strong>Órdenes a Crédito</strong></td>
                    <td>{ordenesFiltradas.filter(o => o.credito).length}</td>
                  </tr>
                  <tr>
                    <td><strong>Subtotal General</strong></td>
                    <td>{fmtCOP(ordenesFiltradas.reduce((sum, orden) => sum + calcularTotal(orden), 0))}</td>
                  </tr>
                  <tr>
                  </tr>
                  <tr>
                    <td><strong>Total General</strong></td>
                    <td>{fmtCOP(ordenesFiltradas.reduce((sum, orden) => {
                      const total = calcularTotal(orden);
                      return sum + total;
                    }, 0))}</td>
                  </tr>
                  <tr>
                    <td><strong>Saldo Pendiente Total</strong></td>
                    <td style={{ color: '#000', fontWeight: '600' }}>
                      {fmtCOP(ordenesFiltradas.filter(o => o.credito).reduce((sum, orden) => {
                        const saldo = orden.creditoDetalle?.saldoPendiente || 0;
                        return sum + saldo;
                      }, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          flex: 1, 
          minHeight: 0, 
          overflow: 'hidden',
          height: 'calc(100% - 70px)' // Altura total menos el header
        }}>
          {/* Tabla de órdenes - Izquierda */}
          <div style={{ 
            flex: 1, 
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '1rem',
            borderRight: '2px solid #1e2753',
            height: '100%'
          }}>
            <div style={{ 
              marginBottom: '0.4rem',
              padding: '0.4rem 0.5rem',
              background: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#1e2753',
              flexShrink: 0
            }}>
              {fechaSeleccionada ? (
                <>Órdenes del {fmtFecha(fechaSeleccionada)} ({ordenesFiltradas.length} orden{ordenesFiltradas.length !== 1 ? 'es' : ''})</>
              ) : (
                <>Todas las órdenes ({ordenes.length})</>
              )}
            </div>

            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fff',
              minHeight: 0,
              height: 'calc(100% - 40px)' // Altura menos el título
            }}>
              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  padding: '3rem' 
                }}>
                  Cargando órdenes...
                </div>
              ) : ordenesFiltradas.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  padding: '3rem',
                  fontStyle: 'italic'
                }}>
                  {fechaSeleccionada ? 'No hay órdenes para esta fecha' : 'No hay órdenes registradas'}
                </div>
              ) : (
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '0.7rem',
                  minWidth: '1200px'
                }}>
                  <thead style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 5, 
                    backgroundColor: '#1e2753', 
                    color: '#fff' 
                  }}>
                    <tr>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>ORDEN</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>CLIENTE</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>ESTADO</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>TIPO</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>SEDE</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>SUBTOTAL</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right', borderRight: '1px solid #fff', fontSize: '0.7rem' }}>TOTAL</th>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>CRÉDITO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFiltradas.map((orden, index) => {
                      const total = calcularTotal(orden);
                      const totalFinal = total;
                      const esCredito = Boolean(orden.credito);

                      return (
                        <tr
                          key={orden.id}
                          style={{
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                            height: '24px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9'}
                        >
                          <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #e0e0e0', fontWeight: '600', fontSize: '0.7rem' }}>
                            #{orden.numero}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', borderRight: '1px solid #e0e0e0', fontSize: '0.7rem' }}>
                            {orden.cliente?.nombre ?? "-"}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontSize: '0.65rem' }}>
                            <span style={{
                              padding: '0.15rem 0.3rem',
                              borderRadius: '3px',
                              fontSize: '0.65rem',
                              fontWeight: '500',
                              backgroundColor: orden.estado?.toLowerCase() === 'anulada' ? '#f8d7da' : 
                                              orden.estado?.toLowerCase() === 'completada' ? '#d1ecf1' :
                                              orden.estado?.toLowerCase() === 'pendiente' ? '#fff3cd' : '#d4edda',
                              color: orden.estado?.toLowerCase() === 'anulada' ? '#721c24' :
                                     orden.estado?.toLowerCase() === 'completada' ? '#0c5460' :
                                     orden.estado?.toLowerCase() === 'pendiente' ? '#856404' : '#155724'
                            }}>
                              {formatearEstado(orden.estado)}
                            </span>
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontSize: '0.7rem' }}>
                            {orden.venta ? (
                              <span style={{ color: '#28a745', fontWeight: '600', fontSize: '0.65rem' }}>VENTA</span>
                            ) : (
                              <span style={{ color: '#666', fontSize: '0.65rem' }}>COTIZACIÓN</span>
                            )}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontSize: '0.7rem' }}>
                            {orden.sede?.nombre || '-'}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontSize: '0.7rem' }}>
                            {fmtCOP(total)}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontWeight: '600', fontSize: '0.7rem' }}>
                            {fmtCOP(totalFinal)}
                          </td>
                          <td style={{ padding: '0.2rem 0.5rem', textAlign: 'center', fontSize: '0.7rem' }}>
                            {esCredito ? (
                              <span style={{ color: '#007bff', fontWeight: '600', fontSize: '0.65rem' }}>SÍ</span>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.65rem' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Calendario - Derecha */}
          <div style={{ 
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            overflowY: 'auto'
          }}>
            <div style={{ 
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => cambiarMes(-1)}
                style={{
                  background: '#1e2753',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                ‹
              </button>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1rem', 
                fontWeight: '600',
                color: '#1e2753'
              }}>
                {nombresMeses[mesActual]} {añoActual}
              </h3>
              <button
                onClick={() => cambiarMes(1)}
                style={{
                  background: '#1e2753',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                ›
              </button>
            </div>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '0.5rem'
            }}>
              {diasSemana.map(dia => (
                <div key={dia} style={{
                  textAlign: 'center',
                  padding: '0.3rem',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#1e2753'
                }}>
                  {dia}
                </div>
              ))}
            </div>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px'
            }}>
              {dias.map((diaInfo, index) => {
                if (!diaInfo) {
                  return <div key={`empty-${index}`} style={{ aspectRatio: '1' }} />;
                }

                return (
                  <button
                    key={diaInfo.fecha}
                    onClick={() => setFechaSeleccionada(diaInfo.fecha)}
                    style={{
                      aspectRatio: '1',
                      border: diaInfo.esSeleccionado ? '2px solid #1e2753' : '1px solid #ddd',
                      borderRadius: '4px',
                      background: diaInfo.esSeleccionado ? '#1e2753' : 
                                  diaInfo.esHoy ? '#e7f3ff' : 
                                  diaInfo.tieneOrdenes ? '#d4edda' : '#fff',
                      color: diaInfo.esSeleccionado ? '#fff' : '#000',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: diaInfo.esSeleccionado || diaInfo.esHoy ? '600' : 'normal',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.2rem',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!diaInfo.esSeleccionado) {
                        e.target.style.background = '#e7f3ff';
                        e.target.style.borderColor = '#1e2753';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!diaInfo.esSeleccionado) {
                        e.target.style.background = diaInfo.esHoy ? '#e7f3ff' : 
                                                    diaInfo.tieneOrdenes ? '#d4edda' : '#fff';
                        e.target.style.borderColor = '#ddd';
                      }
                    }}
                    title={diaInfo.tieneOrdenes ? `Tiene órdenes` : ''}
                  >
                    <span>{diaInfo.dia}</span>
                    {diaInfo.tieneOrdenes && (
                      <span style={{
                        fontSize: '0.5rem',
                        marginTop: '0.1rem',
                        opacity: 0.7
                      }}>●</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#fff',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600', color: '#1e2753' }}>
                Leyenda:
              </div>
              <div style={{ fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#1e2753', borderRadius: '2px', marginRight: '0.5rem' }}></span>
                Día seleccionado
              </div>
              <div style={{ fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e7f3ff', borderRadius: '2px', marginRight: '0.5rem', border: '1px solid #1e2753' }}></span>
                Hoy
              </div>
              <div style={{ fontSize: '0.7rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#d4edda', borderRadius: '2px', marginRight: '0.5rem' }}></span>
                Tiene órdenes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

