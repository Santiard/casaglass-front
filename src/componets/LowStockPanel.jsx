export default function LowStockPanel({ items = [] }){
return (
<section className="panel">
<header className="panel__header">
<h3>Productos con stock bajo</h3>
<span className="badge">{items.length}</span>
</header>
<div className="panel__body">
{items.length === 0 ? (
<div className="empty">Sin alertas 🎉</div>
) : (
<table className="table">
<thead>
<tr>
<th>SKU</th>
<th>Nombre</th>
<th>Stock</th>
<th>Reorden</th>
</tr>
</thead>
<tbody>
{items.map((p) => (
<tr key={p.sku} className={p.stock <= p.minimo ? "danger" : ""}>
<td>{p.sku}</td>
<td>{p.nombre}</td>
<td>{p.stock}</td>
<td>{p.minimo}</td>
</tr>
))}
</tbody>
</table>
)}
</div>
</section>
);
}