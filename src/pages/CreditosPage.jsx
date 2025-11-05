import { useEffect, useState } from "react";
import CreditosTable from "../componets/CreditosTable";
import AbonoModal from "../modals/AbonoModal";
import { api } from "../lib/api.js";
import { ClientesService } from "../services/ClientesService.js";
import "../styles/Creditos.css";

const CreditosPage = () => {
  const [creditos, setCreditos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTotalMin, setFiltroTotalMin] = useState("");
  const [filtroTotalMax, setFiltroTotalMax] = useState("");
  const [filtroSaldoMin, setFiltroSaldoMin] = useState("");
  const [filtroSaldoMax, setFiltroSaldoMax] = useState("");

  // Estados para el modal de abono
  const [isAbonoOpen, setAbonoOpen] = useState(false);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        // Cargar créditos y clientes usando la instancia api centralizada
        const [creditosResponse, clientesResponse] = await Promise.all([
          api.get("/creditos"),
          ClientesService.listarClientes()
        ]);
        
        const creditosData = creditosResponse.data || [];
        const clientesData = clientesResponse || [];
        
        console.log("Créditos cargados exitosamente:", creditosData.length, "elementos");
        console.log("Clientes cargados exitosamente:", clientesData.length, "elementos");
        
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

    loadData();
  }, []);

  const filtrarCreditos = () => {
    return creditos.filter((c) => {
      const matchCliente = filtroCliente ? c.cliente?.id === Number(filtroCliente) : true;
      const matchEstado = filtroEstado ? c.estado === filtroEstado : true;

      const matchTotal =
        (!filtroTotalMin || c.totalCredito >= filtroTotalMin) &&
        (!filtroTotalMax || c.totalCredito <= filtroTotalMax);

      const matchSaldo =
        (!filtroSaldoMin || c.saldoPendiente >= filtroSaldoMin) &&
        (!filtroSaldoMax || c.saldoPendiente <= filtroSaldoMax);

      return matchCliente && matchEstado && matchTotal && matchSaldo;
    });
  };

  // Función para abrir el modal de abono
  const handleAbrirAbonoModal = (credito) => {
    setCreditoSeleccionado(credito);
    setAbonoOpen(true);
  };

  // Función para recargar los créditos después de crear un abono
  const loadCreditoDetalles = async () => {
    console.log("=== INICIANDO RECARGA DE CRÉDITOS ===");
    setIsReloading(true);
    
    try {
      const response = await api.get("/creditos");
      const data = response.data || [];
      
      console.log("✅ Recarga exitosa:", data.length, "créditos");
      setCreditos(data);
      console.log("=== RECARGA COMPLETADA ===");
      
    } catch (err) {
      console.error("❌ Error recargando créditos:", err.message);
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

        <div className="filtro-rango">
          <label>Total Crédito</label>
          <div className="inputs-row">
            <input type="number" placeholder="Mín" value={filtroTotalMin} onChange={(e) => setFiltroTotalMin(e.target.value)} />
            <input type="number" placeholder="Máx" value={filtroTotalMax} onChange={(e) => setFiltroTotalMax(e.target.value)} />
          </div>
        </div>

        <div className="filtro-rango">
          <label>Saldo Pendiente</label>
          <div className="inputs-row">
            <input type="number" placeholder="Mín" value={filtroSaldoMin} onChange={(e) => setFiltroSaldoMin(e.target.value)} />
            <input type="number" placeholder="Máx" value={filtroSaldoMax} onChange={(e) => setFiltroSaldoMax(e.target.value)} />
          </div>
        </div>
          </div>

          <CreditosTable 
            creditos={filtrarCreditos()} 
            onAbrirAbonoModal={handleAbrirAbonoModal}
          />
        </>
      )}

      {/* Modal de Abono */}
      <AbonoModal
        isOpen={isAbonoOpen}
        onClose={() => setAbonoOpen(false)}
        credito={creditoSeleccionado}
        onSuccess={loadCreditoDetalles}
      />
    </div>
  );
};

export default CreditosPage;
