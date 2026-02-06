import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CreditosTable from "../componets/CreditosTable";
import { api } from "../lib/api.js";
import { listarClientes, crearCliente } from "../services/ClientesService.js";
import ClienteModal from "../modals/ClienteModal.jsx";
import HistoricoAbonosClienteModal from "../modals/HistoricoAbonosClienteModal.jsx";
import HistoricoAbonosGeneralModal from "../modals/HistoricoAbonosGeneralModal.jsx";
import addIcon from "../assets/add.png";
import "../styles/Creditos.css";

const CreditosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [creditos, setCreditos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState("");
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showClienteCreateModal, setShowClienteCreateModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [isHistoricoClienteModalOpen, setIsHistoricoClienteModalOpen] = useState(false);
  const [isHistoricoGeneralModalOpen, setIsHistoricoGeneralModalOpen] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const loadData = async (page = 1, size = 50) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Construir parámetros para el backend (usar filtros del backend en lugar de filtrar en frontend)
      const params = {
        page: page,
        size: size
      };
      if (filtroCliente) {
        params.clienteId = Number(filtroCliente);
      }
      if (filtroEstado) {
        params.estado = filtroEstado;
      }
      
      // Cargar créditos y clientes usando la instancia api centralizada
      const [creditosResponse, clientesData] = await Promise.all([
        api.get("/creditos", { params }),
        listarClientes()
      ]);
      
      // Manejar respuesta paginada o array directo
      if (creditosResponse.data && typeof creditosResponse.data === 'object' && 'content' in creditosResponse.data) {
        // Respuesta paginada
        setCreditos(Array.isArray(creditosResponse.data.content) ? creditosResponse.data.content : []);
        setTotalElements(creditosResponse.data.totalElements || 0);
        setTotalPages(creditosResponse.data.totalPages || 1);
        setCurrentPage(creditosResponse.data.page || page);
      } else {
        // Respuesta sin paginación (fallback)
      let creditosData = [];
      if (creditosResponse.data) {
        if (Array.isArray(creditosResponse.data)) {
          creditosData = creditosResponse.data;
          }
        }
        setCreditos(creditosData);
        setTotalElements(creditosData.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
      
      setClientes(clientesData);
    } catch (err) {
      // Error loading data
      setError(`Error cargando datos: ${err.message}`);
      setCreditos([]);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    // Si viene con parámetro reload=true, limpiar la URL primero
    const searchParams = new URLSearchParams(location.search);
    const shouldReload = searchParams.get('reload') === 'true';
    
    if (shouldReload) {
      // Limpiar el parámetro de la URL
      navigate('/creditos', { replace: true });
    }
    
    // Cargar datos iniciales
    loadData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, filtroCliente, filtroEstado]); // Solo recargar si cambian estos valores

  // Recargar cuando cambie la página o el tamaño
  useEffect(() => {
    if (currentPage > 0 && pageSize > 0) {
      loadData(currentPage, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  // Handler para cambios de página desde CreditosTable
  const handlePageChange = (newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setRowsPerPage(newSize);
      setCurrentPage(1);
      loadData(1, newSize); // Resetear a página 1 si cambia el tamaño
    } else {
      setCurrentPage(newPage);
      loadData(newPage, newSize);
    }
  };

  // Función para navegar a la página de abono
  const handleAbrirAbonoPage = (credito) => {
    if (credito?.cliente?.id) {
      navigate(`/abono?clienteId=${credito.cliente.id}&creditoId=${credito.id}`);
    } else {
      navigate('/abono');
    }
  };

  // Función para recargar los créditos después de crear un abono
  const loadCreditoDetalles = async () => {
    setIsReloading(true);
    
    try {
      // Usar los mismos filtros que se están aplicando
      const params = {
        page: currentPage,
        size: pageSize
      };
      if (filtroCliente) {
        params.clienteId = Number(filtroCliente);
      }
      if (filtroEstado) {
        params.estado = filtroEstado;
      }
      
      const response = await api.get("/creditos", { params });
      
      // Manejar respuesta paginada o array directo
      if (response.data && typeof response.data === 'object' && 'content' in response.data) {
        // Respuesta paginada
        setCreditos(Array.isArray(response.data.content) ? response.data.content : []);
        setTotalElements(response.data.totalElements || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.page || currentPage);
      } else {
        // Respuesta sin paginación (fallback)
      let data = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          data = response.data;
          }
        }
        setCreditos(data);
        setTotalElements(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
      
    } catch (err) {
      // Error recargando créditos
      setError(`Error al recargar: ${err.message}`);
      // Mantener estado actual en lugar de array vacío
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="creditos-container">

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => window.location.reload()}>Recargar página</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-message">Cargando datos...</div>
      ) : (
        <>
          {isReloading && (
            <div className="reloading-indicator">
              🔄 Actualizando créditos después de crear abono...
            </div>
          )}
          
          <div className="filtros-creditos">
        <button 
          onClick={() => navigate('/abono')}
          className="btn-agregar-abono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.625rem 1rem',
            background: 'var(--color-dark-blue)',
            color: 'white',
            fontWeight: '500',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--color-light-blue)'}
          onMouseLeave={(e) => e.target.style.background = 'var(--color-dark-blue)'}
        >
          <img 
            src={addIcon} 
            alt="Agregar" 
            style={{ 
              width: '16px', 
              height: '16px',
              filter: 'brightness(0) invert(1)'
            }} 
          />
          Agregar Abono
        </button>

        <button
          onClick={() => setIsHistoricoClienteModalOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            background: '#fff',
            color: '#1e2753',
            border: '2px solid #1e2753',
            borderRadius: '9999px',
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
        >
          Histórico por Cliente
        </button>

        <button
          onClick={() => setIsHistoricoGeneralModalOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            background: '#fff',
            color: '#1e2753',
            border: '2px solid #1e2753',
            borderRadius: '9999px',
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
        >
          Histórico General
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            className="clientes-input ordenes-estado-filter"
            value={clienteSeleccionado?.nombre || ""}
            readOnly
            onClick={() => setShowClienteModal(true)}
            placeholder="Filtrar por cliente..."
            style={{
              cursor: 'pointer',
              minWidth: '250px'
            }}
          />
          {clienteSeleccionado && (
            <button
              type="button"
              onClick={() => {
                setFiltroCliente(null);
                setClienteSeleccionado(null);
              }}
              style={{
                padding: '0.5rem',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
              title="Limpiar filtro de cliente"
            >
              ✕
            </button>
          )}
          {!clienteSeleccionado && (
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
          )}
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
              <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Seleccionar Cliente</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClienteModal(false);
                      setShowClienteCreateModal(true);
                    }}
                    className="btn-save"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Agregar Cliente
                  </button>
                  <button className="close-btn" onClick={() => {
                    setClienteSearchModal("");
                    setShowClienteModal(false);
                  }}>
                    ✕
                  </button>
                </div>
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
                    // Si "VARIOS" está en alguno, siempre va primero
                    if (nombreA === "varios") return -1;
                    if (nombreB === "varios") return 1;
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
                            <th style={{ width: '35%' }}>Nombre</th>
                            <th style={{ width: '15%' }}>NIT</th>
                            <th style={{ width: '20%' }}>Correo</th>
                            <th style={{ width: '10%' }}>Ciudad</th>
                            <th style={{ width: '20%', textAlign: 'center' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((c) => {
                            const handleSelect = () => {
                              setClienteSeleccionado(c);
                              setFiltroCliente(c.id);
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
                                <td title={c.ciudad || '-'}>
                                  {c.ciudad || '-'}
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
                                      fontSize: '0.9rem'
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

        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ABIERTO">Abierto</option>
          <option value="CERRADO">Cerrado</option>
          <option value="VENCIDO">Vencido</option>
          <option value="ANULADO">Anulado</option>
        </select>

        <div className="rows-per-page" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-white)' }}>Filas:</span>
          <select
            className="clientes-select"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              handlePageChange(1, newSize);
            }}
            style={{
              padding: '0.4rem 0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: '#fff',
              outline: 'none',
              width: '70px'
            }}
          >
            {[5, 10, 20, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
          </div>

          <CreditosTable 
            creditos={creditos} 
            clientes={clientes}
            filtroCliente={filtroCliente}
            onAbrirAbonoModal={handleAbrirAbonoPage}
            rowsPerPage={pageSize}
            // Paginación del servidor
            totalElements={totalElements}
            totalPages={totalPages}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            serverSidePagination={true}
          />
        </>
      )}

      {/* Modales de Histórico */}
      <HistoricoAbonosClienteModal
        isOpen={isHistoricoClienteModalOpen}
        onClose={() => setIsHistoricoClienteModalOpen(false)}
      />
      
      <HistoricoAbonosGeneralModal
        isOpen={isHistoricoGeneralModalOpen}
        onClose={() => setIsHistoricoGeneralModalOpen(false)}
      />

      {/* Modal de crear cliente */}
      <ClienteModal
        isOpen={showClienteCreateModal}
        onClose={() => setShowClienteCreateModal(false)}
        onSave={async (clienteData, isEdit) => {
          try {
            const nuevoCliente = await crearCliente(clienteData);
            // Actualizar la lista de clientes
            const clientesActualizados = await listarClientes();
            setClientes(clientesActualizados);
            // Seleccionar automáticamente el cliente recién creado
            setClienteSeleccionado(nuevoCliente);
            setFiltroCliente(nuevoCliente.id);
            setShowClienteCreateModal(false);
            // Mostrar mensaje de éxito (si tienes toast)
            alert("Cliente creado y seleccionado exitosamente");
          } catch (error) {
            alert(error?.response?.data?.message || "No se pudo crear el cliente");
            throw error; // Re-lanzar para que el modal no se cierre
          }
        }}
        clientesExistentes={clientes}
      />
    </div>
  );
};

export default CreditosPage;
