import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function VentasPorSedeChart({ chartData }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
      <BarChart width={500} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sede" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="totalventas" fill="#344490" name="Total Ventas" />
      </BarChart>
    </div>
  );
}