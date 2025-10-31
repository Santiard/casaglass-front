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
  primary: "#344490",
  secondary: "#1e2753",
};

export default function TopProductosChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={data} 
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          type="number"
          stroke="#6b7280"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`}
        />
        <YAxis 
          type="category"
          dataKey="nombre"
          stroke="#6b7280"
          style={{ fontSize: "12px" }}
          width={90}
        />
        <Tooltip 
          formatter={(value) => [`$${Number(value).toLocaleString('es-CO')}`, 'Ventas']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
        />
        <Legend />
        <Bar 
          dataKey="ventas" 
          fill={COLORS.primary}
          name="Total Ventas"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

