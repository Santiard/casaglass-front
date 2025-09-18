import "../styles/InventoryTable.css"
export default function InventoryTable({ data = [] }) {
  return (
    <div className="inventory-table-container">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Cantidad Insula</th>
            <th>Cantidad Centro</th>
            <th>Cantidad Patios</th>
            <th>Precio</th>
            <th>Precio Especial</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="9">No hay registros</td>
            </tr>
          ) : (
            data.map((item) => {
              const cantidadInsula = Number(item.cantidadInsula || 0);
              const cantidadCentro = Number(item.cantidadCentro || 0);
              const cantidadPatios = Number(item.cantidadPatios || 0);
              const cantidadTotal =
                item.cantidad != null
                  ? Number(item.cantidad)
                  : cantidadInsula + cantidadCentro + cantidadPatios;

              return (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.categoria}</td>
                  <td>{cantidadTotal}</td>
                  <td>{cantidadInsula}</td>
                  <td>{cantidadCentro}</td>
                  <td>{cantidadPatios}</td>
                  <td>{item.precio != null ? item.precio : "-"}</td>
                  <td>{item.precioEspecial != null ? item.precioEspecial : "-"}</td>
                  <td>
                    <button className="btn-edit">Editar</button>
                    <button className="btn-delete">Eliminar</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
