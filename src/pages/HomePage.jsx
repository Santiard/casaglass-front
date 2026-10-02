
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
import InformesMensualService from "../services/InformesMensualService.js";
import "../styles/HomeWidgets.css";
import "../styles/DashboardPage.css";
import "../styles/InformesMensualesPage.css";

function fmtCOP(n) {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(v);
}

function escapeHtml(text) {
  if (text == null || text === "") return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function imprimirDetalleDeudasDocumento(sedeNombre, deudas, onVentanaBloqueada) {
  if (!Array.isArray(deudas)) return;

  const fechaGen = new Date().toLocaleString("es-CO");
  const totalCreditoAcum = deudas.reduce((sum, d) => sum + (Number(d.totalCredito) || 0), 0);
  const saldoPendienteAcum = deudas.reduce((sum, d) => sum + (Number(d.saldoPendiente) || 0), 0);

  const tbody = deudas
    .map(
      (d) => `
      <tr>
        <td style="text-align: center;">\${escapeHtml(d.fechaInicio || "—")}</td>
        <td>\${escapeHtml(d.cliente || "—")}</td>
        <td style="text-align: center;">#\${escapeHtml(d.ordenId || "—")}</td>
        <td style="text-align: right;">\${escapeHtml(fmtCOP(d.totalCredito))}</td>
        <td style="text-align: right; font-weight: bold;">\${escapeHtml(fmtCOP(d.saldoPendiente))}</td>
      </tr>
    `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Detalle de Cartera - \${escapeHtml(sedeNombre)}</title>
  <style>
    @page { margin: 15mm; size: portrait; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; margin: 0; padding: 10px; }
    h1 { font-size: 16pt; margin: 0 0 5px 0; color: #1e2753; text-align: center; }
    .sub { font-size: 10pt; color: #666; margin: 0 0 20px 0; text-align: center; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background-color: #f2f2f2; border: 1px solid #ddd; padding: 8px 10px; font-weight: bold; font-size: 9.5pt; text-align: left; }
    th.text-center, td.text-center { text-align: center; }
    th.text-right, td.text-right { text-align: right; }
    td { padding: 8px 10px; border: 1px solid #ddd; font-size: 9pt; }
    .total-row td { background-color: #eaeaea; font-weight: bold; border-top: 2px solid #333; }
    .pie { margin-top: 30px; font-size: 8pt; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>Detalle de Cartera (Deudores)</h1>
  <p class="sub"><strong>Sede:</strong> \${escapeHtml(sedeNombre)}<br/><strong>Fecha de Generación:</strong> \${escapeHtml(fechaGen)}</p>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 15%;">Fecha</th>
        <th style="width: 40%;">Cliente</th>
        <th class="text-center" style="width: 15%;">Orden</th>
        <th class="text-right" style="width: 15%;">Total Facturado</th>
        <th class="text-right" style="width: 15%;">Saldo Pendiente</th>
      </tr>
    </thead>
    <tbody>
      \${tbody}
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">Totales:</td>
        <td style="text-align: right;">\${escapeHtml(fmtCOP(totalCreditoAcum))}</td>
        <td style="text-align: right;">\${escapeHtml(fmtCOP(saldoPendienteAcum))}</td>
      </tr>
    </tbody>
  </table>
  <p class="pie">Casa Glass · Reporte generado automáticamente para cobros</p>
  <script>
    window.addEventListener("afterprint", function () { try { window.close(); } catch (e) {} });
    setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 250);
  </script>
</body></html>`;

  const ventana = window.open("", "_blank", "width=680,height=560");
  if (!ventana) {
    onVentanaBloqueada?.();
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

export default function HomePage(){
  const { sedeId, user, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventasDiaLoading, setVentasDiaLoading] = useState(true);
  const [ventasDia, setVentasDia] = useState([]);
  const [descargandoPrecios, setDescargandoPrecios] = useState(false);
  
  // Modal Cartera (Deudores en vivo)
  const [modalDeudasOpen, setModalDeudasOpen] = useState(false);
  const [deudasDetalle, setDeudasDetalle] = useState([]);
  const [loadingDeudas, setLoadingDeudas] = useState(false);

  const abrirDetalleCartera = async () => {
    if (!sedeId) return;
    setLoadingDeudas(true);
    try {
      const data = await InformesMensualService.obtenerDetalleDeudasSede(sedeId);
      setDeudasDetalle(data || []);
      setModalDeudasOpen(true);
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || "Error al cargar la cartera");
    } finally {
      setLoadingDeudas(false);
    }
  };

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
      {/* Botones de acciones superiores */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '1.5rem',
        gap: '1rem'
      }}>
        <button 
          onClick={abrirDetalleCartera}
          disabled={loadingDeudas}
          className="button"
          style={{
            backgroundColor: '#3b82f6',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            cursor: loadingDeudas ? 'not-allowed' : 'pointer',
            opacity: loadingDeudas ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loadingDeudas) {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {loadingDeudas ? 'Cargando...' : 'Ver Cartera'}
        </button>

        {isAdmin && (
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
        )}
      </div>
      
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

      {modalDeudasOpen && (
        <div className="informes-modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalDeudasOpen(false); }}>
          <div className="informes-modal-panel informes-modal-xl" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className="informes-modal-header">
              <h2>Detalle de Cartera (Deudas Activas)</h2>
              <button type="button" className="informes-modal-close" onClick={() => setModalDeudasOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="informes-modal-body">
              <p style={{ margin: "0 0 1rem", color: "#555", fontSize: "0.9rem" }}>
                Listado detallado de saldos pendientes de los clientes de la sede <strong>{user?.sedeNombre || "Sede"}</strong>.
              </p>
              
              <div className="entregas-table-container" style={{ border: "1px solid #e0e0e0", borderRadius: 8, maxHeight: "400px", overflowY: "auto" }}>
                <table className="entregas-table">
                  <thead>
                    <tr style={{ background: '#25316D', color: '#fff' }}>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th style={{ textAlign: "center" }}>Orden</th>
                      <th style={{ textAlign: "right" }}>Total Facturado</th>
                      <th style={{ textAlign: "right" }}>Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deudasDetalle.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty">No hay deudas activas registradas para esta sede.</td>
                      </tr>
                    ) : (
                      <>
                        {deudasDetalle.map((d, idx) => (
                          <tr key={d.creditoId || idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td>{d.fechaInicio || "—"}</td>
                            <td style={{ fontWeight: 500 }}>{d.cliente || "—"}</td>
                            <td style={{ textAlign: "center" }}>#{d.ordenId || "—"}</td>
                            <td style={{ textAlign: "right" }}>{fmtCOP(d.totalCredito)}</td>
                            <td style={{ textAlign: "right", color: "#c0392b", fontWeight: 600 }}>{fmtCOP(d.saldoPendiente)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#e6e8f0', fontWeight: 700 }}>
                          <td colSpan={3} style={{ textAlign: 'right' }}>Totales:</td>
                          <td style={{ textAlign: 'right' }}>{fmtCOP(deudasDetalle.reduce((sum, d) => sum + (Number(d.totalCredito) || 0), 0))}</td>
                          <td style={{ textAlign: 'right', color: '#c0392b' }}>{fmtCOP(deudasDetalle.reduce((sum, d) => sum + (Number(d.saldoPendiente) || 0), 0))}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="informes-modal-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-limpiar-filtros"
                  onClick={() =>
                    imprimirDetalleDeudasDocumento(
                      user?.sedeNombre,
                      deudasDetalle,
                      () => showError("No se pudo abrir la ventana de impresión. Permita ventanas emergentes.")
                    )
                  }
                  disabled={deudasDetalle.length === 0}
                >
                  Imprimir Cartera
                </button>
                <button
                  type="button"
                  className="btn-crear-entrega"
                  onClick={() => setModalDeudasOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}