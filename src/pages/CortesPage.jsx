import { useMemo, useState } from "react";
import CorteTable from "../componets/CorteTable.jsx";
import CorteFilters from "../componets/CorteFilters.jsx";
import CorteModal from "../modals/CorteModal.jsx";
import "../styles/InventoryPage.css";      // reutilizamos layout
import "../styles/InventaryFilters.css";   // reutilizamos toolbar

// 🔹 Datos estáticos de ejemplo (puedes cambiarlos cuando conectes al backend)
const CORTES_MOCK = [
  {
    id: 1,
    codigo: "C-0001",
    nombre: "Corte ventana 60x80",
    categoria: "Vidrio",
    color: "Claro",
    cantidad: 5,           // hereda de Producto
    largoCm: 80.0,         // propio de Corte
    precio: 95000,         // propio de Corte
    observacion: "Bisel 1cm",
    sede: "Centro",
  },
  {
    id: 2,
    codigo: "C-0002",
    nombre: "Corte repisa 25x60",
    categoria: "Vidrio",
    color: "Bronce",
    cantidad: 2,
    largoCm: 60.0,
    precio: 70000,
    observacion: "Cantos pulidos",
    sede: "Insula",
  },
  {
    id: 3,
    codigo: "C-0003",
    nombre: "Corte puerta 70x200",
    categoria: "Vidrio",
    color: "Claro",
    cantidad: 0,
    largoCm: 200.0,
    precio: 220000,
    observacion: "",
    sede: "Patios",
  },
];

export default function CortesPage() {
  const [filters, setFilters] = useState({
    search: "",
    sede: "",
    status: "",
    largoMin: "",
    largoMax: "",
    priceMin: "",
    priceMax: "",
  });

  const [data, setData] = useState(CORTES_MOCK);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCorte, setEditingCorte] = useState(null);

  const filteredData = useMemo(() => {
    const minLargo = filters.largoMin !== "" ? Number(filters.largoMin) : -Infinity;
    const maxLargo = filters.largoMax !== "" ? Number(filters.largoMax) : Infinity;
    const minPrecio = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
    const maxPrecio = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

    return (data || [])
      .filter((c) => {
        const q = (filters.search || "").toLowerCase().trim();
        if (!q) return true;
        return (
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.codigo || "").toLowerCase().includes(q) ||
          (c.color || "").toLowerCase().includes(q) ||
          (c.observacion || "").toLowerCase().includes(q)
        );
      })
      .filter((c) => {
        if (!filters.sede) return true;
        return (c.sede || "") === filters.sede;
      })
      .filter((c) => {
        if (!filters.status) return true;
        const estado = Number(c.cantidad || 0) > 0 ? "Disponible" : "Agotado";
        return estado === filters.status;
      })
      .filter((c) => Number(c.largoCm || 0) >= minLargo && Number(c.largoCm || 0) <= maxLargo)
      .filter((c) => Number(c.precio || 0) >= minPrecio && Number(c.precio || 0) <= maxPrecio);
  }, [data, filters]);

  const handleAdd = () => {
    setEditingCorte(null);
    setModalOpen(true);
  };

  const handleEdit = (corte) => {
    setEditingCorte(corte);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar este corte?")) return;
    setData((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = (corte) => {
    // 👇 Lógica local sobre datos estáticos (sin backend)
    if (editingCorte?.id) {
      setData((prev) => prev.map((c) => (c.id === editingCorte.id ? { ...c, ...corte } : c)));
    } else {
      const nextId = Math.max(0, ...data.map((d) => d.id)) + 1;
      setData((prev) => [...prev, { ...corte, id: nextId }]);
    }
    setModalOpen(false);
  };

  return (
    <div className="inventory-layout">
      <main className="inventory-content">
        <CorteFilters filters={filters} setFilters={setFilters} onAdd={handleAdd} />
        <CorteTable data={filteredData} onEditar={handleEdit} onEliminar={handleDelete} />
      </main>

      {modalOpen && (
        <CorteModal
          isOpen={modalOpen}
          corte={editingCorte}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}