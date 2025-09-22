// src/components/VentasPorProductoChart.jsx
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#1e2753", "#344490", "#c2c2c3"]; 

export default function VentasPorProductoChart({ productos }) {
  const chartData = [
    { name: "Vidrio", value: productos.vidrio },
    { name: "Aluminio", value: productos.aluminio },
    { name: "Accesorios", value: productos.accesorios },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
      <PieChart width={300} height={250}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
