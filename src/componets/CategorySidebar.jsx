import "../styles/CategorySidebar.css";
import add from "../assets/add.png";

export default function CategorySidebar({ categories = [], selectedId, onSelect, onAddCategory }) {
  return (
    <div>
      <h4 style={{ marginBottom: 8 }}>Categorías</h4>
      {onAddCategory && (
        <button
          className="btn-add-category"
          onClick={onAddCategory}
          type="button"
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "8px",
            backgroundColor: "var(--color-light-blue)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "background-color 0.2s ease"
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "var(--color-dark-blue)"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "var(--color-light-blue)"}
        >
          <img src={add} style={{ width: "16px", height: "16px", filter: "brightness(0) invert(1)" }} alt="Agregar" />
          Nueva categoría
        </button>
      )}
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
