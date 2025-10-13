import "../styles/CategorySidebar.css";

export default function CategorySidebar({ categories = [], selectedId, onSelect }) {
  return (
    <div>
      <h4 style={{ marginBottom: 8 }}>Categorías</h4>
      <div className="category-list">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-item ${selectedId === cat.id ? "active" : ""}`}
            onClick={() => onSelect(cat.id)}
            type="button"
          >
            {cat.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
