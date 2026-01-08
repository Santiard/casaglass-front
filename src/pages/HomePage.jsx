
import { useEffect, useState } from "react";
import KPICard from "../componets/KPICard.jsx";
import DashboardSection from "../componets/DashboardSection.jsx";
import LowStockPanel from "../componets/LowStockPanel.jsx";
import MovimientosPanel from "../componets/MovimientosPanel.jsx";
import VentasDiaTable from "../componets/VentasDiaTable.jsx";
import { DashboardService } from "../services/DashboardService.js";
import { obtenerVentasDiaSede, obtenerVentasDiaTodasSedes } from "../services/OrdenesService.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/HomeWidgets.css";
import "../styles/DashboardPage.css";

export default function HomePage(){
  const { sedeId, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventasDiaLoading, setVentasDiaLoading] = useState(true);
  const [ventasDia, setVentasDia] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    sede: {},
    ventasHoy: {},
    faltanteEntrega: {},
    creditosPendientes: {},
    trasladosPendientes: { totalPendientes: 0, trasladosRecibir: [], trasladosEnviar: [] },
    alertasStock: { total: 0, productosBajos: [] }
  });

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!sedeId) {
        console.warn(' No sedeId available, skipping dashboard load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await DashboardService.getDashboardData(sedeId);
        setDashboardData(data);
        
      } catch (err) {
        console.error(' Error loading dashboard data:', err);
        setError(err.message);
        
        // Mantener estructura vacía en caso de error para evitar crashes
        setDashboardData({
          sede: { nombre: user?.sedeNombre || 'Sede Desconocida' },
          ventasHoy: { cantidad: 0, total: 0 },
          faltanteEntrega: { montoFaltante: 0 },
          creditosPendientes: { totalCreditos: 0, montoPendiente: 0 },
          trasladosPendientes: { totalPendientes: 0, trasladosRecibir: [], trasladosEnviar: [] },
          alertasStock: { total: 0, productosBajos: [] }
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [sedeId, user]);

  // Cargar ventas del día
  useEffect(() => {
    const loadVentasDia = async () => {
      try {
        setVentasDiaLoading(true);
        let ordenes = [];
        
        if (isAdmin) {
          // Administrador: ver todas las sedes
          ordenes = await obtenerVentasDiaTodasSedes();
        } else if (sedeId) {
          // Usuario normal: solo su sede
          ordenes = await obtenerVentasDiaSede(sedeId);
        }
        
        setVentasDia(ordenes);
      } catch (err) {
        console.error(' Error loading ventas del día:', err);
        setVentasDia([]);
      } finally {
        setVentasDiaLoading(false);
      }
    };

    if (sedeId || isAdmin) {
      loadVentasDia();
    }
  }, [sedeId, isAdmin]);

  // Formatear traslados para el componente MovimientosPanel
  const trasladosFormateados = DashboardService.formatTrasladosForPanel(dashboardData.trasladosPendientes);

  // Mostrar mensaje de error si hay problemas
  if (error && !loading) {
    return (
      <div className="home-page">
        <div className="error-container">
          <h2> Error cargando dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="button">
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* KPI Cards estilo AdminPage */}
      <div className="kpi-grid">
        <KPICard
          title="Sede"
          value={dashboardData.sede?.nombre || user?.sedeNombre || "-"}
          subtitle={user?.nombre ? `Usuario: ${user.nombre}` : "Sin usuario"}
          color="var(--color-light-blue)"
        />
        <KPICard
          title="Ventas de Hoy"
          value={String(dashboardData.ventasHoy?.cantidad ?? 0)}
          subtitle={new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(dashboardData.ventasHoy?.total ?? 0)}
          color="#10b981"
        />
        <KPICard
          title="Faltante desde última entrega"
          value={new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.max(0, dashboardData.faltanteEntrega?.montoFaltante ?? 0))}
          subtitle={dashboardData.faltanteEntrega?.ultimaEntrega ? `Última entrega: ${new Date(dashboardData.faltanteEntrega.ultimaEntrega).toLocaleDateString("es-CO")}` : "Sin entregas previas"}
          color="#f59e0b"
        />
        <KPICard
          title="Traslados Pendientes"
          value={String(dashboardData.trasladosPendientes?.totalPendientes ?? 0)}
          subtitle={`${dashboardData.trasladosPendientes?.trasladosRecibir?.length ?? 0} a recibir, ${dashboardData.trasladosPendientes?.trasladosEnviar?.length ?? 0} a enviar`}
          color="var(--color-light-blue)"
        />
        <KPICard
          title="Alertas de Stock"
          value={String(
            (dashboardData.alertasStock?.productosBajos || [])
              .filter(p => {
                const stock = p.stockActual || p.stock || 0;
                return stock < 30;
              }).length
          )}
          subtitle="Productos con stock &lt; 30 unidades"
          color="#ef4444"
        />
      </div>

      {/* Ventas del Día */}
      <DashboardSection 
        title="Ventas del Día" 
        description={isAdmin ? "Todas las sedes" : dashboardData.sede?.nombre || "Sede actual"}
      >
        <VentasDiaTable ordenes={ventasDia} loading={ventasDiaLoading} />
      </DashboardSection>

      {/* Paneles estilo AdminPage */}
      <DashboardSection title="Operación" description="Alertas y movimientos pendientes">
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Alertas de Stock</h3>
            <div>
              <LowStockPanel items={
                (dashboardData.alertasStock?.productosBajos || [])
                  .filter(p => {
                    const stock = p.stockActual || p.stock || 0;
                    return stock < 30;
                  })
              } />
            </div>
          </div>
          <div className="chart-card">
            <h3>Traslados Pendientes</h3>
            <div>
              <MovimientosPanel entregasPendientes={trasladosFormateados} />
            </div>
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}