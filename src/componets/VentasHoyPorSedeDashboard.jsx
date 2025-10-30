import { useEffect, useMemo, useState } from "react";
import VentasPorSedeChart from "./VentasPorSedeChart.jsx";
import "../styles/VentasHoyPorSedeDashboard.css";
import { DashboardService } from "../services/DashboardService.js";

function fmt(n){ return `$${Number(n||0).toLocaleString('es-CO')}`; }
function today(){ return new Date().toISOString().slice(0,10); }

export default function VentasHoyPorSedeDashboard(){
  const [sedesStats, setSedesStats] = useState([]); // [{sede, ordenes, monto}]
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const desde = useMemo(() => today(), []);
  const hasta = useMemo(() => today(), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await DashboardService.getVentasPorSede(desde, hasta);
        setSedesStats(Array.isArray(data?.sedes) ? data.sedes : []);
        setErrorMsg("");
      } catch (e) {
        console.error("Error cargando ventas por sede", e);
        const backendMsg = e?.response?.data?.message || e?.message || "Error cargando ventas";
        setErrorMsg(String(backendMsg));
        setSedesStats([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [desde, hasta]);

  const chartData = useMemo(() => (sedesStats || []).map(s => ({ sede: s.sede, totalventas: s.monto })), [sedesStats]);

  return (
    <div>
      <h3>Analisis de Ventas (Hoy)</h3>
      {errorMsg && (
        <div style={{
          background:'#FEF2F2', border:'1px solid #FCA5A5', color:'#991B1B',
          padding:'0.5rem', borderRadius:'0.5rem', marginBottom:'0.75rem'
        }}>
          {errorMsg}
        </div>
      )}
      <div className="ventasHoySedes">
        {(sedesStats || []).map((s) => (
          <div key={s.sedeId} className="sedeCard">
            <h4>{s.sede}</h4>
            <p>Ventas: {fmt(s.monto)}</p>
            <p>Órdenes: {s.ordenes}</p>
          </div>
        ))}
        {!loading && (!sedesStats || sedesStats.length === 0) && (
          <div className="sedeCard"><p>Sin datos para hoy</p></div>
        )}
      </div>

      <div className="Contenedor">
        <h3>Comparativa de ventas entre sedes (Hoy)</h3>
        <div className="comparativas">
          <VentasPorSedeChart chartData={chartData} />
        </div>
      </div>
    </div>
  );
}