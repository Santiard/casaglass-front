import "../styles/KPICard.css";

export default function KPICard({ title, value, subtitle, icon, trend, color = "var(--color-light-blue)" }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-header">
        <h4>{title}</h4>
        {icon && <span className="kpi-icon">{icon}</span>}
      </div>
      <div className="kpi-value" style={{ color }}>
        {value}
      </div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`kpi-trend ${trend.type}`}>
          <span>{trend.value}</span>
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

