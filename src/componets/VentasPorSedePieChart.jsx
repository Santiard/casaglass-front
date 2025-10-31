import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = {
  insula: "#344490",
  centro: "#1e2753",
  patios: "#c2c2c3",
};

const getSedeColor = (nombreSede) => {
  if (nombreSede?.toLowerCase().includes('insula')) return COLORS.insula;
  if (nombreSede?.toLowerCase().includes('centro')) return COLORS.centro;
  if (nombreSede?.toLowerCase().includes('patios')) return COLORS.patios;
  return COLORS.insula;
};

export default function VentasPorSedePieChart({ data = [] }) {
  const chartData = data.map(item => ({
    name: item.nombreSede?.replace('Sede ', '') || 'Sede',
    value: item.montoTotal || 0,
    cantidad: item.cantidadOrdenes || 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '8px'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{data.name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Ventas: ${Number(data.value).toLocaleString('es-CO')}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Órdenes: {data.payload.cantidad}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => {
            const color = getSedeColor(data[index]?.nombreSede);
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

