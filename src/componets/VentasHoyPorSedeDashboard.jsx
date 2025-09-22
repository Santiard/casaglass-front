import VentasHoyDashboard from "./VentasHoyDashboard.jsx"
import VentasPorSedeChart from "./VentasPorSedeChart.jsx";
import VentasPorProductoChart from "./VentasPorProductoChart";


import "../styles/VentasHoyPorSedeDashboard.css";

export default function VentasHoyPorSedeDashboard(){
   

   const data = {
  insula: { 
    nombre: "Insula", 
    totalventas: 150000, 
    numeroVentas: 23,
    productos: {
      vidrio: 70000,
      aluminio: 50000,
      accesorios: 30000
    }
  },
  centro: { 
    nombre: "Centro", 
    totalventas: 98000, 
    numeroVentas: 14,
    productos: {
      vidrio: 40000,
      aluminio: 35000,
      accesorios: 23000
    }
  },
  patios: { 
    nombre: "Patios", 
    totalventas: 123000, 
    numeroVentas: 18,
    productos: {
      vidrio: 60000,
      aluminio: 40000,
      accesorios: 23000
    }
  }
};
   
  const chartData = [
    { sede: "Insula", totalventas: data.insula.totalventas },
    { sede: "Centro", totalventas: data.centro.totalventas },
    { sede: "Patios", totalventas: data.patios.totalventas },
  ];
  const globalProductos = {
  vidrio: data.insula.productos.vidrio + data.centro.productos.vidrio + data.patios.productos.vidrio,
  aluminio: data.insula.productos.aluminio + data.centro.productos.aluminio + data.patios.productos.aluminio,
  accesorios: data.insula.productos.accesorios + data.centro.productos.accesorios + data.patios.productos.accesorios,
};
   
    return(
        <div>
        <h3>Analisis de Ventas Hoy</h3> 
        <div className="ventasHoySedes">
      <div className="sedeCInsula">
        <VentasHoyDashboard sede={data.insula} />
      </div>

      <div className="sedeCentro">
        <VentasHoyDashboard sede={data.centro} />
      </div>

      <div className="sedePatios">
        <VentasHoyDashboard sede={data.patios} />
      </div>
    </div>
    <div className="Contenedor">
    <h3>Comparativa de ventas entre sedes hoy</h3>
    <div className="comparativas">
    <VentasPorSedeChart chartData={chartData} />
     <VentasPorProductoChart productos={globalProductos} />
    </div>
    </div>
    </div>
    );
}