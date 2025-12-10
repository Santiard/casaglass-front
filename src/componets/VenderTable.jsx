import "../styles/Table.css";
import { useState } from "react";
import CortarModal from "../modals/CortarModal.jsx";

export default function VenderTable({ data = [], onAgregarProducto, onActualizarPrecio, onCortarProducto }) {
  // Guardamos las cantidades locales por producto
  const [cantidades, setCantidades] = useState({});
  
  // Estado para el producto seleccionado (para mostrar descripción)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Estado para el modal de corte
  const [modalCorte, setModalCorte] = useState({
    isOpen: false,
    producto: null
  });

  const handleCantidadChange = (id, valor) => {
    setCantidades(prev => ({ 
      ...prev, 
      [id]: valor === "" ? "" : Number(valor) 
    }));
  };

  const handleAbrirModalCorte = (producto) => {
    setModalCorte({
      isOpen: true,
      producto: producto
    });
  };

  const handleCerrarModalCorte = () => {
    setModalCorte({
      isOpen: false,
      producto: null
    });
  };

  const handleCortar = async (corteParaVender, corteSobrante) => {
    
    if (onCortarProducto) {
      await onCortarProducto(corteParaVender, corteSobrante);
    }
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
            <th>Cantidad Vender</th>
            <th>Precio a usar</th>
            <th>Acción</th>
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
                <tr 
                  key={item.id}
                  className={productoSeleccionado?.id === item.id ? "row-selected" : ""}
                  onClick={() => setProductoSeleccionado(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{item.nombre}</td>
                  <td>{item.categoria}</td>
                  <td>{cantidadTotal}</td>
                  <td>{cantidadInsula}</td>
                  <td>{cantidadCentro}</td>
                  <td>{cantidadPatios}</td>
                  <td>{item.precio != null ? item.precio : "-"}</td>
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
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        className="btn-edit"
                        onClick={() =>
                          onAgregarProducto(item, cantidades[item.id] ?? 0)
                        }
                      >
                        Agregar
                      </button>
                      {item.tipo === "PERFIL" && (
                        <button
                          className="btn"
                          onClick={() => handleAbrirModalCorte(item)}
                        >
                          Cortar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      
      {/* Pie de página con descripción */}
      <div className="table-description-footer">
        <div className="table-description-content">
          <span className="table-description-label">Descripción: </span>
          <span className="table-description-text">
            {productoSeleccionado?.descripcion || "Seleccione un producto para ver su descripción"}
          </span>
        </div>
      </div>
      
      {/* Modal de Corte */}
      <CortarModal
        isOpen={modalCorte.isOpen}
        onClose={handleCerrarModalCorte}
        producto={modalCorte.producto}
        onCortar={handleCortar}
      />
    </div>
  );
}