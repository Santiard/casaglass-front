import { useState, useEffect } from "react";
import OrdenModal from "../modals/OrdenModal.jsx";
import "../styles/ListadoOrden.css";
import { useAuth } from "../context/AuthContext.jsx";

export default function ListadoOrden({ productosCarrito, subtotal, total, limpiarCarrito, eliminarProducto, cortesPendientes }) {
  const [items, setItems] = useState([]);
  const [isFacturarOpen, setIsFacturarOpen] = useState(false);
  const { user, sedeId, sede } = useAuth();
  // Cargar productos desde props
  useEffect(() => {
    setItems(productosCarrito || []);
  }, [productosCarrito]);

  const handleImprimirOrden = () => {
    if (items.length === 0) {
      alert("No hay productos en la orden para imprimir");
      return;
    }
    
    // Aquí iría la lógica para imprimir
    window.print();
  };

  const eliminarProductoLocal = (index) => {
    eliminarProducto(index);
  };

  return (
    <div className="listado-orden">
      <div className="orden-header">
        <h3>Listado de Orden</h3>
        <span className="item-count">({items.length} productos)</span>
      </div>

      <div className="orden-content">
        {items.length === 0 ? (
          <div className="empty-orden">
            <p>No hay productos agregados</p>
            <small>Agrega productos desde la tabla para crear una orden</small>
          </div>
        ) : (
          <div className="productos-lista">
            {items.map((item, index) => (
              <div key={index} className="producto-item">
                <div className="producto-info">
                  <h4>{item.nombre}</h4>
                  <p className="codigo">Código: {item.codigo}</p>
                  <div className="cantidad-precio">
                    <span>Cantidad: {item.cantidadVender}</span>
                    <span>Precio: ${item.precioUsado?.toLocaleString()}</span>
                  </div>
                  <div className="subtotal-item">
                    Subtotal: ${(item.precioUsado * item.cantidadVender)?.toLocaleString()}
                  </div>
                </div>
                <button 
                  className="btn-eliminar"
                  onClick={() => eliminarProductoLocal(index)}
                  title="Eliminar producto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="orden-resumen">
        <div className="totales">
          <div className="subtotal">
            <span>Subtotal (sin IVA):</span>
            <span>${subtotal?.toLocaleString()}</span>
          </div>
          <div className="iva">
            <span>IVA (19%):</span>
            <span>${total ? ((total * 0.19 / 1.19)?.toLocaleString()) : 0}</span>
          </div>
          <div className="total">
            <span>Total (IVA incluido):</span>
            <span>${total?.toLocaleString()}</span>
          </div>
        </div>

        <div className="orden-acciones">
          <button 
            className="btn-facturar"
            onClick={() => setIsFacturarOpen(true)}
            disabled={items.length === 0}
          >
            Crear Orden
          </button>
          <button 
            className="btn-imprimir"
            onClick={handleImprimirOrden}
            disabled={items.length === 0}
          >
            Imprimir Orden
          </button>
        </div>
      </div>

      <OrdenModal
        isOpen={isFacturarOpen}
        onClose={() => setIsFacturarOpen(false)}
        orden={null}
        productosCarrito={items}
        defaultTrabajadorId={user?.id}
        defaultTrabajadorNombre={user?.nombre}
        defaultSedeId={sedeId}
        defaultSedeNombre={user?.sedeNombre || sede}
        cortesPendientes={cortesPendientes}
        onSave={(orden) => {
          console.log("Orden creada:", orden);
          limpiarCarrito();
          setIsFacturarOpen(false);
        }}
      />

    </div>
  );
}