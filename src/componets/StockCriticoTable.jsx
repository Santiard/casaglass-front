import "../styles/StockCriticoTable.css";

export default function StockCriticoTable({ productos = [] }) {
  if (!productos || productos.length === 0) {
    return (
      <div className="stock-critico-empty">
        <p>No hay productos con stock crítico</p>
      </div>
    );
  }

  const getStockStatus = (actual, minimo) => {
    const porcentaje = (actual / minimo) * 100;
    if (porcentaje <= 20) return { class: "critico", label: "Crítico" };
    if (porcentaje <= 50) return { class: "bajo", label: "Bajo" };
    return { class: "normal", label: "Normal" };
  };

  return (
    <div className="stock-critico-table">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Código</th>
            <th>Color</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => {
            const status = getStockStatus(producto.stockActual || 0, producto.stockMinimo || 1);
            return (
              <tr key={producto.id}>
                <td>{producto.nombre}</td>
                <td>{producto.codigo}</td>
                <td>{producto.color ? (
                  <span className={`color-badge color-${(producto.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}>{producto.color}</span>
                ) : (
                  <span style={{ color: '#bbb', fontStyle: 'italic' }}>N/A</span>
                )}</td>
                <td>{producto.stockActual || 0}</td>
                <td>{producto.stockMinimo || 0}</td>
                <td>
                  <span className={`stock-badge ${status.class}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

