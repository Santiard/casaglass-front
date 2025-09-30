export default function MovimientosPanel({ entregasPendientes = [] }){
return (
<section className="panel">
<header className="panel__header">
<h3>Movimientos programados</h3>
<span className="badge warning">{entregasPendientes.length}</span>
</header>
<div className="panel__body list">
{entregasPendientes.length === 0 ? (
<div className="empty">No hay movimientos pendientes</div>
) : (
<ul>
{entregasPendientes.map((m) => (
<li key={m.id}>
<div className="list__title">{m.tipo} · {m.referencia}</div>
<div className="list__meta">Programado para {new Date(m.fechaEntrega).toLocaleString("es-CO")} — {m.montoEntregar ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(m.montoEntregar) : "Sin monto"}</div>
</li>
))}
</ul>
)}
</div>
</section>
);
}