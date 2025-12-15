import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CreditosTable from "../componets/CreditosTable";
import { api } from "../lib/api.js";
import { listarClientes } from "../services/ClientesService.js";
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
  const [filtroCliente, setFiltroCliente] = useState("");
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
      console.error("Error loading data:", err);
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
      console.error(" Error recargando créditos:", err.message);
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

        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((cli) => (
            <option key={cli.id} value={cli.id}>
              {cli.nombre}
            </option>
          ))}
        </select>

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
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              background: '#fff',
              outline: 'none',
              minWidth: '80px'
            }}
          >
            {[5, 10, 20, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
          </div>

          <CreditosTable 
            creditos={creditos} 
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
    </div>
  );
};

export default CreditosPage;
