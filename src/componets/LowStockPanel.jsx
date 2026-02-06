export default function LowStockPanel({ items = [] }){
return (
<section className="panel">
<header className="panel__header">
<h3>Productos con stock bajo</h3>
<span className="badge">{items.length}</span>
</header>
<div className="panel__body low-stock-panel-body">
{items.length === 0 ? (
<div className="empty">Sin alertas 🎉</div>
) : (
<div className="low-stock-table-wrapper">
<table className="table">
<thead>
<tr>
<th>Código</th>
<th>Nombre</th>
<th>Color</th>
<th>Stock</th>
<th>Reorden</th>
<th>Estado</th>
</tr>
</thead>
<tbody>
{items.map((p) => (
<tr key={p.codigo || p.sku} className={
  p.estado === "CRÍTICO" || (p.stock && p.minimo && p.stock <= p.minimo) ? "danger" : ""
}>
<td>{p.codigo || p.sku || "-"}</td>
<td>{p.nombre || "-"}</td>
<td>
  {p.color ? (
    <span className={`color-badge color-${(p.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}
      style={{ display: 'inline-block', minWidth: 48, textAlign: 'center', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
    >
      {p.color}
    </span>
  ) : (
    <span style={{ color: '#bbb', fontStyle: 'italic' }}>N/A</span>
  )}
</td>
<td>{p.stockActual || p.stock || 0}</td>
<td>{p.nivelReorden || p.minimo || 0}</td>
<td>
  <span className={`badge ${
    p.estado === "CRÍTICO" ? "error" : 
    p.estado === "BAJO" ? "warning" : "ok"
  }`}>
    {p.estado || (
      (p.stock && p.minimo && p.stock <= p.minimo) ? "BAJO" : "OK"
    )}
  </span>
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</div>
</section>
);
}