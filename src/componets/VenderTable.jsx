import "../styles/VenderTable.css"
import NumberInput from "./NumberInput";

export default function VenderTable ({ data = [] }) {
  return (
    <div className="vender-table-container">
      <table className="vender-table">
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
            <th>Cantidad Vender</th>
            <th>Agregar</th>
           
            
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
                    <NumberInput min={0} max={999} step={1} initial={0}/>
                    
                  </td>
                  <td>
                    <button className="btn-edit" >Agregar</button>
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
