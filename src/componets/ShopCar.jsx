import { useState, useEffect } from "react";
import "../styles/ShopCar.css";
import { useToast } from "../context/ToastContext.jsx";
import flecha from "../assets/up.png";

export default function ShopCar({ productosCarrito, subtotal, total, limpiarCarrito }) {
  const { showSuccess } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  // Cargar productos desde props/localStorage
  useEffect(() => {
    const savedItems = JSON.parse(localStorage.getItem("shopItems")) || productosCarrito || [];
    setItems(savedItems);
  }, [productosCarrito]);

  // Guardar productos en localStorage
  useEffect(() => {
    localStorage.setItem("shopItems", JSON.stringify(items));
  }, [items]);

  // Abrir/cerrar carrito
  const toggleCar = () => setOpen(!open);

  return (
    <div className={`shopcar ${open ? "open" : ""}`}>
      {/* Pestaña azul */}
      <div className="tab" onClick={toggleCar}>
        <h3>Carrito</h3>
        <img src={flecha} alt="Toggle" className={open ? "rotated" : ""} />
      </div>

      {/* Contenido del carrito */}
      <div className="main">
        <h3>Orden de compra</h3>

        <div className="products">
          {items.length === 0 ? (
            <p>El carrito está vacío</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Nombre</th>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Código</th>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Color</th>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Cantidad</th>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Precio</th>
                  <th style={{ padding: '4px', border: '1px solid #ddd' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '4px', border: '1px solid #ddd' }}><strong>{item.nombre}</strong></td>
                    <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.codigo}</td>
                    <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>
                      {item.color && item.color !== 'N/A' ? (
                        <span className={`color-badge color-${item.color.toLowerCase().replace(/\s+/g, '-')}`}>{item.color}</span>
                      ) : (
                        <span style={{ color: '#bbb', fontStyle: 'italic', fontSize: '0.75rem' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>{item.cantidadVender}</td>
                    <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.precioUsado}</td>
                    <td style={{ padding: '4px', border: '1px solid #ddd' }}>{item.precioUsado * item.cantidadVender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="numbers">
          <label>Subtotal: {subtotal}</label>
          <label>Total: {total.toFixed(2)}</label>
          <button onClick={() => showSuccess("Venta finalizada!")}>Finalizar Venta</button>
          <button onClick={limpiarCarrito} style={{background: "#ff3333", marginTop: "0.5rem"}}>
            Vaciar Carrito
          </button>
        </div>
      </div>
    </div>
  );
}