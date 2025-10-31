import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  ingresos: "#10b981",
  costos: "#ef4444",
};

export default function IngresosVsCostosChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart 
        data={data} 
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.ingresos} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.ingresos} stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.costos} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.costos} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="periodo" 
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
        <Area 
          type="monotone" 
          dataKey="ingresos" 
          stroke={COLORS.ingresos} 
          fillOpacity={1} 
          fill="url(#colorIngresos)"
          name="Ingresos"
        />
        <Area 
          type="monotone" 
          dataKey="costos" 
          stroke={COLORS.costos} 
          fillOpacity={1} 
          fill="url(#colorCostos)"
          name="Costos"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

