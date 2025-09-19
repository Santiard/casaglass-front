import { useState, useEffect } from "react";
import "../styles/ShopCar.css";
import flecha from "../assets/up.png";

export default function ShopCar({ productosCarrito, subtotal, total }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  // Cargar productos desde localStorage al iniciar
  useEffect(() => {
    const savedItems = JSON.parse(localStorage.getItem("shopItems")) || productosCarrito || [];
    setItems(savedItems);
  }, [productosCarrito]);

  // Guardar productos en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem("shopItems", JSON.stringify(items));
  }, [items]);

  // Función para abrir/cerrar el carrito
  const toggleCar = () => setOpen(!open);

  return (
    <div className={`shopcar ${open ? "open" : ""}`}>
      {/* Pestaña azul con flecha */}
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
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="numbers">
          <label>Subtotal: {subtotal}</label>
          <label>Total: {total}</label>
          <button>Finalizar Venta</button>
        </div>
      </div>
    </div>
  );
}