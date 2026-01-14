
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fetchEstadoCuenta, fetchEstadoCuentaEspecial } from "../services/EstadoCuentaService";
import { listarClientes } from "../services/ClientesService";
import OrdenDetalleModal from "../modals/OrdenDetalleModal.jsx";
import "../styles/Creditos.css";
import "../styles/EstadoCuentaPage.css";

const EstadoCuentaPage = () => {
  const location = useLocation();
  const isEspecial = location.state?.esClienteEspecial || false;
  
  const [clienteId, setClienteId] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  // const [sedeId, setSedeId] = useState("");
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState([]);
  const [ordenDetalleModalOpen, setOrdenDetalleModalOpen] = useState(false);
  const [ordenIdSeleccionada, setOrdenIdSeleccionada] = useState(null);
  const [abonosDetalleModalOpen, setAbonosDetalleModalOpen] = useState(false);
  const [abonosSeleccionados, setAbonosSeleccionados] = useState([]);

  // Cargar clientes solo si NO es modo especial
  useEffect(() => {
    if (!isEspecial) {
      listarClientes().then(setClientes).catch(() => setClientes([]));
    }
  }, [isEspecial]);

  // Si es modo especial, cargar automáticamente el estado de cuenta
  useEffect(() => {
    if (isEspecial) {
      setClienteSeleccionado({ nombre: "JAIRO VELANDIA (Cliente Especial)" });
      setLoading(true);
      setError("");
      setEstadoCuenta(null);
      fetchEstadoCuentaEspecial()
        .then(data => setEstadoCuenta(data))
        .catch(() => setError("No se pudo obtener el estado de cuenta del cliente especial"))
        .finally(() => setLoading(false));
    }
  }, [isEspecial]);

  // Ejecutar consulta automáticamente al seleccionar cliente (solo para modo normal)
  useEffect(() => {
    if (clienteId && !isEspecial) {
      setLoading(true);
      setError("");
      setEstadoCuenta(null);
      fetchEstadoCuenta(clienteId)
        .then(data => setEstadoCuenta(data))
        .catch(() => setError("No se pudo obtener el estado de cuenta"))
        .finally(() => setLoading(false));
    }
  }, [clienteId, isEspecial]);

  const handleImprimir = () => {
    // Crear ventana de impresión con el contenido
    const creditosData = estadoCuenta?.creditos || [];
    const resumenData = estadoCuenta?.resumen;
    
    const ventana = window.open('', '', 'width=800,height=600');
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Estado de Cuenta - ${clienteSeleccionado?.nombre || 'Cliente'}</title>
          <style>
            @page {
              margin: 15mm;
              size: letter;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: Arial, sans-serif; 
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 10pt;
              color: #000;
            }
            
            h1 {
              text-align: center;
              color: #000;
              margin-bottom: 15px;
              font-size: 18pt;
              font-weight: bold;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
            }
            
            .cliente-info {
              margin-bottom: 15px;
              padding: 8px;
              border: 1px solid #000;
              font-size: 11pt;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
              page-break-inside: auto;
            }
            
            thead {
              display: table-header-group;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            th, td { 
              border: 1px solid #000; 
              padding: 6px 4px; 
              text-align: left;
              font-size: 9pt;
            }
            
            th { 
              background-color: #fff;
              color: #000;
              font-weight: bold;
              border: 2px solid #000;
            }
            
            .resumen {
              margin-top: 15px;
              padding: 10px;
              border: 2px solid #000;
              page-break-inside: avoid;
            }
            
            .resumen-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #ccc;
            }
            
            .resumen-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 11pt;
              border-top: 2px solid #000;
              padding-top: 8px;
              margin-top: 5px;
            }
            
            .resumen-label {
              font-weight: bold;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            @media print {
              body { 
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <h1>${isEspecial ? "Estado de Cuenta - Cliente Especial" : "Estado de Cuenta"}</h1>
          
          ${clienteSeleccionado ? `
            <div class="cliente-info">
              <strong>Cliente:</strong> ${clienteSeleccionado.nombre}
            </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">Fecha inicio</th>
                <th style="width: 20%;">Obra</th>
                <th style="width: 15%;" class="text-right">Total crédito</th>
                <th style="width: 15%;" class="text-right">Total abonado</th>
                <th style="width: 15%;" class="text-right">Saldo pendiente</th>
                <th style="width: 10%;" class="text-center">Estado</th>
                <th style="width: 13%;">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${creditosData.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center">No hay créditos activos con saldo pendiente para este cliente.</td>
                </tr>
              ` : creditosData.map(credito => `
                <tr>
                  <td class="text-center">${credito.fechaInicio || '-'}</td>
                  <td>${credito.orden?.obra || '-'}</td>
                  <td class="text-right">$${(credito.totalCredito || 0).toLocaleString()}</td>
                  <td class="text-right">$${(credito.totalAbonado || 0).toLocaleString()}</td>
                  <td class="text-right font-bold">$${(credito.saldoPendiente || 0).toLocaleString()}</td>
                  <td class="text-center">${credito.estado || '-'}</td>
                  <td>${credito.observaciones || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${resumenData ? `
            <div class="resumen">
              <div class="resumen-row">
                <span class="resumen-label">Créditos activos:</span>
                <span>${resumenData.cantidadCreditos || 0}</span>
              </div>
              <div class="resumen-row">
                <span class="resumen-label">Total crédito:</span>
                <span>$${(resumenData.totalCreditos || 0).toLocaleString()}</span>
              </div>
              <div class="resumen-row">
                <span class="resumen-label">Total abonado:</span>
                <span>$${(resumenData.totalAbonado || 0).toLocaleString()}</span>
              </div>
              <div class="resumen-row">
                <span class="resumen-label">DEUDA PENDIENTE:</span>
                <span>$${(resumenData.totalDeuda || 0).toLocaleString()}</span>
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 250);
  };

  // handleBuscar eliminado, consulta automática con useEffect

  return (
    <div className="estado-cuenta-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="estado-cuenta-title" style={{ margin: 0 }}>
          {isEspecial ? "Estado de Cuenta - Cliente Especial" : "Estado de Cuenta de Cliente"}
        </h2>
        {((clienteSeleccionado && estadoCuenta) || (isEspecial && estadoCuenta)) && (
          <button
            onClick={handleImprimir}
            className="btn-save btn-imprimir"
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#27ae60',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => e.target.style.background = '#229954'}
            onMouseLeave={e => e.target.style.background = '#27ae60'}
          >
            Imprimir
          </button>
        )}
      </div>
      {!isEspecial && (
      <div className="estado-cuenta-filtros">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontWeight: 600, color: '#fff', marginRight: 8 }}>Cliente:</label>
          <input
            type="text"
            className="clientes-input"
            value={clienteSeleccionado ? clienteSeleccionado.nombre : ""}
            readOnly
            onClick={() => setShowClienteModal(true)}
            placeholder="Haz clic para buscar cliente por nombre o NIT..."
          />
        </div>
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
                            <th style={{ width: '30%' }}>Nombre</th>
                            <th style={{ width: '15%' }}>NIT</th>
                            <th style={{ width: '30%' }}>Correo</th>
                            <th style={{ width: '25%', textAlign: 'center' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((c) => {
                            const handleSelect = () => {
                              setClienteSeleccionado(c);
                              setClienteId(c.id);
                              setClienteSearchModal("");
                              setShowClienteModal(false);
                            };
                            return (
                              <tr
                                key={c.id}
                                style={{
                                  transition: 'background-color 0.2s',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={handleSelect}
                                onDoubleClick={handleSelect}
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
                                <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelect();
                                    }}
                                    className="btn-save"
                                    style={{
                                      padding: '0.5rem 1rem',
                                      fontSize: '0.9rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    Seleccionar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      <div id="printable-estado-cuenta">
        <h1 style={{ display: 'none' }}>{isEspecial ? "Estado de Cuenta - Cliente Especial" : "Estado de Cuenta"}</h1>
        {clienteSeleccionado && (
          <div className="cliente-info" style={{ display: 'none' }}>
            <strong>Cliente:</strong> {clienteSeleccionado.nombre}
          </div>
        )}
        <div className="estado-cuenta-table-wrapper">
          {error && <div className="estado-cuenta-error">{error}</div>}
          <TablaCreditosEstadoCuenta 
          creditos={estadoCuenta?.creditos || []} 
          loading={loading}
          onVerOrden={(ordenId) => {
            setOrdenIdSeleccionada(ordenId);
            setOrdenDetalleModalOpen(true);
          }}
          onVerAbonos={(abonos) => {
            setAbonosSeleccionados(abonos);
            setAbonosDetalleModalOpen(true);
          }}
        />
        {/* <ResumenEstadoCuenta resumen={estadoCuenta?.resumen} loading={loading} /> */}
        </div>
      </div>

      <OrdenDetalleModal
        ordenId={ordenIdSeleccionada}
        isOpen={ordenDetalleModalOpen}
        onClose={() => {
          setOrdenDetalleModalOpen(false);
          setOrdenIdSeleccionada(null);
        }}
      />

      {abonosDetalleModalOpen && (
        <div className="modal-overlay" onClick={() => setAbonosDetalleModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Detalle de Abonos</h2>
              <button className="close-btn" onClick={() => setAbonosDetalleModalOpen(false)}>✕</button>
            </header>
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {abonosSeleccionados.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No hay abonos registrados</p>
              ) : (
                <table className="table" style={{ fontSize: '0.95rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Monto</th>
                      <th>Método de Pago</th>
                      <th>Factura</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abonosSeleccionados.map((abono) => (
                      <tr key={abono.id}>
                        <td>{abono.fechaAbono}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>${(abono.montoAbono || 0).toLocaleString()}</td>
                        <td>{abono.metodoPago}</td>
                        <td>{abono.numeroFactura || "-"}</td>
                        <td>{abono.observaciones || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function TablaCreditosEstadoCuenta({ creditos, loading, onVerOrden, onVerAbonos }) {
  // Calcular totales
  const totalCredito = creditos.reduce((sum, c) => sum + (c.totalCredito || 0), 0);
  const totalAbonado = creditos.reduce((sum, c) => sum + (c.totalAbonado || 0), 0);
  const totalSaldo = creditos.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}>
      <table className="table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "#fff", borderRadius: 12, boxShadow: '0 2px 8px #e6e8f0', fontSize: 15 }}>
        <thead>
          <tr style={{ background: '#25316D', color: '#fff' }}>
            <th style={{ borderTopLeftRadius: 12 }}>Fecha inicio</th>
            <th>Obra</th>
            <th>Total crédito</th>
            <th>Total abonado</th>
            <th>Saldo pendiente</th>
            <th>Estado</th>
            <th>Observaciones</th>
            <th>Abonos</th>
            <th style={{ borderTopRightRadius: 12 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#888', fontStyle: 'italic' }}>
                Cargando estado de cuenta...
              </td>
            </tr>
          ) : creditos.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#888', fontStyle: 'italic' }}>
                No hay créditos activos con saldo pendiente para este cliente.
              </td>
            </tr>
          ) : (
            <>
              {creditos.map((credito, idx) => (
                <tr key={credito.id} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={{ textAlign: 'center' }}>{credito.fechaInicio}</td>
                  <td>{credito.orden?.obra || "-"}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>${credito.totalCredito.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#1e2753' }}>${credito.totalAbonado.toLocaleString()}</td>
                  <td style={{ color: '#c0392b', fontWeight: 700, textAlign: 'right' }}>${credito.saldoPendiente.toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>{credito.estado}</td>
                  <td>{credito.observaciones || "-"}</td>
                  <td><AbonosTable abonos={credito.abonos} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {credito.orden?.id && (
                        <button
                          onClick={() => onVerOrden(credito.orden.id)}
                          className="btn-save"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          title="Ver detalles de la orden"
                        >
                          Ver Orden
                        </button>
                      )}
                      {credito.abonos && credito.abonos.length > 0 && (
                        <button
                          onClick={() => onVerAbonos(credito.abonos)}
                          className="btn-save"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#27ae60' }}
                          title="Ver detalles de abonos"
                        >
                          Ver Abonos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Fila de totales */}
              <tr style={{ background: '#e6e8f0', fontWeight: 700 }}>
                <td colSpan={2} style={{ textAlign: 'right' }}>Totales:</td>
                <td style={{ textAlign: 'right' }}>${totalCredito.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>${totalAbonado.toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: '#c0392b' }}>${totalSaldo.toLocaleString()}</td>
                <td colSpan={4}></td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AbonosTable({ abonos }) {
  if (!abonos || abonos.length === 0) return <span style={{ background: '#e6e8f0', color: '#888', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>Sin abonos</span>;
  return (
    <table style={{ fontSize: "0.95em", background: "#f9f9f9", borderRadius: 6, margin: "0 auto", minWidth: 220, boxShadow: '0 1px 4px #e6e8f0' }}>
      <thead>
        <tr style={{ background: '#e6e8f0', color: '#1e2753' }}>
          <th>Fecha</th>
          <th>Monto</th>
          <th>Método</th>
          <th>Factura</th>
        </tr>
      </thead>
      <tbody>
        {abonos.map(a => (
          <tr key={a.id}>
            <td>{a.fechaAbono}</td>
            <td style={{ textAlign: 'right', fontWeight: 500 }}>${(a.montoAbono || 0).toLocaleString()}</td>
            <td>{a.metodoPago}</td>
            <td>{a.numeroFactura || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default EstadoCuentaPage;
