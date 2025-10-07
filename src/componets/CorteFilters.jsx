// src/componets/CorteFilters.jsx
import add from "../assets/add.png";
import ViewSwitcher from "./ViewSwitcher.jsx";
import "../styles/InventaryFilters.css";

export default function CorteFilters({
  filters = {},
  setFilters,
  onAdd,
  view,        // 👈 recibido desde InventoryPage
  setView,     // 👈 recibido desde InventoryPage
}) {
  return (
    <div className="filters-toolbar">
      {/* 🔹 Switch Producto / Corte dentro de la barra */}
      <ViewSwitcher value={view} onChange={setView} />

      {/* 🔹 Búsqueda */}
      <input
        className="filter-input"
        type="text"
        placeholder="Buscar por código, nombre, color u observación…"
        value={filters.search || ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      {/* 🔹 Sede */}
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

      {/* 🔹 Estado */}
      <select
        className="filter-select"
        value={filters.status || ""}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">Todos los estados</option>
        <option value="Disponible">Disponible</option>
        <option value="Agotado">Agotado</option>
      </select>

      {/* 🔹 Rangos (largo y precio) */}
      <input
        className="filter-input"
        style={{ maxWidth: 120 }}
        type="number"
        min="0"
        step="0.01"
        placeholder="Largo mín."
        value={filters.largoMin || ""}
        onChange={(e) => setFilters({ ...filters, largoMin: e.target.value })}
      />
      <input
        className="filter-input"
        style={{ maxWidth: 120 }}
        type="number"
        min="0"
        step="0.01"
        placeholder="Largo máx."
        value={filters.largoMax || ""}
        onChange={(e) => setFilters({ ...filters, largoMax: e.target.value })}
      />
      <input
        className="filter-input"
        style={{ maxWidth: 120 }}
        type="number"
        min="0"
        step="1000"
        placeholder="$ mín."
        value={filters.priceMin || ""}
        onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
      />
      <input
        className="filter-input"
        style={{ maxWidth: 120 }}
        type="number"
        min="0"
        step="1000"
        placeholder="$ máx."
        value={filters.priceMax || ""}
        onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
      />

      {/* 🔹 Botón agregar */}
      <button className="btn-add" onClick={onAdd}>
        <img src={add} className="iconButton" />
        Agregar corte
      </button>
    </div>
  );
}
