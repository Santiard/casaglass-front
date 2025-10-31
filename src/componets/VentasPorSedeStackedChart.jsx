import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  insula: "#344490",
  centro: "#1e2753",
  patios: "#c2c2c3",
};

export default function VentasPorSedeStackedChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={data} 
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="mes" 
          stroke="#6b7280"
          style={{ fontSize: "12px" }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`}
        />
        <Tooltip 
          formatter={(value) => [`$${Number(value).toLocaleString('es-CO')}`, '']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
        />
        <Legend />
        <Bar dataKey="insula" stackId="a" fill={COLORS.insula} name="Insula" />
        <Bar dataKey="centro" stackId="a" fill={COLORS.centro} name="Centro" />
        <Bar dataKey="patios" stackId="a" fill={COLORS.patios} name="Patios" />
      </BarChart>
    </ResponsiveContainer>
  );
}

