
import "../styles/VentasHoyDashboard.css";
import VentasPorProductoChart from "./VentasPorProductoChart";

export default function VentasHoyDashboard ({sede}){


    return ( <div className="main">
        <div className="numeros">
        <h3>Ventas Hoy {sede.nombre}:</h3>
        <p>Total ventas:  {sede.totalventas}</p>
        <p>Numero de ventas: {sede.numeroVentas}</p>
        <p>Ticket promedio: {sede.totalventas/sede.numeroVentas}</p>
        </div>
        <div className="graficos">
          <VentasPorProductoChart productos={sede.productos}/>
        </div>
    </div>        
    );
}