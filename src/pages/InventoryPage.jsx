import { useState, useMemo, useEffect, useCallback } from "react";
import Table from "../componets/InventoryTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import ProductModal from "../modals/ProductoModal.jsx";
import "../styles/InventoryPage.css";

import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../services/ProductosService";

import {
  crearProductoVidrio,
  actualizarProductoVidrio,
  eliminarProductoVidrio,
} from "../services/ProductosVidrioService";

// Lista fija de categorías que usas en tu negocio
const CATEGORY_ORDER = ["Vidrio", "Aluminio", "Accesorios"];

export default function InventoryPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "Vidrio",   // 👈 por defecto
    status: "",
    sede: "",
    priceMin: "",
    priceMax: "",
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.categoria = filters.category; // servidor filtra por categoría
      if (filters.search?.trim()) params.q = filters.search.trim(); // y por texto
      const productos = await listarProductos(params);
      setData(productos || []);
    } catch (e) {
      console.error("Error cargando inventario", e);
      alert(e?.response?.data?.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddProduct = () => { setEditingProduct(null); setModalOpen(true); };
  const handleEditProduct = (product) => { setEditingProduct(product); setModalOpen(true); };

  const handleSaveProduct = async (product) => {
    try {
      const esVidrio = (product.categoria || "").toLowerCase() === "vidrio";
      const editando = !!editingProduct?.id;

      if (esVidrio) {
        if (editando) await actualizarProductoVidrio(editingProduct.id, product);
        else await crearProductoVidrio(product);
      } else {
        if (editando) await actualizarProducto(editingProduct.id, product);
        else await crearProducto(product);
      }

      await fetchData();
      setModalOpen(false);
    } catch (e) {
      console.error("Error guardando producto", e);
      alert(e?.response?.data?.message || "No se pudo guardar el producto.");
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const prod = data.find((p) => p.id === id);
      if (!prod) return;
      if (!confirm("¿Eliminar este producto?")) return;

      const esVidrio = (prod.categoria || "").toLowerCase() === "vidrio";
      if (esVidrio) await eliminarProductoVidrio(id);
      else await eliminarProducto(id);

      await fetchData();
    } catch (e) {
      console.error("Error eliminando producto", e);
      alert(e?.response?.data?.message || "No se pudo eliminar el producto.");
    }
  };

  // Sidebar: usa lista fija ordenada y marca activo
  const categories = CATEGORY_ORDER;

  // Filtros adicionales (estado, sede, rango de precio) se aplican en cliente
  const filteredData = useMemo(() => {
    const status = filters.status || "";
    const sede = filters.sede || "";
    const min = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
    const max = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

    return (data || [])
      .filter((item) => {
        if (!status) return true;
        const total =
          Number(item.cantidadInsula || 0) +
          Number(item.cantidadCentro || 0) +
          Number(item.cantidadPatios || 0) +
          Number(item.cantidad || 0);
        const estado = total > 0 ? "Disponible" : "Agotado";
        return estado === status;
      })
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
        const precio = Number(item.precio1 || 0);
        return precio >= min && precio <= max;
      });
  }, [data, filters.status, filters.sede, filters.priceMin, filters.priceMax]);

  const handleSelectCategory = (cat) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === cat ? "" : cat, // si tocas la activa, la limpia (opcional)
      // podrías limpiar search al cambiar categoría:
      // search: "",
    }));
  };

  return (
    <>
      <div className="inventory-layout">
        <aside className="inventory-categories">
          <CategorySidebar
            categories={categories}
            selected={filters.category}
            onSelect={handleSelectCategory}
          />
        </aside>

        <main className="inventory-content">
          <Filter
            filters={filters}
            setFilters={setFilters}
            onAddProduct={handleAddProduct}
            loading={loading}
          />
          <Table
            data={filteredData}
            filters={filters}
            loading={loading}
            onEditar={handleEditProduct}
            onEliminar={(id) => handleDeleteProduct(id)}
          />
        </main>
      </div>

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
