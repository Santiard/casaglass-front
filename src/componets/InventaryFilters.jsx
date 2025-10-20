import add from "../assets/add.png";
import "../styles/InventaryFilters.css";
import ViewSwitcher from "./ViewSwitcher";
export default function InventoryFilters({ filters = {}, setFilters, onAddProduct,view,        // 👈 importante
  setView, }) {
  
  return (
    <div className="filters-toolbar">
      <ViewSwitcher value={view} onChange={setView} />
      <input
        className="filter-input"
        type="text"
        placeholder="Buscar por nombre..."
        value={filters.search || ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      <select
        className="filter-select"
        value={filters.color || ""}
        onChange={(e) => setFilters({ ...filters, color: e.target.value })}
      >
        <option value="">Todos los colores</option>
        <option value="MATE">MATE</option>
        <option value="BLANCO">BLANCO</option>
        <option value="NEGRO">NEGRO</option>
        <option value="BRONCE">BRONCE</option>
        <option value="NATURAL">NATURAL</option>
        <option value="NA">NA</option>
      </select>

      {onAddProduct && (
        <button className="btn-add" onClick={onAddProduct}>
          <img src={add} className="iconButton"/>
          Agregar producto
        </button>
      )}

    </div>
  );
}
