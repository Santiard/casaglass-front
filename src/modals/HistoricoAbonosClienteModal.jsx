import React, { useState, useEffect, Fragment } from "react";
import { listarClientes } from "../services/ClientesService.js";
import { listarAbonosPorCliente, listarCreditosCliente } from "../services/AbonosService.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Table.css";
import "../styles/OrdenesTable.css";

export default function HistoricoAbonosClienteModal({ isOpen, onClose }) {
  const { showError } = useToast();
  const { isAdmin, sedeId } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("abonos"); // "abonos" o "creditos"
  const [abonos, setAbonos] = useState([]);
  const [abonosCompletos, setAbonosCompletos] = useState([]); // Almacenar todos los abonos sin filtrar
  const [creditos, setCreditos] = useState([]);
  const [creditosCompletos, setCreditosCompletos] = useState([]); // Almacenar todos los créditos sin filtrar
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

  // Cargar abonos cuando se selecciona un cliente
  useEffect(() => {
    if (clienteSeleccionado?.id) {
      if (activeTab === "abonos") {
        cargarAbonosCliente(clienteSeleccionado.id);
      } else if (activeTab === "creditos") {
        cargarCreditosCliente(clienteSeleccionado.id);
      }
    } else {
      setAbonos([]);
      setAbonosCompletos([]);
      setCreditos([]);
      setCreditosCompletos([]);
    }
  }, [clienteSeleccionado, activeTab]);

  // Cargar abonos con filtros de fecha del backend cuando cambian los filtros
  useEffect(() => {
    if (!clienteSeleccionado) {
      setAbonos([]);
      setCreditos([]);
      return;
    }

    // Recargar según la pestaña activa con filtros de fecha del backend
    if (activeTab === "abonos") {
      cargarAbonosCliente(clienteSeleccionado.id);
    } else if (activeTab === "creditos") {
      cargarCreditosCliente(clienteSeleccionado.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, clienteSeleccionado]);

  const cargarAbonosCliente = async (clienteId) => {
    setLoading(true);
    try {
      // Construir parámetros con filtros de fecha para el backend
      const options = {};
      if (fechaDesde) {
        options.fechaDesde = fechaDesde;
      }
      if (fechaHasta) {
        options.fechaHasta = fechaHasta;
      }
      
      const abonosData = await listarAbonosPorCliente(clienteId, options);
      
      // Ordenar por fecha descendente (más recientes primero) - el backend ya puede ordenar, pero mantenemos ordenamiento local por compatibilidad
      const abonosOrdenados = (Array.isArray(abonosData) ? abonosData : []).sort((a, b) => {
        const fechaA = new Date(a.fecha || 0);
        const fechaB = new Date(b.fecha || 0);
        return fechaB - fechaA;
      });
      
      setAbonos(abonosOrdenados);
      setAbonosCompletos(abonosOrdenados); // Mantener para compatibilidad
    } catch (err) {
      console.error("Error cargando abonos del cliente:", err);
      showError("No se pudieron cargar los abonos del cliente.");
      setAbonos([]);
      setAbonosCompletos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarCreditosCliente = async (clienteId) => {
    setLoading(true);
    try {
      // Construir parámetros con filtros de fecha para el backend
      const options = {};
      if (fechaDesde) {
        options.fechaDesde = fechaDesde;
      }
      if (fechaHasta) {
        options.fechaHasta = fechaHasta;
      }
      
      const creditosData = await listarCreditosCliente(clienteId, options);
      
      // Ordenar por fecha descendente (más recientes primero)
      const creditosOrdenados = (Array.isArray(creditosData) ? creditosData : []).sort((a, b) => {
        const fechaA = new Date(a.orden?.fecha || 0);
        const fechaB = new Date(b.orden?.fecha || 0);
        return fechaB - fechaA;
      });
      
      setCreditos(creditosOrdenados);
      setCreditosCompletos(creditosOrdenados); // Mantener para compatibilidad
    } catch (err) {
      console.error("Error cargando créditos del cliente:", err);
      showError("No se pudieron cargar los créditos del cliente.");
      setCreditos([]);
      setCreditosCompletos([]);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
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

  // Alternar expandir/ocultar detalles
  const toggleExpand = (abonoId) => {
    setExpanded((prev) => ({ ...prev, [abonoId]: !prev[abonoId] }));
  };

  // Función para crear ventana de impresión
  const crearVentanaImpresion = () => {
    if (!clienteSeleccionado || abonos.length === 0) return null;
    
    const contenido = document.getElementById('printable-abonos-historico-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Histórico de Abonos - ${clienteSeleccionado.nombre}</title>
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
            
            .abono-print-section {
              margin-bottom: 12px;
              page-break-inside: avoid;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 6px;
              background: transparent;
            }
            
            .abono-print-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #999;
            }
            
            .abono-print-header h3 {
              margin: 0;
              color: #000;
              font-size: 0.85rem;
              font-weight: 600;
            }
            
            .abono-print-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              margin-bottom: 6px;
              font-size: 0.7rem;
            }
            
            .abono-print-info-row {
              display: flex;
              justify-content: space-between;
            }
            
            .abono-print-totals {
              margin-top: 6px;
              padding-top: 4px;
              border-top: 1px solid #999;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              font-size: 0.75rem;
            }
            
            .abono-print-totals-row {
              text-align: right;
            }
            
            .abono-print-totals-row strong {
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
              
              .abono-print-section {
                page-break-inside: avoid;
              }
              
              .historico-totales {
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

  // Función para imprimir abonos
  const handleImprimir = () => {
    if (!clienteSeleccionado || abonos.length === 0) {
      showError("No hay abonos para imprimir");
      return;
    }
    const ventana = crearVentanaImpresion();
    if (ventana) {
      ventana.onload = () => {
        ventana.print();
      };
    }
  };

  // Función para imprimir créditos
  const handleImprimirCreditos = () => {
    if (!clienteSeleccionado || creditos.length === 0) {
      showError("No hay créditos para imprimir");
      return;
    }
    const ventana = crearVentanaImpresionCreditos();
    if (ventana) {
      ventana.onload = () => {
        ventana.print();
      };
    }
  };

  // Función para crear ventana de impresión de créditos
  const crearVentanaImpresionCreditos = () => {
    if (!clienteSeleccionado || creditos.length === 0) return null;
    
    const contenido = document.getElementById('printable-creditos-historico-content').innerHTML;
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Histórico de Créditos - ${clienteSeleccionado.nombre}</title>
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
            
            .creditos-print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              font-size: 0.7rem;
            }
            
            .creditos-print-table th,
            .creditos-print-table td {
              padding: 6px 8px;
              text-align: left;
              border: 1px solid #999;
            }
            
            .creditos-print-table th {
              background-color: #1e2753;
              color: #fff;
              font-weight: 600;
              text-align: center;
            }
            
            .creditos-print-table td {
              font-weight: 400;
              color: #000;
            }
            
            .creditos-print-table td.right {
              text-align: right;
            }
            
            .creditos-print-table td.center {
              text-align: center;
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
              
              .creditos-print-table {
                page-break-inside: avoid;
              }
              
              .historico-totales {
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

  if (!isOpen) return null;

  // Calcular totales
  const totalAbonos = abonos.length;
  const totalMonto = abonos.reduce((sum, abono) => sum + (abono.total || 0), 0);

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
              Histórico del Cliente
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {clienteSeleccionado && abonos.length > 0 && activeTab === "abonos" && (
                <button
                  onClick={handleImprimir}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    background: '#1e2753',
                    color: '#fff',
                    border: '2px solid #1e2753',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fff';
                    e.target.style.color = '#1e2753';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#1e2753';
                    e.target.style.color = '#fff';
                  }}
                  title="Imprimir histórico completo"
                >
                  Imprimir
                </button>
              )}
              {clienteSeleccionado && creditos.length > 0 && activeTab === "creditos" && (
                <button
                  onClick={handleImprimirCreditos}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    background: '#1e2753',
                    color: '#fff',
                    border: '2px solid #1e2753',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fff';
                    e.target.style.color = '#1e2753';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#1e2753';
                    e.target.style.color = '#fff';
                  }}
                  title="Imprimir histórico de créditos"
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

          {/* Contenido imprimible (oculto) */}
          {clienteSeleccionado && abonos.length > 0 && (
            <div id="printable-abonos-historico-content" style={{ display: 'none' }}>
              <div className="historico-header">
                <h1>HISTÓRICO DE ABONOS</h1>
                <h2>{clienteSeleccionado.nombre}</h2>
                <p>NIT: {clienteSeleccionado.nit || 'N/A'} | Fecha de impresión: {new Date().toLocaleDateString('es-CO')}</p>
              </div>

              {abonos.map((abono) => {
                const distribucion = abono.distribucion || [];

                return (
                  <div key={abono.id} className="abono-print-section">
                    <div className="abono-print-header">
                      <h3>Abono #{abono.factura || abono.id}</h3>
                      <span style={{ fontSize: '0.7rem', color: '#000' }}>
                        {fmtFecha(abono.fecha)}
                      </span>
                    </div>
                    
                    <div className="abono-print-info">
                      <div className="abono-print-info-row">
                        <span><strong>Método de Pago:</strong></span>
                        <span>{abono.metodoPago || '-'}</span>
                      </div>
                      <div className="abono-print-info-row">
                        <span><strong>Factura:</strong></span>
                        <span>{abono.factura || '-'}</span>
                      </div>
                    </div>

                    {distribucion.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '0.7rem' }}>
                        <strong>Distribución por Órdenes:</strong>
                        {distribucion.map((dist, i) => (
                          <div key={i} style={{ marginLeft: '8px', marginTop: '2px' }}>
                            Orden #{dist.numeroOrden || dist.ordenId}: {fmtCOP(dist.montoAbono || 0)} - Saldo Restante: {fmtCOP(dist.saldoRestante || 0)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="abono-print-totals">
                      <div className="abono-print-totals-item">
                        <span>Total: </span>
                        <strong>{fmtCOP(abono.total || 0)}</strong>
                      </div>
                      <div className="abono-print-totals-item">
                        <span>Saldo Post-Abono: </span>
                        <strong style={{ color: '#000' }}>{fmtCOP(abono.saldo || 0)}</strong>
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
                      <td><strong>Total de Abonos</strong></td>
                      <td>{totalAbonos}</td>
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

          {/* Contenido de impresión de créditos (oculto) */}
          {clienteSeleccionado && creditos.length > 0 && activeTab === "creditos" && (
            <div id="printable-creditos-historico-content" style={{ display: 'none' }}>
              <div className="historico-header">
                <h1>HISTÓRICO DE CRÉDITOS</h1>
                <h2>{clienteSeleccionado.nombre}</h2>
                <p>NIT: {clienteSeleccionado.nit || 'N/A'} | Fecha de impresión: {new Date().toLocaleDateString('es-CO')}</p>
              </div>

              <table className="creditos-print-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Fecha</th>
                    <th>Obra</th>
                    <th>Total Crédito</th>
                    <th>Total Abonado</th>
                    <th>Saldo Pendiente</th>
                    <th>Retención</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {creditos.map((credito) => (
                    <tr key={credito.id}>
                      <td className="center">#{credito.orden?.numero || '-'}</td>
                      <td className="center">{fmtFecha(credito.orden?.fecha)}</td>
                      <td>{credito.orden?.obra || '-'}</td>
                      <td className="right">{fmtCOP(credito.totalCredito || 0)}</td>
                      <td className="right">{fmtCOP(credito.totalAbonado || 0)}</td>
                      <td className="right">{fmtCOP(credito.saldoPendiente || 0)}</td>
                      <td className="center">
                        {credito.orden?.retencionFuente && credito.orden?.retencionFuente > 0 
                          ? fmtCOP(credito.orden.retencionFuente) 
                          : '-'
                        }
                      </td>
                      <td className="center">
                        {credito.saldoPendiente === 0 ? 'Pagado' : 'Pendiente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
                      <td><strong>Total de Créditos</strong></td>
                      <td>{creditos.length}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Crédito</strong></td>
                      <td>{fmtCOP(creditos.reduce((sum, c) => sum + (c.totalCredito || 0), 0))}</td>
                    </tr>
                    <tr>
                      <td><strong>Total Abonado</strong></td>
                      <td>{fmtCOP(creditos.reduce((sum, c) => sum + (c.totalAbonado || 0), 0))}</td>
                    </tr>
                    <tr>
                      <td><strong>Saldo Pendiente Total</strong></td>
                      <td>{fmtCOP(creditos.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selección de Cliente y Filtros de Fecha */}
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
                    setAbonos([]);
                    setAbonosCompletos([]);
                    setCreditos([]);
                    setCreditosCompletos([]);
                    setFechaDesde("");
                    setFechaHasta("");
                    setExpanded({});
                  }}
                  className="btn-cancelar"
                  style={{ padding: '0.5rem 0.65rem', fontSize: '0.85rem', minWidth: 'auto' }}
                  title="Limpiar selección"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowClienteModal(true)}
                className="btn-guardar"
                style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.9rem', fontSize: '0.9rem' }}
              >
                Buscar Cliente
              </button>
              {/* Date filters to the right of client input */}
              <div style={{ width: '1px', height: '30px', backgroundColor: '#d2d5e2', margin: '0 0.5rem' }}></div>
              <label style={{ fontWeight: 600, color: '#1e2753', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                Desde:
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="clientes-input"
                style={{ fontSize: '0.9rem', padding: '0.5rem', width: '145px' }}
              />
              <label style={{ fontWeight: 600, color: '#1e2753', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                Hasta:
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
                className="clientes-input"
                style={{ fontSize: '0.9rem', padding: '0.5rem', width: '145px' }}
              />
              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="btn-cancelar"
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  title="Limpiar filtros de fecha"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabs de navegación */}
          {clienteSeleccionado && (
            <div style={{
              display: 'flex',
              gap: '0',
              borderBottom: '2px solid #e6e8f0',
              padding: '0 1.5rem',
              backgroundColor: '#f8f9fa'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab("abonos")}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: activeTab === "abonos" ? '#1e2753' : 'transparent',
                  color: activeTab === "abonos" ? '#fff' : '#666',
                  border: 'none',
                  borderBottom: activeTab === "abonos" ? '3px solid #1e2753' : '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === "abonos" ? '600' : '400',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                Histórico de Abonos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("creditos")}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: activeTab === "creditos" ? '#1e2753' : 'transparent',
                  color: activeTab === "creditos" ? '#fff' : '#666',
                  border: 'none',
                  borderBottom: activeTab === "creditos" ? '3px solid #1e2753' : '3px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === "creditos" ? '600' : '400',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s',
                  borderRadius: '4px 4px 0 0'
                }}
              >
                Histórico de Créditos
              </button>
            </div>
          )}

          {/* Tabla de Abonos */}
          {activeTab === "abonos" && (
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
                Seleccione un cliente para ver su histórico de abonos
              </div>
            ) : loading ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem'
              }}>
                Cargando abonos...
              </div>
            ) : abonos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '3rem',
                fontStyle: 'italic'
              }}>
                Este cliente no tiene abonos registrados
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
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #fff' }}>MÉTODO DE PAGO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>TOTAL</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SALDO POST-ABONO</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abonos.map((abono, index) => {
                        const abonoId = abono.id;
                        const distribucion = abono.distribucion || [];

                        return (
                          <Fragment key={`abono-${abonoId}`}>
                            <tr
                              style={{
                                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9'}
                            >
                              <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0' }}>
                                {fmtFecha(abono.fecha)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                {abono.factura || '-'}
                              </td>
                              <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0', fontSize: '0.8rem' }}>
                                {abono.metodoPago ? (abono.metodoPago.length > 50 ? abono.metodoPago.substring(0, 50) + '...' : abono.metodoPago) : '-'}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                                {fmtCOP(abono.total || 0)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                {fmtCOP(abono.saldo || 0)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  className="btnLink"
                                  onClick={() => toggleExpand(abonoId)}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.3125rem 0.625rem'
                                  }}
                                >
                                  {expanded[abonoId] ? "Ocultar" : "Detalles"}
                                </button>
                              </td>
                            </tr>

                            {expanded[abonoId] && (
                              <tr key={`detalles-${abonoId}`}>
                                <td colSpan={6} style={{ padding: '0', backgroundColor: '#f8f9fa' }}>
                                  {distribucion.length === 0 ? (
                                    <div className="empty-sub" style={{ margin: '1rem', textAlign: 'center' }}>
                                      Sin distribución de órdenes.
                                    </div>
                                  ) : (
                                    <div className="orden-detalles-container" style={{ padding: '1rem' }}>
                                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Distribución por Órdenes:</h4>
                                      <table className="orden-detalles-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#1e2753', color: '#fff' }}>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>Orden</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>Monto Abono</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Saldo Restante</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {distribucion.map((dist, i) => (
                                            <tr 
                                              key={`dist-${i}-${abonoId}`}
                                              style={{
                                                backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                                                borderBottom: '1px solid #e0e0e0'
                                              }}
                                            >
                                              <td style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0' }}>
                                                #{dist.numeroOrden || dist.ordenId}
                                              </td>
                                              <td style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                                {fmtCOP(dist.montoAbono || 0)}
                                              </td>
                                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>
                                                {fmtCOP(dist.saldoRestante || 0)}
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
                        <td colSpan="3" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          TOTALES:
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {fmtCOP(totalMonto)}
                        </td>
                        <td colSpan="2" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                          {totalAbonos} abono{totalAbonos !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Tabla de Créditos */}
          {activeTab === "creditos" && (
          <div style={{ 
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem'
          }}>
            {!clienteSeleccionado ? (
              <div className="empty-state" style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '1.1rem'
              }}>
                Selecciona un cliente para ver su historial de créditos
              </div>
            ) : loading ? (
              <div className="loading-state" style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '1.1rem'
              }}>
                Cargando créditos...
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e6e8f0',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '1rem 1.5rem',
                  backgroundColor: '#1e2753',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2px solid #e6e8f0'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                    Créditos de {clienteSeleccionado.nombre}
                  </h3>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                    {creditos.length} crédito{creditos.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ 
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto'
                }}>
                  <table className="table" style={{ margin: 0, width: '100%' }}>
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      backgroundColor: '#1e2753',
                      zIndex: 2
                    }}>
                      <tr>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Orden</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Fecha</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Obra</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Total Crédito</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Total Abonado</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Saldo Pendiente</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0', color: '#fff' }}>Retención</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', color: '#fff' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditos.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ 
                            padding: '3rem', 
                            textAlign: 'center', 
                            color: '#666',
                            fontSize: '1rem'
                          }}>
                            No hay créditos registrados para este cliente
                          </td>
                        </tr>
                      ) : (
                        creditos.map((credito) => (
                          <tr 
                            key={credito.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                              #{credito.orden?.numero || '-'}
                            </td>
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0' }}>
                              {fmtFecha(credito.orden?.fecha)}
                            </td>
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e0e0e0' }}>
                              {credito.orden?.obra || '-'}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', fontWeight: '600' }}>
                              {fmtCOP(credito.totalCredito || 0)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: '#28a745', fontWeight: '500' }}>
                              {fmtCOP(credito.totalAbonado || 0)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', borderRight: '1px solid #e0e0e0', color: credito.saldoPendiente > 0 ? '#dc3545' : '#28a745', fontWeight: '600' }}>
                              {fmtCOP(credito.saldoPendiente || 0)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                              {credito.orden?.retencionFuente && credito.orden?.retencionFuente > 0 ? (
                                <span style={{ 
                                  fontSize: '0.85rem', 
                                  color: '#856404',
                                  backgroundColor: '#fff3cd',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  fontWeight: '500'
                                }}>
                                  {fmtCOP(credito.orden.retencionFuente)}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontSize: '0.9rem' }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                backgroundColor: credito.estado === 'CERRADO' ? '#d4edda' : credito.estado === 'ANULADO' ? '#f8d7da' : '#fff3cd',
                                color: credito.estado === 'CERRADO' ? '#155724' : credito.estado === 'ANULADO' ? '#721c24' : '#856404'
                              }}>
                                {credito.estado || 'ABIERTO'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {creditos.length > 0 && (
                      <tfoot style={{ 
                        backgroundColor: '#f8f9fa', 
                        fontWeight: 'bold', 
                        position: 'sticky', 
                        bottom: 0, 
                        zIndex: 3 
                      }}>
                        <tr>
                          <td colSpan="3" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            TOTALES:
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            {fmtCOP(creditos.reduce((sum, c) => sum + (c.totalCredito || 0), 0))}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#28a745' }}>
                            {fmtCOP(creditos.reduce((sum, c) => sum + (c.totalAbonado || 0), 0))}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#dc3545' }}>
                            {fmtCOP(creditos.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0))}
                          </td>
                          <td colSpan="2" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            {creditos.length} crédito{creditos.length !== 1 ? 's' : ''}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>
          )}
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
              <button 
                className="close-btn" 
                onClick={() => {
                  setClienteSearchModal("");
                  setShowClienteModal(false);
                }}
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

