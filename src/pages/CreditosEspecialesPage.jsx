import { useEffect, useState, useMemo } from "react";
import Toast from "../componets/Toast";
import { useNavigate } from "react-router-dom";
import CreditosTable from "../componets/CreditosTable";
import EntregasEspecialesTable from "../componets/EntregasEspecialesTable";
import { marcarCreditosEspecialPagados, obtenerEntregasEspeciales } from "../services/EstadoCuentaService";
import { listarCreditosClienteEspecial, obtenerOrdenesMesCierreEspecial } from "../services/CreditosService";
import { listarClientes } from "../services/ClientesService";
import { listarSedes } from "../services/SedesService.js";
import HistoricoAbonosClienteModal from "../modals/HistoricoAbonosClienteModal.jsx";
import HistoricoAbonosGeneralModal from "../modals/HistoricoAbonosGeneralModal.jsx";
import MarcarPagadosModal from "../modals/MarcarPagadosModal.jsx";
import DetalleEntregaEspecialModal from "../modals/DetalleEntregaEspecialModal.jsx";
import OrdenDetalleModal from "../modals/OrdenDetalleModal.jsx";
import estado from "../assets/estado.png";
import "../styles/Creditos.css";

const CreditosEspecialesPage = () => {
  const navigate = useNavigate();
  
  // Estado para tabs
  const [view, setView] = useState("creditos"); // "creditos" | "entregas"
  
  // Estados para créditos
  const [creditos, setCreditos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [sedes, setSedes] = useState([]);
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
  const [isMarcarPagadosModalOpen, setIsMarcarPagadosModalOpen] = useState(false);
  
  // Estados para entregas especiales
  const [entregas, setEntregas] = useState([]);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [isDetalleEntregaOpen, setIsDetalleEntregaOpen] = useState(false);
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null);
  const [isOrdenDetalleOpen, setIsOrdenDetalleOpen] = useState(false);
  const [ordenDetalleId, setOrdenDetalleId] = useState(null);

  // Estados para cierre mensual
  const [cierreMesYear, setCierreMesYear] = useState(new Date().getFullYear());
  const [cierreMesMonth, setCierreMesMonth] = useState(new Date().getMonth() + 1);
  const [cierreMesSedeId, setCierreMesSedeId] = useState("");
  const [cierreMesOrdenes, setCierreMesOrdenes] = useState([]);
  const [cierreMesDatos, setCierreMesDatos] = useState(null);
  const [loadingCierreMes, setLoadingCierreMes] = useState(false);
  const [cierreMesPage, setCierreMesPage] = useState(1);
  const [cierreMesPageSize, setCierreMesPageSize] = useState(10);

  // Calcular total de créditos seleccionados
  const totalSeleccionado = creditos
    .filter(c => creditosSeleccionados.includes(c.id))
    .reduce((sum, c) => sum + (c.totalCredito || 0), 0);

  const handleSeleccionarCredito = (creditoId) => {
    setCreditosSeleccionados((prev) =>
      prev.includes(creditoId)
        ? prev.filter((id) => id !== creditoId)
        : [...prev, creditoId]
    );
  };

  const handleMarcarPagados = async (ejecutadoPor, observaciones) => {
    if (creditosSeleccionados.length === 0) return;
    setIsReloading(true);
    try {
      const res = await marcarCreditosEspecialPagados(creditosSeleccionados, ejecutadoPor, observaciones);
      
      // Mensaje mejorado con info de la entrega creada
      const mensaje = `✔ ${res.creditosPagados} crédito(s) marcados como pagados. Entrega especial #${res.entregaEspecialId} creada exitosamente.`;
      
      setToast({
        isVisible: true,
        message: mensaje,
        type: 'success'
      });
      setCreditosSeleccionados([]);
      
      // Recargar tanto créditos como entregas
      await loadData(currentPage, pageSize);
      cargarEntregas(); // Actualizar historial sin await para no bloquear
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

  // Cargar entregas especiales
  const cargarEntregas = async () => {
    setLoadingEntregas(true);
    setError(""); // Limpiar errores previos
    try {
      const data = await obtenerEntregasEspeciales();
      setEntregas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar entregas:', err);
      const errorMessage = err.message || "Error al cargar historial de entregas";
      setError(errorMessage);
      setToast({
        isVisible: true,
        message: `${errorMessage}. Verifica que el backend esté funcionando correctamente.`,
        type: 'error'
      });
      setEntregas([]); // Asegurar que se muestra lista vacía en caso de error
    } finally {
      setLoadingEntregas(false);
    }
  };

  // Cargar cierre mensual de créditos especiales
  const cargarCierreMes = async () => {
    if (!Number.isFinite(cierreMesYear) || !Number.isFinite(cierreMesMonth) || cierreMesMonth < 1 || cierreMesMonth > 12) {
      setError("Seleccione año y mes válidos.");
      return;
    }
    setLoadingCierreMes(true);
    setError("");
    setCierreMesPage(1); // Reset página al consultar
    try {
      const sedeId = cierreMesSedeId && Number.isFinite(Number(cierreMesSedeId)) ? Number(cierreMesSedeId) : null;
      const data = await obtenerOrdenesMesCierreEspecial(cierreMesYear, cierreMesMonth, sedeId);
      setCierreMesDatos(data);
      setCierreMesOrdenes(Array.isArray(data?.ordenes) ? data.ordenes : []);
    } catch (err) {
      console.error('Error al cargar cierre del mes:', err);
      const errorMessage = err.message || "Error al cargar cierre del mes";
      setError(errorMessage);
      setToast({
        isVisible: true,
        message: errorMessage,
        type: 'error'
      });
      setCierreMesDatos(null);
      setCierreMesOrdenes([]);
    } finally {
      setLoadingCierreMes(false);
    }
  };

  // Calcular órdenes paginadas
  const cierreMesPaginacion = useMemo(() => {
    const total = cierreMesOrdenes.length;
    const maxPage = Math.max(1, Math.ceil(total / cierreMesPageSize) || 1);
    const currentPageClamped = Math.min(cierreMesPage, maxPage);
    const start = (currentPageClamped - 1) * cierreMesPageSize;
    return {
      pageData: cierreMesOrdenes.slice(start, start + cierreMesPageSize),
      total,
      maxPage,
      currentPage: currentPageClamped
    };
  }, [cierreMesOrdenes, cierreMesPage, cierreMesPageSize]);

  const handleVerDetalleEntrega = (entrega) => {
    setEntregaSeleccionada(entrega);
    setIsDetalleEntregaOpen(true);
  };

  const handleVerOrdenCredito = (credito) => {
    const idOrden = credito?.orden?.id;
    if (!idOrden) {
      setToast({
        isVisible: true,
        message: "Este crédito no tiene una orden asociada para mostrar detalle.",
        type: "warning"
      });
      return;
    }
    setOrdenDetalleId(idOrden);
    setIsOrdenDetalleOpen(true);
  };

  useEffect(() => {
    if (view === "creditos") {
      loadData(1, pageSize);
    } else {
      cargarEntregas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filtroEstado, pageSize]);

  // Cargar sedes al montar el componente
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const s = await listarSedes();
        if (cancel) return;
        const sedesLista = Array.isArray(s) ? s : [];
        setSedes(sedesLista);
      } catch (e) {
        if (!cancel) {
          console.error('Error al cargar sedes:', e);
          setToast({
            isVisible: true,
            message: `Error al cargar sedes: ${e.message}`,
            type: 'error'
          });
        }
      }
    })();
    return () => { cancel = true; };
  }, []);

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

          {/* Sistema de Tabs */}
          <div className="creditos-tabs">
            <button
              className={`tab ${view === "creditos" ? "active" : ""}`}
              onClick={() => setView("creditos")}
            >
              Créditos Especiales
            </button>
            <button
              className={`tab ${view === "entregas" ? "active" : ""}`}
              onClick={() => setView("entregas")}
            >
              Historial de Entregas
            </button>
            <button
              className={`tab ${view === "cierre-mensual" ? "active" : ""}`}
              onClick={() => setView("cierre-mensual")}
            >
              Cierre Mensual
            </button>
          </div>

          {/* Contenido según la vista */}
          {view === "creditos" ? (
            <>
              <div className="filtros-creditos">
                <button
              onClick={() => window.location.href = '/web/abono'}
              className="btn-agregar-abono"
            >
              Agregar Abono
            </button>

            <button
              onClick={() => navigate('/estado-cuenta', { state: { esClienteEspecial: true } })}
              className="btn-estado"
            >
              <img src={estado} alt="Estado de Cuenta" style={{ width: '14px', height: '14px', filter: 'brightness(0) invert(1)' }} />
              Estado de Cuenta
            </button>

            <button
              onClick={() => setIsHistoricoClienteModalOpen(true)}
              className="btn-historio"
            >
              Histórico por Cliente
            </button>

            <button
              onClick={() => setIsHistoricoGeneralModalOpen(true)}
              className="btn-historio"
            >
              Histórico General
            </button>

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="ABIERTO">Abierto</option>
              <option value="CERRADO">Cerrado</option>
              <option value="VENCIDO">Vencido</option>
              <option value="ANULADO">Anulado</option>
            </select>

            <div className="rows-per-page">
              <span>Filas:</span>
              <select
                className="clientes-select"
                value={pageSize}
                onChange={e => {
                  const newSize = Number(e.target.value);
                  handlePageChange(1, newSize);
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
            onVerOrden={handleVerOrdenCredito}
            creditosSeleccionados={creditosSeleccionados}
            modoEspecial={true}
            rowsPerPage={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            serverSidePagination={true}
            totalSeleccionado={totalSeleccionado}
          />
          <button
            disabled={creditosSeleccionados.length === 0 || isReloading}
            onClick={() => setIsMarcarPagadosModalOpen(true)}
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
          ) : view === "entregas" ? (
            /* Vista de Historial de Entregas */
            <EntregasEspecialesTable
              entregas={entregas}
              loading={loadingEntregas}
              onVerDetalle={handleVerDetalleEntrega}
            />
          ) : view === "cierre-mensual" ? (
            <>
              <div className="cierre-mes-filtros">
                <div className="cierre-mes-grupo">
                  <label>Año:</label>
                  <select
                    value={cierreMesYear}
                    onChange={(e) => setCierreMesYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 75 }, (_, i) => {
                      const year = 2026 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="cierre-mes-grupo">
                  <label>Mes:</label>
                  <select
                    value={cierreMesMonth}
                    onChange={(e) => setCierreMesMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1;
                      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                      return (
                        <option key={m} value={m}>
                          {months[i]}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="cierre-mes-grupo">
                  <label>Sede (opcional):</label>
                  <select
                    value={cierreMesSedeId}
                    onChange={(e) => setCierreMesSedeId(e.target.value)}
                  >
                    <option value="">Todas las sedes</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre || `#${s.id}`}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={cargarCierreMes}
                  disabled={loadingCierreMes}
                  className="btn-consultar"
                >
                  {loadingCierreMes ? 'Cargando...' : 'Consultar'}
                </button>
              </div>

              {loadingCierreMes && (
                <div className="loading-message">Cargando datos del cierre mensual...</div>
              )}

              {cierreMesDatos && !loadingCierreMes && (
                <div className="cierre-mes-resumen">
                  <div className="resumen-grid">
                    <div className="resumen-item">
                      <p className="resumen-label">Total Ventas (Órdenes)</p>
                      <p className="resumen-valor">
                        ${(cierreMesDatos.totalVenta || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="resumen-item">
                      <p className="resumen-label">Total Pagos</p>
                      <p className="resumen-valor success">
                        ${(cierreMesDatos.totalPagos || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="resumen-item">
                      <p className="resumen-label">Saldo Pendiente</p>
                      <p className="resumen-valor error">
                        ${(cierreMesDatos.totalSaldoPendiente || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!loadingCierreMes && cierreMesDatos && (
                <div className="cierre-mes-tabla-wrapper">
                  <div className="cierre-mes-tabla">
                    <table>
                      <thead>
                        <tr>
                          <th>Orden #</th>
                          <th>Fecha Orden</th>
                          <th>Obra</th>
                          <th>Total Orden</th>
                          <th>Total Crédito</th>
                          <th>Total Abonado</th>
                          <th>Saldo Pendiente</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cierreMesPaginacion.pageData.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="sin-datos">
                              No hay órdenes para este período.
                            </td>
                          </tr>
                        ) : (
                          cierreMesPaginacion.pageData.map((orden, idx) => (
                            <tr key={idx}>
                              <td>#{orden.numeroOrden}</td>
                              <td>{orden.fechaOrden}</td>
                              <td>{orden.obra}</td>
                              <td>
                                ${(orden.totalOrden || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                              </td>
                              <td>
                                ${(orden.totalCredito || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                              </td>
                              <td>
                                ${(orden.totalAbonado || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                              </td>
                              <td className={`saldo-pendiente ${orden.saldoPendiente > 0 ? 'positivo' : 'cero'}`}>
                                ${(orden.saldoPendiente || 0).toLocaleString('es-CO', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                              </td>
                              <td>
                                <button
                                  onClick={() => {
                                    setOrdenDetalleId(orden.ordenId);
                                    setIsOrdenDetalleOpen(true);
                                  }}
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {cierreMesPaginacion.total > 0 && (
                    <div className="cierre-mes-paginacion">
                      <div className="paginacion-info">
                        Mostrando {Math.min((cierreMesPaginacion.currentPage - 1) * cierreMesPageSize + 1, cierreMesPaginacion.total)}–{Math.min(cierreMesPaginacion.currentPage * cierreMesPageSize, cierreMesPaginacion.total)} de {cierreMesPaginacion.total}
                      </div>

                      <div className="paginacion-botones">
                        <button
                          onClick={() => setCierreMesPage(1)}
                          disabled={cierreMesPaginacion.currentPage <= 1}
                        >
                          «
                        </button>
                        <button
                          onClick={() => setCierreMesPage((p) => p - 1)}
                          disabled={cierreMesPaginacion.currentPage <= 1}
                        >
                          ‹
                        </button>
                        <span style={{ padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: '500', minWidth: '60px', textAlign: 'center' }}>
                          {cierreMesPaginacion.currentPage} / {cierreMesPaginacion.maxPage}
                        </span>
                        <button
                          onClick={() => setCierreMesPage((p) => p + 1)}
                          disabled={cierreMesPaginacion.currentPage >= cierreMesPaginacion.maxPage}
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCierreMesPage(cierreMesPaginacion.maxPage)}
                          disabled={cierreMesPaginacion.currentPage >= cierreMesPaginacion.maxPage}
                        >
                          »
                        </button>

                        <select
                          value={cierreMesPageSize}
                          onChange={(e) => {
                            setCierreMesPageSize(Number(e.target.value));
                            setCierreMesPage(1);
                          }}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} filas</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!loadingCierreMes && !cierreMesDatos && (
                <div className="sin-datos">
                  Selecciona un mes y año para ver el cierre mensual.
                </div>
              )}
            </>
          ) : null}
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
      <MarcarPagadosModal
        isOpen={isMarcarPagadosModalOpen}
        onClose={() => setIsMarcarPagadosModalOpen(false)}
        onConfirm={handleMarcarPagados}
        cantidadCreditos={creditosSeleccionados.length}
        totalMonto={totalSeleccionado}
      />
      <DetalleEntregaEspecialModal
        isOpen={isDetalleEntregaOpen}
        onClose={() => {
          setIsDetalleEntregaOpen(false);
          setEntregaSeleccionada(null);
        }}
        entregaId={entregaSeleccionada?.id}
      />
      <OrdenDetalleModal
        ordenId={ordenDetalleId}
        isOpen={isOrdenDetalleOpen}
        onClose={() => {
          setIsOrdenDetalleOpen(false);
          setOrdenDetalleId(null);
        }}
      />
    </div>
  );
};

export default CreditosEspecialesPage;
