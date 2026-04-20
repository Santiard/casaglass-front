
import { useEffect, useState } from "react";
import KPICard from "../componets/KPICard.jsx";
import DashboardSection from "../componets/DashboardSection.jsx";
import LowStockPanel from "../componets/LowStockPanel.jsx";
import MovimientosPanel from "../componets/MovimientosPanel.jsx";
import VentasDiaTable from "../componets/VentasDiaTable.jsx";
import { DashboardService } from "../services/DashboardService.js";
import { obtenerVentasDiaSede, obtenerVentasDiaTodasSedes } from "../services/OrdenesService.js";
import { listarTodosLosProductos } from "../services/ProductosService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import * as XLSX from 'xlsx';
import "../styles/HomeWidgets.css";
import "../styles/DashboardPage.css";

export default function HomePage(){
  const { sedeId, user, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventasDiaLoading, setVentasDiaLoading] = useState(true);
  const [ventasDia, setVentasDia] = useState([]);
  const [descargandoPrecios, setDescargandoPrecios] = useState(false);
  const [seccionesExpandidas, setSeccionesExpandidas] = useState({ hoy: true, mes: false, historico: false });
  const toggleSeccion = (seccion) => setSeccionesExpandidas(prev => ({ ...prev, [seccion]: !prev[seccion] }));
  const [dashboardData, setDashboardData] = useState({
    sede: {},
    ventasHoy: {},
    ventasMes: {},
    faltanteEntrega: {},
    creditosPendientes: {},
    deudasMes: {},
    deudasActivas: {},
    trasladosPendientes: { totalPendientes: 0, trasladosRecibir: [], trasladosEnviar: [] },
    alertasStock: { total: 0, productosBajos: [] }
  });

  // Cargar datos del dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!sedeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await DashboardService.getDashboardData(sedeId);
        setDashboardData(data);
        
      } catch (err) {
        setError(err.message);
        
        // Mantener estructura vacía en caso de error para evitar crashes
        setDashboardData({
          sede: { nombre: user?.sedeNombre || 'Sede Desconocida' },
          ventasHoy: { cantidad: 0, total: 0, ventasContado: 0, ventasCredito: 0, totalContado: 0, totalCredito: 0 },
          ventasMes: { cantidad: 0, total: 0, ventasContado: 0, ventasCredito: 0, totalContado: 0, totalCredito: 0 },
          faltanteEntrega: { montoFaltante: 0 },
          creditosPendientes: { totalCreditos: 0, montoPendiente: 0 },
          deudasMes: { totalDeudas: 0, montoTotalDeudas: 0, montoPendiente: 0, deudasAbiertas: 0, deudasCerradas: 0 },
          deudasActivas: { totalDeudas: 0, montoTotalHistorico: 0, montoPendienteActivo: 0, deudasAbiertas: 0, deudasCerradas: 0, deudasAnuladas: 0 },
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
        setVentasDia([]);
      } finally {
        setVentasDiaLoading(false);
      }
    };

    if (sedeId || isAdmin) {
      loadVentasDia();
    }
  }, [sedeId, isAdmin]);

  // Función para descargar lista de precios en Excel
  const descargarListaPrecios = async () => {
    try {
      setDescargandoPrecios(true);
      
      // Obtener todos los productos
      const productos = await listarTodosLosProductos();
      
      // Filtrar solo productos sin cortes (esCorte = false)
      const productosSinCortes = productos.filter(p => !p.esCorte);
      
      if (productosSinCortes.length === 0) {
        showError('No hay productos disponibles para descargar');
        return;
      }
      
      // Preparar datos para Excel
      const datosExcel = productosSinCortes.map(producto => {
        const cantidadInsula = Number(producto.cantidadInsula || 0);
        const cantidadCentro = Number(producto.cantidadCentro || 0);
        const cantidadPatios = Number(producto.cantidadPatios || 0);
        const stockTotal = producto.cantidadTotal || (cantidadInsula + cantidadCentro + cantidadPatios);
        
        return {
          'Código': producto.codigo || producto.sku || '-',
          'Nombre': producto.nombre || '-',
          'Categoría': producto.categoria || '-',
          'Tipo': producto.tipo || '-',
          'Color': producto.color || '-',
          'Precio Insula': producto.precio1 || 0,
          'Precio Centro': producto.precio2 || 0,
          'Precio Patios': producto.precio3 || 0,
          'Costo': producto.costo || 0,
          'Stock Insula': cantidadInsula,
          'Stock Centro': cantidadCentro,
          'Stock Patios': cantidadPatios,
          'Stock Total': stockTotal
        };
      });
      
      // Crear libro de Excel
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lista de Precios');
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 40 }, // Nombre
        { wch: 15 }, // Categoría
        { wch: 20 }, // Tipo
        { wch: 15 }, // Color
        { wch: 15 }, // Precio Insula
        { wch: 15 }, // Precio Centro
        { wch: 15 }, // Precio Patios
        { wch: 15 }, // Costo
        { wch: 13 }, // Stock Insula
        { wch: 13 }, // Stock Centro
        { wch: 13 }, // Stock Patios
        { wch: 12 }  // Stock Total
      ];
      ws['!cols'] = colWidths;
      
      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Lista_Precios_${fecha}.xlsx`;
      
      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);
      
      showSuccess(`Lista de precios descargada: ${productosSinCortes.length} productos`);
    } catch (error) {
      console.error('Error descargando lista de precios:', error);
      showError('Error al descargar la lista de precios');
    } finally {
      setDescargandoPrecios(false);
    }
  };

  // Formatear traslados para el componente MovimientosPanel
  const trasladosFormateados = DashboardService.formatTrasladosForPanel(dashboardData.trasladosPendientes);

  const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n ?? 0);

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
      {/* Botón para descargar lista de precios - Solo para administradores */}
      {isAdmin && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '1.5rem',
          gap: '1rem'
        }}>
          <button 
            onClick={descargarListaPrecios}
            disabled={descargandoPrecios}
            className="button"
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: descargandoPrecios ? 'not-allowed' : 'pointer',
              opacity: descargandoPrecios ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!descargandoPrecios) {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#10b981';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {descargandoPrecios ? 'Descargando...' : 'Descargar Lista de Precios (Excel)'}
          </button>
        </div>
      )}
      
      {/* ── ROW 1: HOY ── */}
      <div className="kpi-section-label" onClick={() => toggleSeccion('hoy')} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span>Hoy</span>
        <span className="kpi-section-arrow">{seccionesExpandidas.hoy ? '▲' : '▼'}</span>
      </div>
      {seccionesExpandidas.hoy && (
      <div className="kpi-grid">
        <KPICard
          title="Sede"
          value={dashboardData.sede?.nombre || user?.sedeNombre || "-"}
          subtitle={user?.nombre ? `Usuario: ${user.nombre}` : "Sin usuario"}
          color="var(--color-light-blue)"
        />
        <KPICard
          title="Ventas de Hoy"
          value={fmt(dashboardData.ventasHoy?.total)}
          subtitle={`${dashboardData.ventasHoy?.cantidad ?? 0} venta(s) realizadas hoy`}
          color="#10b981"
        />
        <KPICard
          title="Contado Hoy"
          value={fmt(dashboardData.ventasHoy?.totalContado)}
          subtitle={`${dashboardData.ventasHoy?.ventasContado ?? 0} venta(s) al contado`}
          color="#10b981"
        />
        <KPICard
          title="Crédito Hoy"
          value={fmt(dashboardData.ventasHoy?.totalCredito)}
          subtitle={`${dashboardData.ventasHoy?.ventasCredito ?? 0} venta(s) a crédito`}
          color="#10b981"
        />
        <KPICard
          title="Dinero para Cierre de Caja"
          value={fmt(Math.max(0, dashboardData.faltanteEntrega?.montoFaltante ?? 0))}
          subtitle={
            dashboardData.faltanteEntrega?.ultimaEntrega
              ? `Última entrega: ${new Date(dashboardData.faltanteEntrega.ultimaEntrega).toLocaleDateString("es-CO")} · ${fmt(dashboardData.faltanteEntrega.montoUltimaEntrega)}`
              : "Sin entregas previas"
          }
          color="#f59e0b"
        />
      </div>
      )}

      {/* ── ROW 2: MES ── */}
      <div className="kpi-section-label" onClick={() => toggleSeccion('mes')} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span>Este mes</span>
        <span className="kpi-section-arrow">{seccionesExpandidas.mes ? '▲' : '▼'}</span>
      </div>
      {seccionesExpandidas.mes && (
      <div className="kpi-grid">
        <KPICard
          title="Ventas del Mes"
          value={fmt(dashboardData.ventasMes?.total)}
          subtitle={`${dashboardData.ventasMes?.cantidad ?? 0} venta(s) en el mes`}
          color="#10b981"
        />
        <KPICard
          title="Contado del Mes"
          value={fmt(dashboardData.ventasMes?.totalContado)}
          subtitle={`${dashboardData.ventasMes?.ventasContado ?? 0} venta(s) al contado`}
          color="#10b981"
        />
        <KPICard
          title="Crédito del Mes"
          value={fmt(dashboardData.ventasMes?.totalCredito)}
          subtitle={`${dashboardData.ventasMes?.ventasCredito ?? 0} venta(s) a crédito`}
          color="#10b981"
        />
        <KPICard
          title="Creditos abiertos del Mes"
          value={String(dashboardData.deudasMes?.totalDeudas ?? 0)}
          color="#8b5cf6"
        />
        <KPICard
          title="Dinero Pendiente Creditos del Mes"
          value={fmt(dashboardData.deudasMes?.montoPendiente)}
          color="#8b5cf6"
        />
      </div>
      )}

      {/* ── ROW 3: HISTÓRICO ── */}
      <div className="kpi-section-label" onClick={() => toggleSeccion('historico')} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span>Histórico</span>
        <span className="kpi-section-arrow">{seccionesExpandidas.historico ? '▲' : '▼'}</span>
      </div>
      {seccionesExpandidas.historico && (
      <div className="kpi-grid">
        <KPICard
          title="Numero Total de Créditos Activos"
          value={String(dashboardData.creditosPendientes?.totalCreditos ?? 0)}
          color="#ef4444"
        />
        <KPICard
          title="Monto Deudas Creditos Activos"
          value={fmt(dashboardData.deudasActivas?.montoPendienteActivo)}
          color="#6366f1"
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
              .filter(p => (p.stockActual || p.stock || 0) < 30).length
          )}
          subtitle="Productos con stock < 30 unidades"
          color="#ef4444"
        />
      </div>
      )}

      {/* Ventas del Día */}
      <DashboardSection 
        title="Ventas del Día" 
        description={isAdmin ? "Todas las sedes" : dashboardData.sede?.nombre || "Sede actual"}
      >
        <VentasDiaTable ordenes={ventasDia} loading={ventasDiaLoading} />
      </DashboardSection>

      {/* Paneles estilo AdminPage */}
      <DashboardSection title="Operación" description="Alertas y movimientos pendientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Traslados Pendientes - Arriba, ancho completo */}
          <div className="chart-card" style={{ width: '100%' }}>
            <h3>Traslados Pendientes</h3>
            <div>
              <MovimientosPanel entregasPendientes={trasladosFormateados} />
            </div>
          </div>
          
          {/* Alertas de Stock - Abajo, ancho completo */}
          <div className="chart-card" style={{ width: '100%' }}>
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
        </div>
      </DashboardSection>
    </div>
  );
}