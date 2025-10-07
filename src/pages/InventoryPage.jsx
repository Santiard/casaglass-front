// 👉 Pegar COMPLETO para reemplazar tu InventoryPage si quieres sidebar de categorías también en "Corte"
// src/pages/InventoryPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";

// === Producto ===
import Table from "../componets/InventoryTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import ProductModal from "../modals/ProductoModal.jsx";

// === Corte ===
import CorteTable from "../componets/CorteTable.jsx";
import CorteFilters from "../componets/CorteFilters.jsx";
import CorteModal from "../modals/CorteModal.jsx";

import "../styles/InventoryPage.css";
import "../styles/InventaryFilters.css";

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

const CATEGORY_ORDER = ["Vidrio", "Aluminio", "Accesorios"];

const CORTES_MOCK = [
  { id: 1, codigo: "C-0001", nombre: "Corte ventana 60x80", categoria: "Vidrio", color: "Claro", cantidad: 5, largoCm: 80, precio: 95000, observacion: "Bisel 1cm", sede: "Centro" },
  { id: 2, codigo: "C-0002", nombre: "Corte repisa 25x60",  categoria: "Vidrio", color: "Bronce", cantidad: 2, largoCm: 60, precio: 70000,  observacion: "Cantos pulidos", sede: "Insula" },
  { id: 3, codigo: "C-0003", nombre: "Corte puerta 70x200", categoria: "Vidrio", color: "Claro", cantidad: 0, largoCm: 200, precio: 220000, observacion: "",               sede: "Patios" },
];

export default function InventoryPage() {
  const [view, setView] = useState("producto"); // "producto" | "corte"

  // ======= PRODUCTO =======
  const [filters, setFilters] = useState({
    search: "",
    category: "Vidrio",
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
    if (view !== "producto") return;
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.categoria = filters.category;
      if (filters.search?.trim()) params.q = filters.search.trim();
      const productos = await listarProductos(params);
      setData(productos || []);
    } catch (e) {
      console.error("Error cargando inventario", e);
      alert(e?.response?.data?.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [view, filters.category, filters.search]);

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

  const categories = CATEGORY_ORDER;

  const filteredData = useMemo(() => {
    if (view !== "producto") return [];
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
  }, [view, data, filters.status, filters.sede, filters.priceMin, filters.priceMax]);

  const handleSelectCategory = (cat) => {
    setFilters((prev) => ({
      ...prev,
      category: prev.category === cat ? "" : cat,
    }));
  };

  // ======= CORTE =======
  const [cortes, setCortes] = useState(CORTES_MOCK);
  const [corteFilters, setCorteFilters] = useState({
    search: "",
    category: "Vidrio",  // 👈 categoría para el sidebar
    sede: "",
    status: "",
    largoMin: "",
    largoMax: "",
    priceMin: "",
    priceMax: "",
  });
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [editingCorte, setEditingCorte] = useState(null);

  const filteredCortes = useMemo(() => {
    if (view !== "corte") return [];
    const minLargo = corteFilters.largoMin !== "" ? Number(corteFilters.largoMin) : -Infinity;
    const maxLargo = corteFilters.largoMax !== "" ? Number(corteFilters.largoMax) : Infinity;
    const minPrecio = corteFilters.priceMin !== "" ? Number(corteFilters.priceMin) : -Infinity;
    const maxPrecio = corteFilters.priceMax !== "" ? Number(corteFilters.priceMax) : Infinity;

    return (cortes || [])
      .filter((c) => !corteFilters.category ? true : (c.categoria || "") === corteFilters.category)
      .filter((c) => {
        const q = (corteFilters.search || "").toLowerCase().trim();
        if (!q) return true;
        return (
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.codigo || "").toLowerCase().includes(q) ||
          (c.color || "").toLowerCase().includes(q) ||
          (c.observacion || "").toLowerCase().includes(q)
        );
      })
      .filter((c) => (!corteFilters.sede ? true : (c.sede || "") === corteFilters.sede))
      .filter((c) => {
        if (!corteFilters.status) return true;
        const estado = Number(c.cantidad || 0) > 0 ? "Disponible" : "Agotado";
        return estado === corteFilters.status;
      })
      .filter((c) => Number(c.largoCm || 0) >= minLargo && Number(c.largoCm || 0) <= maxLargo)
      .filter((c) => Number(c.precio || 0) >= minPrecio && Number(c.precio || 0) <= maxPrecio);
  }, [view, cortes, corteFilters]);

  const handleAddCorte = () => { setEditingCorte(null); setCorteModalOpen(true); };
  const handleEditCorte = (c) => { setEditingCorte(c); setCorteModalOpen(true); };
  const handleDeleteCorte = (id) => {
    if (!confirm("¿Eliminar este corte?")) return;
    setCortes((prev) => prev.filter((c) => c.id !== id));
  };
  const handleSaveCorte = (corte) => {
    if (editingCorte?.id) {
      setCortes((prev) => prev.map((c) => (c.id === editingCorte.id ? { ...c, ...corte } : c)));
    } else {
      const nextId = Math.max(0, ...cortes.map((d) => d.id)) + 1;
      setCortes((prev) => [...prev, { ...corte, id: nextId }]);
    }
    setCorteModalOpen(false);
  };

  const handleSelectCorteCategory = (cat) => {
    setCorteFilters((prev) => ({
      ...prev,
      category: prev.category === cat ? "" : cat,
    }));
  };

  useEffect(() => {
    if (view === "producto") fetchData();
  }, [view, fetchData]);

  return (
    <>
      <div className="inventory-layout">
        {/* 🔹 Sidebar en AMBAS vistas */}
        <aside className="inventory-categories">
          {view === "producto" ? (
            <CategorySidebar
              categories={categories}
              selected={filters.category}
              onSelect={handleSelectCategory}
            />
          ) : (
            <CategorySidebar
              categories={categories}
              selected={corteFilters.category}
              onSelect={handleSelectCorteCategory}
            />
          )}
        </aside>

        <main className="inventory-content">
          {view === "producto" ? (
            <>
              <Filter
                filters={filters}
                setFilters={setFilters}
                onAddProduct={handleAddProduct}
                loading={loading}
                view={view}
                setView={setView}
              />
              <Table
                data={filteredData}
                filters={filters}
                loading={loading}
                onEditar={handleEditProduct}
                onEliminar={(id) => handleDeleteProduct(id)}
              />
            </>
          ) : (
            <>
              <CorteFilters
                filters={corteFilters}
                setFilters={setCorteFilters}
                onAdd={handleAddCorte}
                view={view}
                setView={setView}
              />
              <CorteTable
                data={filteredCortes}
                onEditar={handleEditCorte}
                onEliminar={handleDeleteCorte}
              />
            </>
          )}
        </main>
      </div>

      {view === "producto" && modalOpen && (
        <ProductModal
          isOpen={modalOpen}
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

      {view === "corte" && corteModalOpen && (
        <CorteModal
          isOpen={corteModalOpen}
          corte={editingCorte}
          onClose={() => setCorteModalOpen(false)}
          onSave={handleSaveCorte}
        />
      )}
    </>
  );
}
