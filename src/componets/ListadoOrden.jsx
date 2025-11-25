import { useState, useEffect } from "react";
import OrdenModal from "../modals/OrdenModal.jsx";
import OrdenImprimirModal from "../modals/OrdenImprimirModal.jsx";
import "../styles/ListadoOrden.css";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ListadoOrden({ productosCarrito, subtotal, total, limpiarCarrito, eliminarProducto, cortesPendientes }) {
  const { showError } = useToast();
  const [items, setItems] = useState([]);
  const [isFacturarOpen, setIsFacturarOpen] = useState(false);
  const [isImprimirOpen, setIsImprimirOpen] = useState(false);
  const { user, sedeId, sede } = useAuth();
  // Cargar productos desde props
  useEffect(() => {
    setItems(productosCarrito || []);
  }, [productosCarrito]);

  const handleImprimirCotizacion = () => {
    if (items.length === 0) {
      showError("No hay productos en la cotización para imprimir");
      return;
    }
    
    // Abrir modal de impresión con formato de cotización
    setIsImprimirOpen(true);
  };

  // Crear objeto orden temporal para el modal de impresión
  const ordenTemporal = {
    id: null,
    numero: "COT-" + Date.now(),
    fecha: new Date().toISOString(),
    obra: "",
    venta: false,
    credito: false,
    estado: "ACTIVA",
    cliente: { nombre: "Cliente" }, // Se puede mejorar después
    sede: { nombre: sede || "Sede" },
    trabajador: { nombre: user?.nombre || "Trabajador" },
    items: items.map(item => ({
      id: null,
      cantidad: item.cantidadVender || 0,
      precioUnitario: item.precioUsado || 0,
      totalLinea: (item.precioUsado || 0) * (item.cantidadVender || 0),
      descripcion: "",
      producto: {
        codigo: item.codigo || "",
        nombre: item.nombre || "",
        color: item.color || "",
        tipo: item.tipo || ""
      }
    }))
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
            <span>${total ? ((total * 0.81)?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : 0}</span>
          </div>
          <div className="iva">
            <span>IVA (19%):</span>
            <span>${total ? ((total * 0.19)?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : 0}</span>
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
            onClick={handleImprimirCotizacion}
            disabled={items.length === 0}
          >
            Imprimir Cotización
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
          limpiarCarrito();
          setIsFacturarOpen(false);
        }}
      />

      <OrdenImprimirModal
        isOpen={isImprimirOpen}
        orden={ordenTemporal}
        onClose={() => setIsImprimirOpen(false)}
      />

    </div>
  );
}