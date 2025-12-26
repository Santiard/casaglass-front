import { useState, useEffect, useMemo } from "react";
import "../styles/AdminPage.css";
import "../styles/DashboardPage.css";
import KPICard from "../componets/KPICard.jsx";
import DashboardSection from "../componets/DashboardSection.jsx";
import VentasPorSedeStackedChart from "../componets/VentasPorSedeStackedChart.jsx";
import VentasMensualesChart from "../componets/VentasMensualesChart.jsx";
import TopProductosChart from "../componets/TopProductosChart.jsx";
import TopClientesChart from "../componets/TopClientesChart.jsx";
import VentasPorSedePieChart from "../componets/VentasPorSedePieChart.jsx";
import IngresosVsCostosChart from "../componets/IngresosVsCostosChart.jsx";
import StockCriticoTable from "../componets/StockCriticoTable.jsx";
import { DashboardService } from "../services/DashboardService.js";
import { listarTrabajadores, listarTrabajadoresTabla } from "../services/TrabajadoresService.js";

const fmtCOP = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [trabajadores, setTrabajadores] = useState([]); // lista completa con sede
  const [trabajadorId, setTrabajadorId] = useState(null);
  const [dashTrabajador, setDashTrabajador] = useState(null);
  const [trabajadoresResumen, setTrabajadoresResumen] = useState([]); // [{id,nombre,sedeNombre,montoTotal,contadoMonto,creditoMonto,totalOrdenes}]

  useEffect(() => {
    loadDashboardData();
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarTrabajadores();
        setTrabajadores(Array.isArray(lista) ? lista : []);
        if (lista?.length && !trabajadorId) setTrabajadorId(lista[0].id);
      } catch (e) {
        // Error listando trabajadores
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!trabajadorId) return;
      try {
        const data = await DashboardService.getDashboardTrabajador(trabajadorId, fechaDesde, fechaHasta);
        setDashTrabajador(data);
      } catch (e) {
        // Error cargando dashboard de trabajador
        setDashTrabajador(null);
      }
    })();
  }, [trabajadorId, fechaDesde, fechaHasta]);

  // Cargar resumen para TODOS los trabajadores (comparativa)
  useEffect(() => {
    (async () => {
      if (!Array.isArray(trabajadores) || trabajadores.length === 0) {
        setTrabajadoresResumen([]);
        return;
      }
      try {
        const resultados = await Promise.all(trabajadores.map(async (t) => {
          try {
            const d = await DashboardService.getDashboardTrabajador(t.id, fechaDesde, fechaHasta);
            const r = d?.resumen || {};
            return {
              id: t.id,
              nombre: t.nombre,
              username: t.username,
              sedeNombre: t.sede?.nombre || "SIN SEDE",
              totalOrdenes: r.totalOrdenes || 0,
              contadoMonto: r.contadoMonto || 0,
              creditoMonto: r.creditoMonto || 0,
              montoTotal: r.montoTotal || ((r.contadoMonto||0)+(r.creditoMonto||0)),
            };
          } catch {
            return {
              id: t.id,
              nombre: t.nombre,
              username: t.username,
              sedeNombre: t.sede?.nombre || "SIN SEDE",
              totalOrdenes: 0,
              contadoMonto: 0,
              creditoMonto: 0,
              montoTotal: 0,
            };
          }
        }));
        setTrabajadoresResumen(resultados);
      } catch (e) {
        // Error comparando trabajadores
        setTrabajadoresResumen([]);
      }
    })();
  }, [trabajadores, fechaDesde, fechaHasta]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getDashboardCompleto(fechaDesde, fechaHasta);
      setDashboardData(data);
    } catch (error) {
      // Error cargando datos del dashboard
      setError(error?.response?.data?.message || "Error cargando datos del dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Calcular utilidad neta (asumiendo un margen aproximado del 30% como ejemplo)
  const utilidadNeta = useMemo(() => {
    if (!dashboardData?.resumenGeneral) return 0;
    const montoVentas = dashboardData.resumenGeneral.montoTotalVentas || 0;
    // Margen estimado del 30% (esto debería venir del backend si hay costos)
    return montoVentas * 0.30;
  }, [dashboardData]);

  // Transformar ventasPorDia para la gráfica mensual (agrupar por mes)
  const ventasMensuales = useMemo(() => {
    if (!dashboardData?.ventasPorDia) return [];
    const porMes = {};
    dashboardData.ventasPorDia.forEach(item => {
      const mes = item.fecha.substring(0, 7); // YYYY-MM
      if (!porMes[mes]) {
        porMes[mes] = { mes: mes.substring(5), ventas: 0 }; // Solo MM
      }
      porMes[mes].ventas += item.montoTotal || 0;
    });
    return Object.values(porMes);
  }, [dashboardData]);

  // Transformar ventasPorDia para gráfica diaria
  const ventasDiarias = useMemo(() => {
    if (!dashboardData?.ventasPorDia) return [];
    return dashboardData.ventasPorDia.map(item => ({
      fecha: item.fecha.split('-')[2], // Solo día
      ventas: item.montoTotal || 0,
      cantidad: item.cantidadOrdenes || 0,
    }));
  }, [dashboardData]);

  // Transformar topProductos para la gráfica
  const topProductosData = useMemo(() => {
    if (!dashboardData?.topProductos) return [];
    return dashboardData.topProductos.map(item => ({
      nombre: item.nombreProducto,
      ventas: item.montoTotal || 0,
      cantidad: item.cantidadVendida || 0,
    }));
  }, [dashboardData]);

  // Transformar topClientes para la gráfica
  const topClientesData = useMemo(() => {
    if (!dashboardData?.topClientes) return [];
    return dashboardData.topClientes.map(item => ({
      nombreCliente: item.nombreCliente,
      montoTotal: item.montoTotal || 0,
      cantidadOrdenes: item.cantidadOrdenes || 0,
    }));
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>
          <p>Error: {error}</p>
          <button onClick={loadDashboardData} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const resumen = dashboardData.resumenGeneral || {};

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <h1>Dashboard Administrativo</h1>
        <p>Vista general del estado del negocio en todas las sedes</p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", alignItems: "center" }}>
          <label>
            Desde:
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
            />
          </label>
          <label>
            Hasta:
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
            />
          </label>
          <button
            onClick={loadDashboardData}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--color-light-blue)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard
          title="Ventas Totales"
          value={fmtCOP(resumen.montoTotalVentas || 0)}
          subtitle={`${resumen.totalVentas || 0} ventas realizadas`}
          color="var(--color-light-blue)"
        />
        <KPICard
          title="Utilidad Neta Estimada"
          value={fmtCOP(utilidadNeta)}
          subtitle={`Margen estimado: 30%`}
          color="#10b981"
        />
        <KPICard
          title="Facturas"
          value={resumen.totalFacturas || 0}
          subtitle={`${fmtCOP(resumen.montoTotalFacturado || 0)} facturado`}
          color="#f59e0b"
        />
        <KPICard
          title="Créditos Abiertos"
          value={resumen.totalCreditosAbiertos || 0}
          subtitle={`${fmtCOP(resumen.montoCreditosPendiente || 0)} pendiente`}
          color="#ef4444"
        />
      </div>

      {/* VISTA GENERAL */}
      <DashboardSection
        title="Vista General del Negocio"
        description="Métricas globales de todas las sedes"
      >
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Ventas por Día</h3>
            <div className="chart-container">
              <VentasMensualesChart data={ventasDiarias} />
            </div>
          </div>
          <div className="chart-card">
            <h3>Participación de Ventas por Sede</h3>
            <div className="chart-container">
              <VentasPorSedePieChart data={dashboardData.ventasPorSede || []} />
            </div>
          </div>
        </div>
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Resumen de Ventas por Sede</h3>
            <div style={{ padding: "1rem" }}>
              {dashboardData.ventasPorSede?.map((sede) => (
                <div key={sede.sedeId} style={{ 
                  marginBottom: "1rem", 
                  padding: "1rem", 
                  background: "#f9fafb", 
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong>{sede.nombreSede}</strong>
                    <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                      {sede.cantidadOrdenes} órdenes
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ color: "var(--color-light-blue)", fontSize: "1.125rem" }}>
                      {fmtCOP(sede.montoTotal)}
                    </strong>
                    {(() => {
                      const ticket = dashboardData.ticketPromedioPorSede?.find(t => t.sedeId === sede.sedeId);
                      return ticket ? (
                        <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.75rem" }}>
                          Ticket: {fmtCOP(ticket.ticketPromedio)}
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <h3>Resumen de Créditos</h3>
            <div style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Abiertos:</span>
                  <strong>{dashboardData.resumenCreditos?.totalAbiertos || 0}</strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Cerrados:</span>
                  <strong style={{ color: "#10b981" }}>{dashboardData.resumenCreditos?.totalCerrados || 0}</strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Vencidos:</span>
                  <strong style={{ color: "#ef4444" }}>{dashboardData.resumenCreditos?.totalVencidos || 0}</strong>
                </p>
                <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Pendiente:</span>
                  <strong>{fmtCOP(dashboardData.resumenCreditos?.montoTotalPendiente || 0)}</strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Abonado:</span>
                  <strong style={{ color: "#10b981" }}>{fmtCOP(dashboardData.resumenCreditos?.montoTotalAbonado || 0)}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* VENTAS Y CLIENTES */}
      <DashboardSection
        title="Ventas y Clientes"
        description="Análisis de productos, sedes y vendedores más rentables"
      >
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Top 10 Productos Más Vendidos</h3>
            <div className="chart-container">
              <TopProductosChart data={topProductosData} />
            </div>
          </div>
          <div className="chart-card">
            <h3>Top 10 Clientes por Monto</h3>
            <div className="chart-container">
              <TopClientesChart data={topClientesData} />
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* COMPARATIVA DE TRABAJADORES */}
      <DashboardSection
        title="Comparativa de Trabajadores"
        description="Ventas por trabajador y participación por sede"
      >
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Ventas por Trabajador (monto)</h3>
            <div className="chart-container">
              {/* Inline Recharts para barras horizontales */}
              {/* eslint-disable-next-line react/no-unknown-property */}
              {(() => {
                const data = trabajadoresResumen.map(t => ({ nombre: t.nombre, ventas: t.montoTotal }));
                return (
                  <div style={{ width: '100%', height: '100%' }}>
                    {/* Usar TopProductosChart como barra horizontal reutilizando prop names */}
                    {/* Adapt: nombre -> nombre, ventas -> ventas */}
                    <TopProductosChart data={data} />
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="chart-card">
            <h3>Participación por Trabajador</h3>
            <div className="chart-container">
              {(() => {
                // Mostrar participación por trabajador (incluye sede en la etiqueta)
                const adapt = (trabajadoresResumen || []).map(t => ({
                  nombreSede: `${t.nombre} (${t.sedeNombre || 'SIN SEDE'})`,
                  montoTotal: t.montoTotal || 0,
                  cantidadOrdenes: t.totalOrdenes || 0,
                }));
                return <VentasPorSedePieChart data={adapt} />;
              })()}
            </div>
          </div>
        </div>
      </DashboardSection>

      {/* PERSONAL - Dashboard por trabajador */}
      <DashboardSection
        title="Desempeño por Trabajador"
        description="Analiza ventas y clientes por trabajador"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <label>
            Trabajador:
            <select
              value={trabajadorId || ""}
              onChange={(e) => setTrabajadorId(Number(e.target.value))}
              style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem" }}
            >
              {trabajadores.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.username})</option>
              ))}
            </select>
          </label>
        </div>

        {dashTrabajador ? (
          <>
            <div className="kpi-grid">
              <KPICard
                title="Total Órdenes"
                value={String(dashTrabajador.resumen?.totalOrdenes || 0)}
                color="var(--color-light-blue)"
              />
              <KPICard
                title="Contado"
                value={`${dashTrabajador.resumen?.contadoCantidad || 0} / ${fmtCOP(dashTrabajador.resumen?.contadoMonto || 0)}`}
                color="#10b981"
              />
              <KPICard
                title="Crédito"
                value={`${dashTrabajador.resumen?.creditoCantidad || 0} / ${fmtCOP(dashTrabajador.resumen?.creditoMonto || 0)}`}
                color="#f59e0b"
              />
              <KPICard
                title="Ticket Promedio"
                value={fmtCOP(dashTrabajador.resumen?.ticketPromedio || 0)}
                color="#344490"
              />
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <h3>Ventas por Día</h3>
                <div className="chart-container">
                  <VentasMensualesChart data={(dashTrabajador.ventasPorDia || []).map(d => ({ mes: d.fecha.split('-')[2], ventas: d.monto }))} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Top Productos</h3>
                <div className="chart-container">
                  <TopProductosChart data={(dashTrabajador.topProductos || []).map(p => ({ nombre: p.nombre, ventas: p.monto }))} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Top Clientes</h3>
                <div className="chart-container">
                  <TopClientesChart data={(dashTrabajador.topClientes || []).map(c => ({ nombreCliente: c.nombre, montoTotal: c.monto }))} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>Selecciona un trabajador para ver su resumen.</p>
        )}
      </DashboardSection>

      {/* FINANZAS */}
      <DashboardSection
        title="Finanzas y Facturación"
        description="Visualización de ingresos, facturación y créditos"
      >
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Facturación por Estado</h3>
            <div style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Pendientes:</span>
                  <strong style={{ color: "#f59e0b" }}>
                    {dashboardData.facturacionPorEstado?.pendientes || 0} - {fmtCOP(dashboardData.facturacionPorEstado?.montoPendiente || 0)}
                  </strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Pagadas:</span>
                  <strong style={{ color: "#10b981" }}>
                    {dashboardData.facturacionPorEstado?.pagadas || 0} - {fmtCOP(dashboardData.facturacionPorEstado?.montoPagado || 0)}
                  </strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Anuladas:</span>
                  <strong style={{ color: "#ef4444" }}>
                    {dashboardData.facturacionPorEstado?.anuladas || 0}
                  </strong>
                </p>
              </div>
            </div>
          </div>
          <div className="chart-card">
            <h3>Resumen General</h3>
            <div style={{ padding: "1rem" }}>
              <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Total Órdenes:</span>
                  <strong>{resumen.totalOrdenes || 0}</strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Ventas:</span>
                  <strong style={{ color: "#10b981" }}>{resumen.totalVentas || 0}</strong>
                </p>
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Cotizaciones:</span>
                  <strong style={{ color: "#6b7280" }}>{resumen.totalCotizaciones || 0}</strong>
                </p>
                <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
                <p style={{ margin: "0.25rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>Monto Cotizaciones:</span>
                  <strong>{fmtCOP(resumen.montoTotalCotizaciones || 0)}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}
