import React, { useState, useEffect, Fragment } from "react";
import { listarClientes } from "../services/ClientesService.js";
import { listarFacturasPorCliente, listarFacturasTabla } from "../services/FacturasService.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Table.css";
import "../styles/OrdenesTable.css";

export default function HistoricoFacturasClienteModal({ isOpen, onClose }) {
  const { showError } = useToast();
  const { isAdmin, sedeId } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [facturas, setFacturas] = useState([]);
  const [facturasCompletas, setFacturasCompletas] = useState([]); // Almacenar todas las facturas sin filtrar
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
          console.error("Error cargando clientes:", err);
          showError("No se pudieron cargar los clientes.");
        }
      };
      cargarClientes();
    }
  }, [isOpen, showError]);

  // Cargar facturas cuando se selecciona un cliente o cambian las fechas
  useEffect(() => {
    if (clienteSeleccionado?.id) {
      cargarFacturasCliente(clienteSeleccionado.id);
    } else {
      setFacturas([]);
      setFacturasCompletas([]);
    }
  }, [clienteSeleccionado]);

  // Filtrar facturas por fecha cuando cambian los filtros
  useEffect(() => {
    if (facturasCompletas.length === 0) {
      setFacturas([]);
      return;
    }

    let facturasFiltradas = [...facturasCompletas];

    // Filtrar por fecha desde
    if (fechaDesde) {
      facturasFiltradas = facturasFiltradas.filter(f => {
        const fechaFactura = new Date(f.fecha);
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        return fechaFactura >= fechaDesdeDate;
      });
    }

    // Filtrar por fecha hasta
    if (fechaHasta) {
      facturasFiltradas = facturasFiltradas.filter(f => {
        const fechaFactura = new Date(f.fecha);
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        return fechaFactura <= fechaHastaDate;
      });
    }

    setFacturas(facturasFiltradas);
  }, [fechaDesde, fechaHasta, facturasCompletas]);

  const cargarFacturasCliente = async (clienteId) => {
    setLoading(true);
    try {
      console.log(" [HistoricoFacturasCliente] Buscando facturas para clienteId:", clienteId, "Tipo:", typeof clienteId);
      let facturasData;
      try {
        // Intentar primero con el endpoint específico por cliente
        facturasData = await listarFacturasPorCliente(clienteId);
        console.log(" [HistoricoFacturasCliente] Facturas recibidas de listarFacturasPorCliente:", facturasData?.length || 0);
      } catch (error) {
        // Fallback: obtener todas y filtrar por cliente
        console.warn(" [HistoricoFacturasCliente] Error con listarFacturasPorCliente, usando fallback:", error);
        const params = isAdmin ? {} : { sedeId };
        const todasFacturas = await listarFacturasTabla(params);
        console.log(" [HistoricoFacturasCliente] Total facturas obtenidas:", todasFacturas?.length || 0);
        
        // Filtrar por cliente - comparar tanto por ID como por nombre
        facturasData = Array.isArray(todasFacturas) ? todasFacturas.filter(f => {
          const facturaClienteId = f.clienteId || f.cliente?.id || f.orden?.cliente?.id;
          const facturaClienteNombre = f.cliente?.nombre || f.orden?.cliente?.nombre;
          const clienteNombre = clienteSeleccionado?.nombre;
          
          // Comparar por ID
          const coincidePorId = facturaClienteId && Number(facturaClienteId) === Number(clienteId);
          
          // Comparar por nombre (fallback si no hay ID)
          const coincidePorNombre = facturaClienteNombre && clienteNombre && 
            facturaClienteNombre.trim().toUpperCase() === clienteNombre.trim().toUpperCase();
          
          const coincide = coincidePorId || coincidePorNombre;
          
          if (!coincide) {
            console.log(" [HistoricoFacturasCliente] Factura filtrada:", {
              facturaId: f.id,
              facturaNumero: f.numeroFactura || f.numero,
              facturaClienteId,
              facturaClienteNombre,
              clienteIdBuscado: clienteId,
              clienteNombreBuscado: clienteNombre,
              coincidePorId,
              coincidePorNombre
            });
          }
          
          return coincide;
        }) : [];
        
        console.log(" [HistoricoFacturasCliente] Facturas después de filtrar:", facturasData.length);
      }
      
      // Ordenar por fecha descendente (más recientes primero)
      const facturasOrdenadas = Array.isArray(facturasData) ? facturasData.sort((a, b) => {
        const fechaA = new Date(a.fecha || 0);
        const fechaB = new Date(b.fecha || 0);
        const diffFechas = fechaB - fechaA;
        if (diffFechas === 0) return (b.id || 0) - (a.id || 0);
        return diffFechas;
      }) : [];
      
      console.log(" [HistoricoFacturasCliente] Facturas finales ordenadas:", facturasOrdenadas.length);
      setFacturasCompletas(facturasOrdenadas);
      // setFacturas se actualizará automáticamente por el useEffect de filtrado
    } catch (err) {
      console.error(" [HistoricoFacturasCliente] Error cargando facturas del cliente:", err);
      console.error(" [HistoricoFacturasCliente] Error response:", err.response?.data);
      console.error(" [HistoricoFacturasCliente] Error status:", err.response?.status);
      showError("No se pudieron cargar las facturas del cliente.");
      setFacturas([]);
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

  // Formatear estado
  const formatearEstado = (estado) => {
    const estadoLimpio = estado?.toLowerCase() || 'pendiente';
    const textos = {
      'pendiente': 'Pendiente',
      'pagada': 'Pagada',
      'anulada': 'Anulada',
      'en_proceso': 'En Proceso'
    };
    return textos[estadoLimpio] || estado || 'Pendiente';
  };

  // Alternar expandir/ocultar detalles
  const toggleExpand = (facturaId) => {
    setExpanded((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  };

  // Función para crear ventana de impresión
  const crearVentanaImpresion = () => {
    if (!clienteSeleccionado || facturas.length === 0) return null;
    
    const contenido = document.getElementById('printable-historico-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Histórico de Facturas - ${clienteSeleccionado.nombre}</title>
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
            
            .factura-print-section {
              margin-bottom: 12px;
              page-break-inside: avoid;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 6px;
              background: transparent;
            }
            
            .factura-print-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #999;
            }
            
            .factura-print-header h3 {
              margin: 0;
              color: #000;
              font-size: 0.85rem;
              font-weight: 600;
            }
            
            .factura-print-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              margin-bottom: 6px;
              font-size: 0.7rem;
            }
            
            .factura-print-info-row {
              display: flex;
              justify-content: space-between;
            }
            
            .factura-print-totals {
              margin-top: 6px;
              padding-top: 4px;
              border-top: 1px solid #999;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              font-size: 0.75rem;
            }
            
            .factura-print-totals-row {
              text-align: right;
            }
            
            .factura-print-totals-row strong {
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
              
              .factura-print-section {
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
            var timeoutId;
            
            function cerrarVentana() {
              if (!window.closed) {
                window.close();
              }
            }
            
            window.addEventListener('afterprint', function() {
              clearTimeout(timeoutId);
              setTimeout(cerrarVentana, 100);
            });
            
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
    if (!clienteSeleccionado || facturas.length === 0) {
      showError("No hay facturas para imprimir");
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
  const totalFacturas = facturas.length;
  const totalMonto = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
  const totalSubtotal = facturas.reduce((sum, f) => sum + (f.subtotal || 0), 0);
  const totalDescuentos = facturas.reduce((sum, f) => sum + (f.descuentos || 0), 0);
  const totalIva = facturas.reduce((sum, f) => sum + (f.iva || 0), 0);
  const totalRetencion = facturas.reduce((sum, f) => sum + (f.retencionFuente || 0), 0);

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
              Histórico de Facturas por Cliente
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {clienteSeleccionado && facturas.length > 0 && (
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

          {/* Selección de Cliente y Filtros de Fecha */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '2px solid #1e2753',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '600',
                color: '#1e2753'
              }}>
                Seleccionar Cliente
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={clienteSeleccionado?.nombre || ""}
                  readOnly
                  onClick={() => setShowClienteModal(true)}
                  placeholder="Haz clic para buscar cliente..."
                  className="clientes-input"
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.5rem'
                  }}
                />
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setFacturas([]);
                      setFacturasCompletas([]);
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
              </div>
            </div>

            {/* Filtros de Fecha */}
            {clienteSeleccionado && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#fff',
                borderRadius: '6px',
                border: '1px solid #d2d5e2'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600',
                  color: '#1e2753',
                  fontSize: '0.9rem'
                }}>
                  Filtrar por Fechas (Opcional)
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.25rem', 
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      Desde:
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="clientes-input"
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '0.5rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.25rem', 
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      Hasta:
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      min={fechaDesde || undefined}
                      className="clientes-input"
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '0.5rem'
                      }}
                    />
                  </div>
                  {(fechaDesde || fechaHasta) && (
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contenido imprimible (oculto) */}
          {clienteSeleccionado && facturas.length > 0 && (
            <div id="printable-historico-content" style={{ display: 'none' }}>
              <div className="historico-header">
                <h1>HISTÓRICO DE FACTURAS</h1>
                <h2>{clienteSeleccionado.nombre}</h2>
                <p>NIT: {clienteSeleccionado.nit || 'N/A'} | Fecha de impresión: {new Date().toLocaleDateString('es-CO')}</p>
              </div>

              {facturas.map((factura) => {
                const subtotal = factura.subtotal || 0;
                const descuentos = factura.descuentos || 0;
                const iva = factura.iva || 0;
                const retencionFuente = factura.retencionFuente || 0;
                const total = factura.total || (subtotal - descuentos + iva - retencionFuente);

                return (
                  <div key={factura.id} className="factura-print-section">
                    <div className="factura-print-header">
                      <h3>Factura #{factura.numeroFactura || factura.numero || factura.id}</h3>
                      <span style={{ fontSize: '0.7rem', color: '#000' }}>
                        {fmtFecha(factura.fecha)}
                      </span>
                    </div>
                    
                    <div className="factura-print-info">
                      <div className="factura-print-info-row">
                        <span><strong>Estado:</strong></span>
                        <span>{formatearEstado(factura.estado)}</span>
                      </div>
                      <div className="factura-print-info-row">
                        <span><strong>Forma de Pago:</strong></span>
                        <span>{factura.formaPago || '-'}</span>
                      </div>
                      <div className="factura-print-info-row">
                        <span><strong>Orden:</strong></span>
                        <span>#{factura.orden?.numero || '-'}</span>
                      </div>
                      <div className="factura-print-info-row">
                        <span><strong>Observaciones:</strong></span>
                        <span>{factura.observaciones || '-'}</span>
                      </div>
                    </div>

                    <div className="factura-print-totals">
                      <div className="factura-print-totals-row">
                        <span>Subtotal: </span>
                        <strong>{fmtCOP(subtotal)}</strong>
                      </div>
                      {descuentos > 0 && (
                        <div className="factura-print-totals-row">
                          <span>Descuentos: </span>
                          <strong style={{ color: '#000' }}>-{fmtCOP(descuentos)}</strong>
                        </div>
                      )}
                      {iva > 0 && (
                        <div className="factura-print-totals-row">
                          <span>IVA: </span>
                          <strong>{fmtCOP(iva)}</strong>
                        </div>
                      )}
                      {retencionFuente > 0 && (
                        <div className="factura-print-totals-row">
                          <span>Retención: </span>
                          <strong style={{ color: '#000' }}>-{fmtCOP(retencionFuente)}</strong>
                        </div>
                      )}
                      <div className="factura-print-totals-row">
                        <span>Total: </span>
                        <strong>{fmtCOP(total)}</strong>
                      </div>
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
                      <td><strong>Total de Facturas</strong></td>
                      <td>{totalFacturas}</td>
                    </tr>
                    <tr>
                      <td><strong>Facturas Pagadas</strong></td>
                      <td>{facturas.filter(f => f.estado?.toLowerCase() === 'pagada').length}</td>
                    </tr>
                    <tr>
                      <td><strong>Subtotal General</strong></td>
                      <td>{fmtCOP(totalSubtotal)}</td>
                    </tr>
                    <tr>
                      <td><strong>Descuentos Totales</strong></td>
                      <td>{fmtCOP(totalDescuentos)}</td>
                    </tr>
                    <tr>
                      <td><strong>IVA Total</strong></td>
                      <td>{fmtCOP(totalIva)}</td>
                    </tr>
                    <tr>
                      <td><strong>Retención Total</strong></td>
                      <td>{fmtCOP(totalRetencion)}</td>
                    </tr>
                    <tr>
                      <td><strong>Total General</strong></td>
                      <td>{fmtCOP(totalMonto)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabla de Facturas */}
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
                Seleccione un cliente para ver su histórico de facturas
              </div>
            ) : loading ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem'
              }}>
                Cargando facturas...
              </div>
            ) : facturas.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem',
                fontStyle: 'italic'
              }}>
                Este cliente no tiene facturas registradas
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
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>FACTURA</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ESTADO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ORDEN</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SUBTOTAL</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>DESCUENTOS</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>IVA</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>RETEFUENTE</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>TOTAL</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((factura, index) => {
                        const subtotal = factura.subtotal || 0;
                        const descuentos = factura.descuentos || 0;
                        const iva = factura.iva || 0;
                        const retencionFuente = factura.retencionFuente || 0;
                        const total = factura.total || (subtotal - descuentos + iva - retencionFuente);
                        const facturaId = factura.id;

                        return (
                          <Fragment key={`factura-${facturaId}`}>
                            <tr
                              style={{
                                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9'}
                            >
                              <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0' }}>
                                {fmtFecha(factura.fecha)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                #{factura.numeroFactura || factura.numero || factura.id}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  backgroundColor: factura.estado?.toLowerCase() === 'anulada' ? '#f8d7da' : 
                                                  factura.estado?.toLowerCase() === 'pagada' ? '#d4edda' :
                                                  factura.estado?.toLowerCase() === 'en_proceso' ? '#d1ecf1' : '#fff3cd',
                                  color: factura.estado?.toLowerCase() === 'anulada' ? '#721c24' :
                                         factura.estado?.toLowerCase() === 'pagada' ? '#155724' :
                                         factura.estado?.toLowerCase() === 'en_proceso' ? '#0c5460' : '#856404'
                                }}>
                                  {formatearEstado(factura.estado)}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                #{factura.orden?.numero || '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                {fmtCOP(subtotal)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: descuentos > 0 ? '#dc3545' : '#666' }}>
                                {descuentos > 0 ? `-${fmtCOP(descuentos)}` : '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                {fmtCOP(iva)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: retencionFuente > 0 ? '#dc3545' : '#666' }}>
                                {retencionFuente > 0 ? `-${fmtCOP(retencionFuente)}` : '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                {fmtCOP(total)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  className="btnLink"
                                  onClick={() => toggleExpand(facturaId)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3125rem 0.625rem'
                                  }}
                                >
                                  {expanded[facturaId] ? "Ocultar" : "Detalles"}
                                </button>
                              </td>
                            </tr>

                            {expanded[facturaId] && (
                              <tr key={`detalles-${facturaId}`}>
                                <td colSpan={10} style={{ padding: '1rem', backgroundColor: '#f8f9fa' }}>
                                  <div style={{ fontSize: '0.85rem' }}>
                                    <div style={{ marginBottom: '0.5rem' }}>
                                      <strong>Forma de Pago:</strong> {factura.formaPago || '-'}
                                    </div>
                                    {factura.observaciones && (
                                      <div style={{ marginBottom: '0.5rem' }}>
                                        <strong>Observaciones:</strong> {factura.observaciones}
                                      </div>
                                    )}
                                    {retencionFuente > 0 && (
                                      <div style={{ marginBottom: '0.5rem', color: '#dc3545' }}>
                                        <strong>Retención de Fuente:</strong> -{fmtCOP(retencionFuente)}
                                      </div>
                                    )}
                                  </div>
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
                        <td colSpan="5" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          TOTALES:
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(totalSubtotal)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(totalDescuentos)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(totalIva)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: totalRetencion > 0 ? '#dc3545' : '#666' }}>
                          {totalRetencion > 0 ? `-${fmtCOP(totalRetencion)}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(totalMonto)}
                        </td>
                        <td style={{ padding: '0.75rem', borderTop: '2px solid #1e2753' }}></td>
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

