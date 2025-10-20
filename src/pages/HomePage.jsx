
import { useEffect, useState } from "react";
import StatCard from "../componets/StatCard.jsx";
import LowStockPanel from "../componets/LowStockPanel.jsx";
import MovimientosPanel from "../componets/MovimientosPanel.jsx";
import { DashboardService } from "../services/DashboardService.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/HomeWidgets.css";

export default function HomePage(){
  const { sedeId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        console.warn('⚠️ No sedeId available, skipping dashboard load');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Loading dashboard data for sedeId:', sedeId);
        
        const data = await DashboardService.getDashboardData(sedeId);
        setDashboardData(data);
        
        console.log('✅ Dashboard data loaded successfully:', data);
      } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
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

  // Formatear traslados para el componente MovimientosPanel
  const trasladosFormateados = DashboardService.formatTrasladosForPanel(dashboardData.trasladosPendientes);

  // Mostrar mensaje de error si hay problemas
  if (error && !loading) {
    return (
      <div className="home-page">
        <div className="error-container">
          <h2>⚠️ Error cargando dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="button">
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="rowSuperior home-grid">
        <StatCard
          title="Sede"
          value={dashboardData.sede?.nombre || user?.sedeNombre || "-"}
          subtitle={user?.nombre ? `Usuario: ${user.nombre}` : "Sin usuario"}
          icon="🏢"
          loading={loading}
        />
        <StatCard
          title="Ventas de hoy"
          value={dashboardData.ventasHoy?.cantidad ?? 0}
          subtitle={new Intl.NumberFormat("es-CO", { 
            style: "currency", 
            currency: "COP", 
            maximumFractionDigits: 0 
          }).format(dashboardData.ventasHoy?.total ?? 0)}
          icon="🧾"
          loading={loading}
          status="ok"
        />
        <StatCard
          title="Faltante desde última entrega"
          value={new Intl.NumberFormat("es-CO", { 
            style: "currency", 
            currency: "COP", 
            maximumFractionDigits: 0 
          }).format(Math.max(0, dashboardData.faltanteEntrega?.montoFaltante ?? 0))}
          subtitle={
            dashboardData.faltanteEntrega?.ultimaEntrega 
              ? `Última entrega: ${new Date(dashboardData.faltanteEntrega.ultimaEntrega).toLocaleDateString("es-CO")}` 
              : "Sin entregas previas"
          }
          icon="💸"
          loading={loading}
          status={
            (dashboardData.faltanteEntrega?.montoFaltante ?? 0) > 0 
              ? ((dashboardData.faltanteEntrega?.montoFaltante ?? 0) > 500000 ? "error" : "warning") 
              : "ok"
          }
        />
        <StatCard
          title="Traslados pendientes"
          value={dashboardData.trasladosPendientes?.totalPendientes ?? 0}
          subtitle={`${dashboardData.trasladosPendientes?.trasladosRecibir?.length ?? 0} a recibir, ${dashboardData.trasladosPendientes?.trasladosEnviar?.length ?? 0} a enviar`}
          icon="📦"
          loading={loading}
          status={(dashboardData.trasladosPendientes?.totalPendientes ?? 0) > 0 ? "warning" : "ok"}
        />
        <StatCard
          title="Alertas de stock"
          value={dashboardData.alertasStock?.total ?? 0}
          subtitle="Productos bajos en inventario"
          icon="⚠️"
          loading={loading}
          status={(dashboardData.alertasStock?.total ?? 0) > 0 ? "warning" : "ok"}
        />
      </div>

      <div className="rowInferior home-grid-2cols">
        <LowStockPanel items={dashboardData.alertasStock?.productosBajos || []} />
        <MovimientosPanel entregasPendientes={trasladosFormateados} />
      </div>
      <div className="button-group">
        <button className="button">Vender</button>
        <button className="button">Ver Inventario</button>
        <button className="button">Ver Clientes</button>
        <button className="button">Ver Traslados</button>
      </div>
    </div>
  );
}