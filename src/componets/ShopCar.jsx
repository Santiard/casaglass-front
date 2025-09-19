import { useState, useEffect } from "react";
import "../styles/ShopCar.css";
import flecha from "../assets/up.png";

export default function ShopCar({ productosCarrito, subtotal, total, limpiarCarrito }) {
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
            <ul>
              {items.map((item, index) => (
                <li key={index}>
                  <strong>{item.nombre}</strong> - Cantidad: {item.cantidadVender} - Precio: {item.precioUsado} - Subtotal:{" "}
                  {item.precioUsado * item.cantidadVender}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="numbers">
          <label>Subtotal: {subtotal}</label>
          <label>Total: {total.toFixed(2)}</label>
          <button onClick={() => alert("Venta finalizada!")}>Finalizar Venta</button>
          <button onClick={limpiarCarrito} style={{background: "#ff3333", marginTop: "0.5rem"}}>
            Vaciar Carrito
          </button>
        </div>
      </div>
    </div>
  );
}