import "../styles/Table.css";
import { useState } from "react";

export default function VenderTable({ data = [], onAgregarProducto, onActualizarPrecio }) {
  // Guardamos las cantidades locales por producto
  const [cantidades, setCantidades] = useState({});

  const handleCantidadChange = (id, valor) => {
    setCantidades(prev => ({ 
      ...prev, 
      [id]: valor === "" ? "" : Number(valor) 
    }));
  };

  return (
    <div className="table-container">
      <table className="table">
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
            <th>Precio a usar</th>
            <th>Agregar</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="11">No hay registros</td>
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

              if (!item.selectedPriceType) item.selectedPriceType = "precio";

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
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step={1}
                      value={cantidades[item.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => handleCantidadChange(item.id, e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={item.selectedPriceType}
                      onChange={(e) => {
                        const tipo = e.target.value;
                        item.selectedPriceType = tipo;
                        if (onActualizarPrecio) {
                          onActualizarPrecio(item.id, item[tipo]);
                        }
                      }}
                    >
                      <option value="precio">Precio normal ({item.precio})</option>
                      {item.precioEspecial != null && (
                        <option value="precioEspecial">
                          Precio especial ({item.precioEspecial})
                        </option>
                      )}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() =>
                        onAgregarProducto(item, cantidades[item.id] ?? 0)
                      }
                    >
                      Agregar
                    </button>
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