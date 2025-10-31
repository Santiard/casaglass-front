import {
  LineChart,
  Line,
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
  accent: "#c2c2c3",
};

export default function VentasMensualesChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          formatter={(value) => [`$${Number(value).toLocaleString('es-CO')}`, 'Ventas']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="ventas" 
          stroke={COLORS.primary} 
          strokeWidth={2}
          name="Ventas"
          dot={{ fill: COLORS.primary, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

