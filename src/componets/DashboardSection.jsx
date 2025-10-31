import "../styles/DashboardSection.css";

export default function DashboardSection({ title, description, children, className = "" }) {
  return (
    <section className={`dashboard-section ${className}`}>
      <div className="dashboard-section-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="dashboard-section-content">
        {children}
      </div>
    </section>
  );
}

