import "../styles/ShopCar.css";
import flecha from "../assets/up.png"
export default function ShopCar({productosCarrito,subtotal,total}){

    return(
        <div className="main">
            <div className="barra">
            <h3>Orden de compra</h3>
            <img src={flecha}/>
            </div>
            
            <div className="products">
            
            <ul>
                {productosCarrito.map((item,index) =>(
                    <li key={index}>{item}</li>
                ))}
            </ul>
            </div>
            <div className="numbers">
            <label>Subtotal: {subtotal}</label>
            <label>Total: {total}</label>
            <button>Finalizar Venta</button>
            </div>
        </div>
    );
}