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
<td>{p.codigo || p.sku}</td>
<td>{p.nombre}</td>
<td>{p.stockActual || p.stock}</td>
<td>{p.nivelReorden || p.minimo}</td>
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