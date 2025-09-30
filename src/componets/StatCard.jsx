// File: src/componets/StatCard.jsx
export default function StatCard({ title, value, subtitle, icon, status = "", loading = false, onClick }){
  return (
    <div className={`stat-card ${status}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="stat-card__icon" aria-hidden>{icon}</div>
      <div className="stat-card__content">
        <div className="stat-card__title">{title}</div>
        <div className="stat-card__value">{loading ? "…" : value}</div>
        <div className="stat-card__subtitle">{subtitle}</div>
      </div>
    </div>
  );
}