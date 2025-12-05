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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isHistoricoClienteModalOpen, setIsHistoricoClienteModalOpen] = useState(false);
  const [isHistoricoGeneralModalOpen, setIsHistoricoGeneralModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Cargar créditos y clientes usando la instancia api centralizada
      const [creditosResponse, clientesData] = await Promise.all([
        api.get("/creditos"),
        listarClientes()
      ]);
      
      const creditosData = creditosResponse.data || [];
      
      
      setCreditos(creditosData);
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

  useEffect(() => {
    // Si viene con parámetro reload=true, limpiar la URL primero
    const searchParams = new URLSearchParams(location.search);
    const shouldReload = searchParams.get('reload') === 'true';
    
    if (shouldReload) {
      // Limpiar el parámetro de la URL
      navigate('/creditos', { replace: true });
    }
    
    // Cargar datos (siempre se carga al montar o cuando cambia location.search)
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const filtrarCreditos = () => {
    return creditos
      .filter((c) => {
        const matchCliente = filtroCliente ? c.cliente?.id === Number(filtroCliente) : true;
        const matchEstado = filtroEstado ? c.estado === filtroEstado : true;

        return matchCliente && matchEstado;
      })
      .sort((a, b) => {
        // Ordenar por ID descendente (mayor ID = más nuevos primero)
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA; // Descendente: mayor ID primero
      });
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
      const response = await api.get("/creditos");
      const data = response.data || [];
      
      setCreditos(data);
      
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
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
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
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
          </div>

          <CreditosTable 
            creditos={filtrarCreditos()} 
            onAbrirAbonoModal={handleAbrirAbonoPage}
            rowsPerPage={rowsPerPage}
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
