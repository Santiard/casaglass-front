import { useEffect, useState } from "react";
import Toast from "../componets/Toast";
import { useNavigate } from "react-router-dom";
import CreditosTable from "../componets/CreditosTable";
import { marcarCreditosEspecialPagados } from "../services/EstadoCuentaService";
import { listarCreditosClienteEspecial } from "../services/CreditosService";
import { listarClientes } from "../services/ClientesService";
import HistoricoAbonosClienteModal from "../modals/HistoricoAbonosClienteModal.jsx";
import HistoricoAbonosGeneralModal from "../modals/HistoricoAbonosGeneralModal.jsx";
import estado from "../assets/estado.png";
import "../styles/Creditos.css";

const CreditosEspecialesPage = () => {
  const navigate = useNavigate();
  const [creditos, setCreditos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState("");
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [isHistoricoClienteModalOpen, setIsHistoricoClienteModalOpen] = useState(false);
  const [isHistoricoGeneralModalOpen, setIsHistoricoGeneralModalOpen] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selección de créditos para marcar como pagados
  const [creditosSeleccionados, setCreditosSeleccionados] = useState([]);

  const handleSeleccionarCredito = (creditoId) => {
    setCreditosSeleccionados((prev) =>
      prev.includes(creditoId)
        ? prev.filter((id) => id !== creditoId)
        : [...prev, creditoId]
    );
  };

  const handleMarcarPagados = async () => {
    if (creditosSeleccionados.length === 0) return;
    setIsReloading(true);
    try {
      const res = await marcarCreditosEspecialPagados(creditosSeleccionados);
      setToast({
        isVisible: true,
        message: `✔ ${res.creditosPagados} crédito(s) marcados como pagados. ${res.detalles}`,
        type: 'success'
      });
      setCreditosSeleccionados([]);
      await loadData(currentPage, pageSize);
    } catch (err) {
      setToast({
        isVisible: true,
        message: 'Error: ' + err.message,
        type: 'error'
      });
    } finally {
      setIsReloading(false);
    }
  };

  // Handler for page change (pagination)
  const handlePageChange = (newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setRowsPerPage(newSize);
      setCurrentPage(1);
      loadData(1, newSize);
    } else {
      setCurrentPage(newPage);
      loadData(newPage, newSize);
    }
  };
  const loadData = async (page = 1, size = 50) => {
    setIsLoading(true);
    setError("");
    try {
      const params = { page, size };
      if (filtroEstado) params.estado = filtroEstado;
      const [creditosResponse, clientesData] = await Promise.all([
        listarCreditosClienteEspecial(params),
        listarClientes()
      ]);
      if (creditosResponse && typeof creditosResponse === 'object' && 'content' in creditosResponse) {
        setCreditos(Array.isArray(creditosResponse.content) ? creditosResponse.content : []);
        setTotalElements(creditosResponse.totalElements || 0);
        setTotalPages(creditosResponse.totalPages || 1);
        setCurrentPage(creditosResponse.page || page);
      } else {
        let creditosData = [];
        if (Array.isArray(creditosResponse)) {
          creditosData = creditosResponse;
        }
        setCreditos(creditosData);
        setTotalElements(creditosData.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
      setClientes(clientesData);
    } catch (err) {
      setError(`Error cargando datos: ${err.message}`);
      setCreditos([]);
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, pageSize]);

  return (
    <div className="creditos-container">

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(t => ({ ...t, isVisible: false }))}
        duration={3500}
      />

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
              Actualizando créditos después de crear abono...
            </div>
          )}


          <div className="filtros-creditos" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              onClick={() => window.location.href = '/web/abono'}
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
              onMouseEnter={e => e.target.style.background = 'var(--color-light-blue)'}
              onMouseLeave={e => e.target.style.background = 'var(--color-dark-blue)'}
            >
              Agregar Abono
            </button>

            <button
              onClick={() => navigate('/estado-cuenta', { state: { esClienteEspecial: true } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                background: '#27ae60',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => e.target.style.background = '#229954'}
              onMouseLeave={e => e.target.style.background = '#27ae60'}
            >
              <img src={estado} alt="Estado de Cuenta" style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' }} />
              Estado de Cuenta
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
              onMouseEnter={e => {
                e.target.style.background = '#1e2753';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
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
              onMouseEnter={e => {
                e.target.style.background = '#1e2753';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.target.style.background = '#fff';
                e.target.style.color = '#1e2753';
              }}
            >
              Histórico General
            </button>

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: '0.4rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', background: '#fff', outline: 'none', minWidth: '140px' }}>
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
                onChange={e => {
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
            onSeleccionarCredito={handleSeleccionarCredito}
            creditosSeleccionados={creditosSeleccionados}
            modoEspecial={true}
            rowsPerPage={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            serverSidePagination={true}
          />
          <button
            disabled={creditosSeleccionados.length === 0 || isReloading}
            onClick={handleMarcarPagados}
            style={{
              marginTop: '1.5rem',
              padding: '0.7rem 1.5rem',
              background: '#27ae60',
              color: 'white',
              fontWeight: '600',
              border: 'none',
              borderRadius: '9999px',
              cursor: creditosSeleccionados.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              boxShadow: '0 2px 8px #e6e8f0',
              transition: 'background 0.2s',
              opacity: isReloading ? 0.7 : 1
            }}
          >
            {isReloading ? 'Marcando...' : `Pagar seleccionados (${creditosSeleccionados.length})`}
          </button>
        </>
      )}

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

export default CreditosEspecialesPage;
