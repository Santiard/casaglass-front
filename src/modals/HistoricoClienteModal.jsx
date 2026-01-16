import React, { useState, useEffect, Fragment } from "react";
import { listarClientes } from "../services/ClientesService.js";
import { listarOrdenes, listarOrdenesTabla } from "../services/OrdenesService.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Table.css";
import "../styles/OrdenesTable.css";

export default function HistoricoClienteModal({ isOpen, onClose }) {
  const { showError } = useToast();
  const { isAdmin, sedeId } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenesCompletas, setOrdenesCompletas] = useState([]); // Almacenar todas las órdenes sin filtrar
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const cargarClientes = async () => {
        try {
          const clientesData = await listarClientes();
          setClientes(Array.isArray(clientesData) ? clientesData : []);
        } catch (err) {
          showError("No se pudieron cargar los clientes.");
        }
      };
      cargarClientes();
    }
  }, [isOpen, showError]);

  // Cargar órdenes cuando se selecciona un cliente
  useEffect(() => {
    if (clienteSeleccionado?.id) {
      cargarOrdenesCliente(clienteSeleccionado.id);
    } else {
      setOrdenes([]);
      setOrdenesCompletas([]);
    }
  }, [clienteSeleccionado]);

  // Filtrar órdenes por fecha cuando cambian los filtros
  useEffect(() => {
    if (ordenesCompletas.length === 0) {
      setOrdenes([]);
      return;
    }

    let ordenesFiltradas = [...ordenesCompletas];

    // Filtrar por fecha desde
    if (fechaDesde) {
      ordenesFiltradas = ordenesFiltradas.filter(o => {
        const fechaOrden = new Date(o.fecha);
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        return fechaOrden >= fechaDesdeDate;
      });
    }

    // Filtrar por fecha hasta
    if (fechaHasta) {
      ordenesFiltradas = ordenesFiltradas.filter(o => {
        const fechaOrden = new Date(o.fecha);
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        return fechaOrden <= fechaHastaDate;
      });
    }

    setOrdenes(ordenesFiltradas);
  }, [fechaDesde, fechaHasta, ordenesCompletas]);

  const cargarOrdenesCliente = async (clienteId) => {
    setLoading(true);
    try {
      // Intentar primero con listarOrdenesTabla (endpoint optimizado)
      // Si no es admin, también filtrar por sede
      const params = {
        clienteId: Number(clienteId)
      };
      if (!isAdmin && sedeId) {
        params.sedeId = sedeId;
      }
      
      let ordenesData;
      try {
        ordenesData = await listarOrdenesTabla(params);
      } catch (tablaError) {
        // Fallback a listarOrdenes
        ordenesData = await listarOrdenes(params);
      }
      
      // Filtrar por cliente si el backend no lo hace automáticamente
      let ordenesFiltradas = Array.isArray(ordenesData) ? ordenesData : [];
      
      // Si el backend no filtró, hacerlo en el frontend
      if (ordenesFiltradas.length > 0) {
        const primeraOrden = ordenesFiltradas[0];
        const tieneClienteId = primeraOrden.clienteId || primeraOrden.cliente?.id;
        if (!tieneClienteId || primeraOrden.clienteId !== Number(clienteId)) {
          ordenesFiltradas = ordenesFiltradas.filter(orden => {
            const ordenClienteId = orden.clienteId || orden.cliente?.id;
            return Number(ordenClienteId) === Number(clienteId);
          });
        }
      }
      
      // Ordenar por fecha descendente (más recientes primero)
      const ordenesOrdenadas = ordenesFiltradas.sort((a, b) => {
        const fechaA = new Date(a.fecha || 0);
        const fechaB = new Date(b.fecha || 0);
        const diffFechas = fechaB - fechaA;
        if (diffFechas === 0) return (b.id || 0) - (a.id || 0);
        return diffFechas;
      });
      
      setOrdenesCompletas(ordenesOrdenadas);
      // setOrdenes se actualizará automáticamente por el useEffect de filtrado
    } catch (err) {
      showError("No se pudieron cargar las órdenes del cliente.");
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

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

  // Alternar expandir/ocultar items
  const toggleExpand = (ordenId) => {
    setExpanded((prev) => ({ ...prev, [ordenId]: !prev[ordenId] }));
  };

  // Función para crear ventana de impresión
  const crearVentanaImpresion = () => {
    if (!clienteSeleccionado || ordenes.length === 0) return null;
    
    const contenido = document.getElementById('printable-historico-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Histórico de Órdenes - ${clienteSeleccionado.nombre}</title>
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
            
            /* Forzar impresión en escala de grises */
            @media print {
              * {
                -webkit-print-color-adjust: economy;
                print-color-adjust: economy;
                color-adjust: economy;
              }
            }
            
            body { 
              font-family: 'Roboto', sans-serif; 
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 0.75rem;
              line-height: 1.3;
            }
            
            .historico-header {
              text-align: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #999;
            }
            
            .historico-header h1 {
              margin: 0 0 4px 0;
              color: #000;
              font-size: 1.2rem;
              font-weight: 700;
            }
            
            .historico-header h2 {
              margin: 2px 0;
              color: #000;
              font-size: 0.9rem;
              font-weight: 600;
            }
            
            .historico-header p {
              margin: 1px 0;
              color: #333;
              font-size: 0.7rem;
            }
            
            .orden-print-section {
              margin-bottom: 12px;
              page-break-inside: avoid;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 6px;
              background: transparent;
            }
            
            .orden-print-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #999;
            }
            
            .orden-print-header h3 {
              margin: 0;
              color: #000;
              font-size: 0.85rem;
              font-weight: 600;
            }
            
            .orden-print-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              margin-bottom: 6px;
              font-size: 0.7rem;
            }
            
            .orden-print-info-row {
              display: flex;
              justify-content: space-between;
            }
            
            .orden-print-items {
              margin-top: 6px;
            }
            
            .orden-print-items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.7rem;
              margin-top: 4px;
            }
            
            .orden-print-items-table thead {
              background-color: transparent;
              color: #000;
            }
            
            .orden-print-items-table th {
              padding: 3px 4px;
              text-align: left;
              font-weight: 600;
              border: 1px solid #000;
              border-bottom: 2px solid #000;
              background-color: transparent;
              color: #000;
            }
            
            .orden-print-items-table td {
              padding: 3px 4px;
              border: 1px solid #ccc;
              color: #000;
              background-color: transparent;
            }
            
            .orden-print-items-table tbody tr:nth-child(even) {
              background-color: transparent;
            }
            
            .orden-print-totals {
              margin-top: 6px;
              padding-top: 4px;
              border-top: 1px solid #999;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              font-size: 0.75rem;
            }
            
            .orden-print-totals-row {
              text-align: right;
            }
            
            .orden-print-totals-row strong {
              font-weight: 600;
            }
            
            .historico-totales {
              margin-top: 16px;
              padding-top: 8px;
              border-top: 1px solid #999;
              page-break-inside: avoid;
            }
            
            .historico-totales h3 {
              margin: 0 0 6px 0;
              color: #000;
              font-size: 0.9rem;
              font-weight: 700;
            }
            
            .historico-totales-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.75rem;
            }
            
            .historico-totales-table th,
            .historico-totales-table td {
              padding: 4px 6px;
              text-align: right;
              border: 1px solid #999;
            }
            
            .historico-totales-table th {
              background-color: transparent;
              color: #000;
              font-weight: 600;
              text-align: left;
              border: 1px solid #000;
              border-bottom: 2px solid #000;
            }
            
            .historico-totales-table td {
              font-weight: 500;
              color: #000;
            }
            
            @media print {
              body {
                font-size: 0.7rem;
              }
              
              .orden-print-section {
                page-break-inside: avoid;
              }
              
              .historico-totales {
                page-break-inside: avoid;
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
  const handleImprimir = () => {
    if (!clienteSeleccionado || ordenes.length === 0) {
      showError("No hay órdenes para imprimir");
      return;
    }
    const ventana = crearVentanaImpresion();
    if (ventana) {
      ventana.onload = () => {
        ventana.print();
      };
    }
  };

  if (!isOpen) return null;

  // Calcular totales
  const totalOrdenes = ordenes.length;
  const totalMonto = ordenes.reduce((sum, orden) => sum + calcularTotal(orden), 0);
  const totalCredito = ordenes.filter(o => o.credito).reduce((sum, orden) => {
    const saldo = orden.creditoDetalle?.saldoPendiente || 0;
    return sum + saldo;
  }, 0);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" style={{ 
          maxWidth: '1400px', 
          width: '95vw', 
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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
              Histórico de Órdenes por Cliente
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {clienteSeleccionado && ordenes.length > 0 && (
                <button
                  onClick={handleImprimir}
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
                  title="Imprimir histórico completo"
                >
                  Imprimir
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

          {/* Selección de Cliente y Filtros de Fecha en una sola fila */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '2px solid #1e2753',
            backgroundColor: '#f8f9fa'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#1e2753'
            }}>
              Seleccionar Cliente
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
              <input
                type="text"
                value={clienteSeleccionado?.nombre || ""}
                readOnly
                onClick={() => setShowClienteModal(true)}
                placeholder="Haz clic para buscar cliente..."
                className="clientes-input"
                style={{
                  width: '200px',
                  minWidth: '150px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  padding: '0.5rem'
                }}
              />
              {clienteSeleccionado && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setOrdenes([]);
                    setOrdenesCompletas([]);
                    setFechaDesde("");
                    setFechaHasta("");
                    setExpanded({});
                  }}
                  className="btn-cancelar"
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    minWidth: 'auto'
                  }}
                  title="Limpiar selección"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowClienteModal(true)}
                className="btn-guardar"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                Buscar Cliente
              </button>
              {/* Filtros de Fecha */}
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="clientes-input"
                style={{
                  width: '150px',
                  minWidth: '120px',
                  fontSize: '0.95rem',
                  padding: '0.5rem'
                }}
                placeholder="Desde"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
                className="clientes-input"
                style={{
                  width: '150px',
                  minWidth: '120px',
                  fontSize: '0.95rem',
                  padding: '0.5rem'
                }}
                placeholder="Hasta"
              />
              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="btn-cancelar"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap'
                  }}
                  title="Limpiar filtros de fecha"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Contenido imprimible (oculto) */}
          {clienteSeleccionado && ordenes.length > 0 && (
            <div id="printable-historico-content" style={{ display: 'none' }}>
              <div className="historico-header">
                <h1>HISTÓRICO DE ÓRDENES</h1>
                <h2>{clienteSeleccionado.nombre}</h2>
                <p>NIT: {clienteSeleccionado.nit || 'N/A'} | Fecha de impresión: {new Date().toLocaleDateString('es-CO')}</p>
              </div>

              {ordenes.map((orden) => {
                const total = calcularTotal(orden);
                const totalFinal = total;
                const esCredito = Boolean(orden.credito);
                const saldoPendiente = esCredito ? (orden.creditoDetalle?.saldoPendiente || 0) : 0;
                const detalles = Array.isArray(orden.items) ? orden.items : [];

                return (
                  <div key={orden.id} className="orden-print-section">
                    <div className="orden-print-header">
                      <h3>Orden #{orden.numero}</h3>
                              <span style={{ fontSize: '0.7rem', color: '#000' }}>
                                {fmtFecha(orden.fecha)}
                              </span>
                    </div>
                    
                    <div className="orden-print-info">
                      <div className="orden-print-info-row">
                        <span><strong>Estado:</strong></span>
                        <span>{formatearEstado(orden.estado)}</span>
                      </div>
                      <div className="orden-print-info-row">
                        <span><strong>Tipo:</strong></span>
                        <span>{orden.venta ? 'VENTA' : 'COTIZACIÓN'}</span>
                      </div>
                      <div className="orden-print-info-row">
                        <span><strong>Sede:</strong></span>
                        <span>{orden.sede?.nombre || '-'}</span>
                      </div>
                      <div className="orden-print-info-row">
                        <span><strong>Crédito:</strong></span>
                        <span>{esCredito ? 'SÍ' : 'NO'}</span>
                      </div>
                    </div>

                    {detalles.length > 0 && (
                      <div className="orden-print-items">
                        <table className="orden-print-items-table">
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Producto</th>
                              <th>Descripción</th>
                              <th style={{ textAlign: 'center' }}>Cant.</th>
                              <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                              <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalles.map((d, i) => (
                              <tr key={d.id || i}>
                                <td>{d.producto?.codigo ?? "-"}</td>
                                <td>{d.producto?.nombre ?? "-"}</td>
                                <td>{d.descripcion ?? "-"}</td>
                                <td style={{ textAlign: 'center' }}>{d.cantidad}</td>
                                <td style={{ textAlign: 'right' }}>{fmtCOP(d.precioUnitario)}</td>
                                <td style={{ textAlign: 'right' }}>{fmtCOP(d.totalLinea)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="orden-print-totals">
                      <div className="orden-print-totals-row">
                        <span>Subtotal: </span>
                        <strong>{fmtCOP(total)}</strong>
                      </div>
                      <div className="orden-print-totals-row">
                        <span>Total: </span>
                        <strong>{fmtCOP(totalFinal)}</strong>
                      </div>
                      {esCredito && (
                        <div className="orden-print-totals-row">
                          <span>Saldo Pendiente: </span>
                          <strong style={{ color: '#000' }}>
                            {fmtCOP(saldoPendiente)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="historico-totales">
                <h3>RESUMEN GENERAL</h3>
                <table className="historico-totales-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Total de Órdenes</strong></td>
                      <td>{totalOrdenes}</td>
                    </tr>
                    <tr>
                      <td><strong>Órdenes a Crédito</strong></td>
                      <td>{ordenes.filter(o => o.credito).length}</td>
                    </tr>
                    <tr>
                      <td><strong>Subtotal General</strong></td>
                      <td>{fmtCOP(totalMonto)}</td>
                    </tr>
                    <tr>
                    </tr>
                    <tr>
                      <td><strong>Total General</strong></td>
                      <td>{fmtCOP(ordenes.reduce((sum, orden) => {
                        const total = calcularTotal(orden);
                        return sum + total;
                      }, 0))}</td>
                    </tr>
                    <tr>
                      <td><strong>Saldo Pendiente Total</strong></td>
                      <td style={{ color: '#000', fontWeight: '600' }}>
                        {fmtCOP(totalCredito)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Órdenes */}
          <div style={{ 
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem'
          }}>
            {!clienteSeleccionado ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem',
                fontStyle: 'italic'
              }}>
                Seleccione un cliente para ver su histórico de órdenes
              </div>
            ) : loading ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem'
              }}>
                Cargando órdenes...
              </div>
            ) : ordenes.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem',
                fontStyle: 'italic'
              }}>
                Este cliente no tiene órdenes registradas
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ 
                  overflowY: 'auto', 
                  overflowX: 'auto', 
                  flex: 1
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse', 
                    fontSize: '0.85rem', 
                    minWidth: '1000px'
                  }}>
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      zIndex: 5, 
                      backgroundColor: '#1e2753', 
                      color: '#fff' 
                    }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #fff' }}>FECHA</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ORDEN</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ESTADO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>TIPO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>SEDE</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SUBTOTAL</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>TOTAL</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>CRÉDITO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SALDO PENDIENTE</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.map((orden, index) => {
                        const total = calcularTotal(orden);
                        const totalFinal = total;
                        const esCredito = Boolean(orden.credito);
                        const saldoPendiente = esCredito ? (orden.creditoDetalle?.saldoPendiente || 0) : 0;
                        const tieneSaldo = saldoPendiente > 0;
                        const detalles = Array.isArray(orden.items) ? orden.items : [];
                        const ordenId = orden.id;

                        return (
                          <Fragment key={`orden-${ordenId}`}>
                            <tr
                              style={{
                                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9'}
                            >
                              <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0' }}>
                                {fmtFecha(orden.fecha)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                #{orden.numero}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
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
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                {orden.venta ? (
                                  <span style={{ color: '#28a745', fontWeight: '600' }}>VENTA</span>
                                ) : (
                                  <span style={{ color: '#666' }}>COTIZACIÓN</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                {orden.sede?.nombre || '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                {fmtCOP(total)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                {fmtCOP(totalFinal)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                {esCredito ? (
                                  <span style={{ color: '#007bff', fontWeight: '600' }}>SÍ</span>
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                              <td style={{ 
                                padding: '0.75rem', 
                                textAlign: 'right',
                                borderRight: '1px solid #e0e0e0',
                                fontWeight: tieneSaldo ? '600' : 'normal',
                                color: tieneSaldo ? '#dc3545' : '#28a745'
                              }}>
                                {esCredito ? fmtCOP(saldoPendiente) : '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  className="btnLink"
                                  onClick={() => toggleExpand(ordenId)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3125rem 0.625rem'
                                  }}
                                >
                                  {expanded[ordenId] ? "Ocultar" : "Detalles"}
                                </button>
                              </td>
                            </tr>

                            {expanded[ordenId] && (
                              <tr key={`detalles-${ordenId}`}>
                                <td colSpan={11} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                                  {detalles.length === 0 ? (
                                    <div className="empty-sub" style={{ margin: '1rem', textAlign: 'center' }}>
                                      Sin ítems.
                                    </div>
                                  ) : (
                                    <div className="orden-detalles-container" style={{ padding: '1rem' }}>
                                      <table className="orden-detalles-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#1e2753', color: '#fff' }}>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>Código</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>Producto</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>Descripción</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>Cantidad</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>Precio Unit.</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Línea</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detalles.map((d, i) => (
                                            <tr 
                                              key={`item-${d.id || i}-${ordenId}`}
                                              style={{
                                                backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                                                borderBottom: '1px solid #e0e0e0'
                                              }}
                                            >
                                              <td style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0' }}>
                                                {d.producto?.codigo ?? "-"}
                                              </td>
                                              <td style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0' }}>
                                                {d.producto?.nombre ?? "-"}
                                              </td>
                                              <td style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0' }}>
                                                {d.descripcion ?? "-"}
                                              </td>
                                              <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                                {d.cantidad}
                                              </td>
                                              <td style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                                {fmtCOP(d.precioUnitario)}
                                              </td>
                                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>
                                                {fmtCOP(d.totalLinea)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot style={{ 
                      backgroundColor: '#f8f9fa', 
                      fontWeight: 'bold', 
                      position: 'sticky', 
                      bottom: 0, 
                      zIndex: 3 
                    }}>
                      <tr>
                        <td colSpan="6" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          TOTALES:
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(ordenes.reduce((sum, orden) => sum + calcularTotal(orden), 0))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(ordenes.reduce((sum, orden) => {
                            const total = calcularTotal(orden);
                            return sum + total;
                          }, 0))}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', borderTop: '2px solid #1e2753' }}>
                          {ordenes.filter(o => o.credito).length} / {totalOrdenes}
                        </td>
                        <td style={{ 
                          padding: '0.75rem', 
                          textAlign: 'right', 
                          borderTop: '2px solid #1e2753',
                          color: totalCredito > 0 ? '#dc3545' : '#28a745'
                        }}>
                          {fmtCOP(totalCredito)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de selección de clientes */}
      {showClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 100001 }} onClick={() => {
          setClienteSearchModal("");
          setShowClienteModal(false);
        }}>
          <div className="modal-container" style={{ 
            maxWidth: '900px', 
            width: '95vw', 
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Seleccionar Cliente</h2>
              <button className="close-btn" onClick={() => {
                setClienteSearchModal("");
                setShowClienteModal(false);
              }}>
                ✕
              </button>
            </header>
            
            <div style={{ marginBottom: '1rem', flexShrink: 0, padding: '1.2rem' }}>
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  padding: '0.5rem',
                  border: '1px solid #d2d5e2',
                  borderRadius: '5px'
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              border: '1px solid #e6e8f0',
              borderRadius: '8px',
              margin: '0 1.2rem',
              marginBottom: '1.2rem'
            }}>
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                
                // Ordenar alfabéticamente
                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                });
                
                if (sorted.length === 0) {
                  return (
                    <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                      No se encontraron clientes
                    </div>
                  );
                }
                
                return (
                  <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Nombre</th>
                          <th style={{ width: '15%' }}>NIT</th>
                          <th style={{ width: '25%' }}>Correo</th>
                          <th style={{ width: '15%' }}>Ciudad</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td title={c.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {c.nombre || '-'}
                            </td>
                            <td title={c.nit || '-'}>
                              {c.nit || '-'}
                            </td>
                            <td title={c.correo || '-'}>
                              {c.correo || '-'}
                            </td>
                            <td title={c.ciudad || '-'}>
                              {c.ciudad || '-'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteSeleccionado(c);
                                  setClienteSearchModal("");
                                  setShowClienteModal(false);
                                }}
                                className="btn-save"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

