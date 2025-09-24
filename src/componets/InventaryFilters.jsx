import add from "../assets/add.png";
import "../styles/InventaryFilters.css";
export default function InventoryFilters({ filters = {}, setFilters, onAddProduct }) {
  return (
    <div className="filters-toolbar">
      <input
        className="filter-input"
        type="text"
        placeholder="Buscar por nombre..."
        value={filters.search || ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      <select
        className="filter-select"
        value={filters.category || ""}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
      >
        <option value="">Todas las categorías</option>
        <option value="Vidrios">Vidrios</option>
        <option value="Aluminio">Aluminio</option>
        <option value="Accesorios">Accesorios</option>
      </select>

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

      <select
        className="filter-select"
        value={filters.status || ""}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">Todos los estados</option>
        <option value="Disponible">Disponible</option>
        <option value="Agotado">Agotado</option>
      </select>

      <button className="btn-add" onClick={onAddProduct}>
      <img src={add} className="iconButton"/>
      Agregar producto
      </button>
    </div>
  );
}
