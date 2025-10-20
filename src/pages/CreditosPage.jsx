import { useEffect, useState } from "react";
import CreditosTable from "../componets/CreditosTable";
import AbonoModal from "../modals/AbonoModal";
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

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        // Cargar créditos con manejo mejorado de errores
        const creditosPromise = fetch(`${baseUrl}/creditos`)
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
            }
            
            // Clonar la respuesta para poder usar tanto .json() como .text() si es necesario
            const resClone = res.clone();
            
            try {
              const data = await res.json();
              console.log("Créditos cargados exitosamente:", data.length, "elementos");
              return data;
            } catch (jsonError) {
              console.warn("Error con .json(), intentando parseo manual:", jsonError.message);
              
              try {
                const text = await resClone.text();
                console.log("Longitud de respuesta:", text.length);
                
                // Verificar si hay caracteres problemáticos cerca del error
                if (text.length > 249900) {
                  console.log("Texto alrededor del error (posición 249900-250000):");
                  console.log(text.substring(249900, 250000));
                }
                
                // Intentar limpiar caracteres problemáticos
                const cleanedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                
                if (cleanedText !== text) {
                  console.log("Se encontraron y removieron caracteres de control");
                }
                
                const parsedData = JSON.parse(cleanedText);
                console.log("Parseo manual exitoso:", parsedData.length, "elementos");
                return parsedData;
                
              } catch (parseError) {
                console.error("Error en parseo manual:", parseError.message);
                console.error("Devolviendo array vacío para evitar crash");
                return [];
              }
            }
          });

        // Cargar clientes - try direct JSON parsing first  
        const clientesPromise = fetch(`${baseUrl}/clientes`)
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            try {
              // Try the native .json() method first
              return await res.json();
            } catch (jsonError) {
              console.warn("Clientes native .json() failed, trying manual parse:", jsonError.message);
              
              // Fallback to manual text parsing
              const text = await res.text();
              try {
                return JSON.parse(text);
              } catch (parseError) {
                console.error("Clientes manual JSON parse failed:", parseError.message);
                return [];
              }
            }
          });

        const [creditosData, clientesData] = await Promise.all([creditosPromise, clientesPromise]);
        
        setCreditos(creditosData || []);
        setClientes(clientesData || []);
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
      const res = await fetch(`${baseUrl}/creditos`);
      console.log("Status de respuesta:", res.status);
      
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
      }
      
      // Clonar respuesta para evitar "body already consumed"
      const resClone = res.clone();
      
      let data;
      try {
        data = await res.json();
        console.log("✅ Recarga exitosa con .json():", data?.length, "créditos");
        
        // Verificar que los datos son válidos
        if (Array.isArray(data)) {
          console.log("Primer crédito:", data[0]);
        }
        
      } catch (jsonError) {
        console.warn("⚠️ Error en recarga con .json(), intentando parseo manual:", jsonError.message);
        
        try {
          const text = await resClone.text();
          console.log("Longitud de texto recibido:", text.length);
          console.log("Primeros 100 caracteres:", text.substring(0, 100));
          
          // Limpiar caracteres problemáticos
          const cleanedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
          if (cleanedText !== text) {
            console.log("🧹 Se limpiaron caracteres de control");
          }
          
          data = JSON.parse(cleanedText);
          console.log("✅ Recarga manual exitosa:", data?.length, "créditos");
        } catch (parseError) {
          console.error("❌ Error en parseo manual durante recarga:", parseError.message);
          throw parseError;
        }
      }
      
      setCreditos(data || []);
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
      <h1>Gestión de Créditos</h1>

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
