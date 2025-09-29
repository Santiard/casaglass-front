import { useState, useMemo } from "react";
import Table from "../componets/InventoryTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import ProductModal from "../modals/ProductoModal.jsx";
import "../styles/InventoryPage.css"; // asegúrate de importarlo

export default function InventoryPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    sede: "",
    priceMin: "",
    priceMax: "",
  });

  const [data] = useState([
    { id: 1, codigo:"SS1", nombre: "Vidrio templado", categoria: "Vidrios", cantidadInsula: 40, cantidadCentro: 30, cantidadPatios: 30, precio1: 100, precio2: 100,precio3: 100, precioEspecial: 90, mm: 10, m1m2: 2.5, laminas: 15 },
    { id: 2, codigo:"SS2", nombre: "Perfil aluminio", categoria: "Aluminio", cantidadInsula: 0, cantidadCentro: 18, cantidadPatios: 30, precio1: 50, precio2: 100,precio3: 100, precioEspecial: 45 },
    { id: 3, codigo:"SS", nombre: "Bisagra acero", categoria: "Accesorios", cantidadInsula: 0, cantidadCentro: 0, cantidadPatios: 0, precio1: 12,  precio2: 100,precio3: 100,precioEspecial: 10 },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // categorías dinámicas
  const categories = [...new Set(data.map((p) => p.categoria))];

  const filteredData = useMemo(() => {
  const search = (filters.search || "").toLowerCase().trim();
  const category = filters.category || "";
  const status = filters.status || "";
  const sede = filters.sede || "";
  const min = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
  const max = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

  return data
    .filter((item) => !search || item.nombre.toLowerCase().includes(search))
    .filter((item) => !category || item.categoria === category)
    .filter((item) => {
      if (!sede) return true;
      const map = {
        Insula: Number(item.cantidadInsula || 0),
        Centro: Number(item.cantidadCentro || 0),
        Patios: Number(item.cantidadPatios || 0),
      };
      return (map[sede] ?? 0) > 0;
    })
    .filter((item) => {
      if (!status) return true;
      const total =
        (Number(item.cantidadInsula || 0) +
          Number(item.cantidadCentro || 0) +
          Number(item.cantidadPatios || 0));
      const estado = total > 0 ? "Disponible" : "Agotado";
      return estado === status;
    })
    .filter((item) => {
      // usamos precio1 como precio de referencia
      const precio = Number(item.precio1 || 0);
      return precio >= min && precio <= max;
    });
}, [data, filters]);


  // onSelect togglea: si ya está seleccionado lo limpia
  const handleSelectCategory = (cat) => {
    setFilters((prev) => ({ ...prev, category: prev.category === cat ? "" : cat }));
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSaveProduct = (product) => {
    if (editingProduct) {
      // editar
      setData((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...product, id: p.id } : p))
      );
    } else {
      // agregar
      setData((prev) => [...prev, { ...product, id: prev.length + 1 }]);
    }
    setModalOpen(false);
  };
  return (
    <>
      <div className="inventory-layout">
        {/* SIDEBAR */}
        <aside className="inventory-categories">
          <CategorySidebar
            categories={categories}
            selected={filters.category}
            onSelect={handleSelectCategory}
          />
        </aside>

        {/* CONTENIDO */}
        <main className="inventory-content">
          <Filter
            filters={filters}
            setFilters={setFilters}
            onAddProduct={handleAddProduct}
          />
          <Table
            data={filteredData}
            filters={filters}
            onEditar={handleEditProduct}
            onEliminar={(id) =>
              setData((prev) => prev.filter((item) => item.id !== id))
            }
          />
        </main>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <ProductModal
          isOpen={modalOpen}
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}
    </>
  );
}
