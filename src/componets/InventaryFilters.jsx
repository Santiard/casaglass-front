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
        value={filters.sede || ""}
        onChange={(e) => setFilters({ ...filters, sede: e.target.value })}
      >
        <option value="">Todas las sedes</option>
        <option value="Insula">Insula</option>
        <option value="Centro">Centro</option>
        <option value="Patios">Patios</option>
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
