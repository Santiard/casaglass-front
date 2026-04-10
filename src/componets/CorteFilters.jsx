// src/componets/CorteFilters.jsx
import add from "../assets/add.png";
import ViewSwitcher from "./ViewSwitcher.jsx";
import "../styles/InventaryFilters.css";

export default function CorteFilters({
  filters = {},
  setFilters,
  onAdd,
  onUnirCortes,
  view,        // 👈 recibido desde InventoryPage
  setView,     // 👈 recibido desde InventoryPage
}) {
  return (
    <div className="filters-toolbar">
      {/*  Switch Producto / Corte dentro de la barra */}
      <ViewSwitcher value={view} onChange={setView} />

      {onUnirCortes && (
        <button className="btn-unir" onClick={onUnirCortes} title="Unir cortes existentes">
          UNIR CORTES
        </button>
      )}

      {/*  Búsqueda */}
      <input
        className="filter-input"
        type="text"
        placeholder="Buscar por código, nombre o color…"
        value={filters.search || ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      {/*  Color */}
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
        <option value="NA">NA</option>
      </select>

      {/*  Rangos (largo y precio) */}
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

      {/*  Botón agregar - Solo para administradores */}
      {onAdd && (
        <button className="btn-add" onClick={onAdd}>
          <img src={add} className="iconButton" />
          Agregar corte
        </button>
      )}
    </div>
  );
}
