
import { useEffect, useMemo, useState } from "react";
import StatCard from "../componets/StatCard.jsx";
import LowStockPanel from "../componets/LowStockPanel.jsx";
import MovimientosPanel from "../componets/MovimientosPanel.jsx";
import {
  HOME_SEDE,
  HOME_VENTAS_HOY,
  HOME_ENTREGAS,
  HOME_VENTAS_DESDE_ULTIMA,
  HOME_STOCK_ALERTS
} from "../mocks/mocks_home.js";
import "../styles/HomeWidgets.css";

export default function HomePage(){
  const [loading, setLoading] = useState(true);
  const [sede, setSede] = useState(HOME_SEDE);
  const [ventasHoy, setVentasHoy] = useState(HOME_VENTAS_HOY);
  const [entregas, setEntregas] = useState(HOME_ENTREGAS);
  const [ventasDesdeUltima, setVentasDesdeUltima] = useState(HOME_VENTAS_DESDE_ULTIMA);
  const [stockAlerts, setStockAlerts] = useState(HOME_STOCK_ALERTS);

  useEffect(() => {
    // Simula carga inicial (en futuro: reemplazar por fetch/axios)
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const ultimaEntrega = useMemo(() => {
    const ordenadas = [...entregas].sort((a,b) => new Date(b.fechaEntrega) - new Date(a.fechaEntrega));
    return ordenadas.find(e => e.estado === "ENTREGADA") || null;
  }, [entregas]);

  const faltanteDesdeUltima = useMemo(() => {
    // Definición mock: ventas generadas después de la última entrega menos dinero entregado después de esa fecha
    const fechaRef = ultimaEntrega ? new Date(ultimaEntrega.fechaEntrega) : null;
    const ventasPosteriores = ventasDesdeUltima
      .filter(v => !fechaRef || new Date(v.fecha) > fechaRef)
      .reduce((acc, v) => acc + Number(v.total), 0);
    const dineroEntregadoPosterior = entregas
      .filter(e => (!fechaRef || new Date(e.fechaEntrega) > fechaRef) && e.estado === "ENTREGADA")
      .reduce((acc, e) => acc + Number(e.montoEntregado || 0), 0);
    return ventasPosteriores - dineroEntregadoPosterior;
  }, [ventasDesdeUltima, entregas, ultimaEntrega]);

  const pendientes = useMemo(() => entregas.filter(e => e.estado === "PENDIENTE"), [entregas]);

  return (
    <div className="home-page">
      <div className="rowSuperior home-grid">
        <StatCard
          title="Sede"
          value={sede?.nombre || "-"}
          subtitle={`Responsable: ${sede?.responsable || "—"}`}
          icon="🏢"
          loading={loading}
        />
        <StatCard
          title="Ventas de hoy"
          value={ventasHoy?.cantidad ?? 0}
          subtitle={new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(ventasHoy?.total ?? 0)}
          icon="🧾"
          loading={loading}
          status="ok"
        />
        <StatCard
          title="Faltante desde última entrega"
          value={new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.max(0, faltanteDesdeUltima))}
          subtitle={ultimaEntrega ? `Última entrega: ${new Date(ultimaEntrega.fechaEntrega).toLocaleString("es-CO")}` : "Sin entregas previas"}
          icon="💸"
          loading={loading}
          status={faltanteDesdeUltima > 0 ? (faltanteDesdeUltima > 500000 ? "error" : "warning") : "ok"}
        />
        <StatCard
          title="Movimientos programados"
          value={pendientes.length}
          subtitle="Pendientes por confirmar"
          icon="📦"
          loading={loading}
          status={pendientes.length > 0 ? "warning" : "ok"}
        />
        <StatCard
          title="Alertas de stock"
          value={stockAlerts.length}
          subtitle="Productos bajos en inventario"
          icon="⚠️"
          loading={loading}
          status={stockAlerts.length ? "warning" : "ok"}
        />
      </div>

      <div className="rowInferior home-grid-2cols">
        <LowStockPanel items={stockAlerts} />
        <MovimientosPanel entregasPendientes={pendientes} />
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