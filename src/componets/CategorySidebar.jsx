import "../styles/CategorySidebar.css";

export default function CategorySidebar({ categories = [], selected, onSelect }) {
  return (
    <div>
      <h4 style={{ marginBottom: 8 }}>Categorías</h4>
      <div className="category-list">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-item ${selected === cat ? "active" : ""}`}
            onClick={() => onSelect(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
