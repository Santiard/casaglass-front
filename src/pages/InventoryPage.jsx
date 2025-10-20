import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";

// === Producto ===
import Table from "../componets/InventoryTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import ProductModal from "../modals/ProductoModal.jsx";

// === Corte ===
import CorteTable from "../componets/CorteTable.jsx";
import CorteFilters from "../componets/CorteFilters.jsx";
import CorteModal from "../modals/CorteModal.jsx";

// ===Inventario ===
//producto
import { listarInventarioCompleto, listarInventarioAgrupado, listarCortesInventarioCompleto } from "../services/InventarioService";
//corte
import {listarInventarioCortesAgrupado} from "../services/InventarioCorteService.js";


import "../styles/InventoryPage.css";
import "../styles/InventaryFilters.css";

import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../services/ProductosService";

import {
  crearProductoVidrio,
  actualizarProductoVidrio,
  eliminarProductoVidrio,
} from "../services/ProductosVidrioService";

import { listarCategorias } from "../services/CategoriasService"; // 👈 nuevo import

const CORTES_MOCK = [
  { id: 1, codigo: "C-0001", nombre: "Corte ventana 60x80", categoria: "Vidrio", color: "Claro", cantidad: 5, largoCm: 80, precio: 95000, observacion: "Bisel 1cm", sede: "Centro" },
  { id: 2, codigo: "C-0002", nombre: "Corte repisa 25x60", categoria: "Vidrio", color: "Bronce", cantidad: 2, largoCm: 60, precio: 70000, observacion: "Cantos pulidos", sede: "Insula" },
  { id: 3, codigo: "C-0003", nombre: "Corte puerta 70x200", categoria: "Vidrio", color: "Claro", cantidad: 0, largoCm: 200, precio: 220000, observacion: "", sede: "Patios" },
];

export default function InventoryPage() {
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [view, setView] = useState("producto"); // "producto" | "corte"

  // ======= PRODUCTO =======
  const [filters, setFilters] = useState({
    search: "",
    categoryId: null, // 👈 ahora guardamos el id de categoría
    status: "",
    color: "",
    priceMin: "",
    priceMax: "",
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]); // 👈 categorías dinámicas

  // === Cargar categorías al montar ===
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategories(cats || []);
      } catch (e) {
        console.error("Error cargando categorías:", e);
        alert("No se pudieron cargar las categorías desde el servidor.");
      }
    };
    fetchCategorias();
  }, []);

  // === Cargar TODOS los productos con inventario completo ===
  const fetchData = useCallback(async () => {
    if (view !== "producto") return;
    setLoading(true);
    try {
      // Pasar información de autenticación para filtrar según rol
      const productos = await listarInventarioCompleto({}, isAdmin, sedeId);
      setData(productos || []);
    } catch (e) {
      console.error("Error cargando inventario completo", e);
      alert(e?.response?.data?.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [view, isAdmin, sedeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // === Cargar TODOS los cortes con inventario completo ===
  const fetchCortesData = useCallback(async () => {
    if (view !== "corte") return;
    setLoading(true);
    try {
      // Pasar información de autenticación para filtrar según rol
      const cortesData = await listarCortesInventarioCompleto({}, isAdmin, sedeId);
      setCortes(cortesData || []);
    } catch (e) {
      console.error("Error cargando inventario completo de cortes", e);
      alert(e?.response?.data?.message || "No se pudo cargar el inventario de cortes.");
    } finally {
      setLoading(false);
    }
  }, [view, isAdmin, sedeId]);

  useEffect(() => { fetchCortesData(); }, [fetchCortesData]);

  const handleAddProduct = () => { setEditingProduct(null); setModalOpen(true); };
  const handleEditProduct = (product) => { setEditingProduct(product); setModalOpen(true); };

  const handleSaveProduct = async (product) => {
    try {
      const categoriaNombre = product.categoria?.nombre?.toLowerCase() || "";
      const esVidrio = categoriaNombre === "vidrio";
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

      const categoriaNombre = prod.categoria?.nombre?.toLowerCase() || "";
      const esVidrio = categoriaNombre === "vidrio";
      if (esVidrio) await eliminarProductoVidrio(id);
      else await eliminarProducto(id);

      await fetchData();
    } catch (e) {
      console.error("Error eliminando producto", e);
      alert(e?.response?.data?.message || "No se pudo eliminar el producto.");
    }
  };

  // === Filtrado completo (categoría, búsqueda, status, sede, precio) ===
  const filteredData = useMemo(() => {
    if (view !== "producto") return [];
    
    const categoryId = filters.categoryId;
    const search = filters.search?.trim()?.toLowerCase() || "";
    const status = filters.status || "";
    const color = filters.color || "";
    const min = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
    const max = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

    return (data || [])
      // Filtro por categoría (CategorySidebar)
      .filter((item) => {
        if (!categoryId) return true;
        
        // Buscar la categoría seleccionada para obtener su nombre
        const selectedCategory = categories.find(cat => cat.id === categoryId);
        if (!selectedCategory) return true;
        
        // Comparar por ID o por nombre de categoría
        return (
          item.categoriaId === categoryId || 
          item.categoria_id === categoryId ||
          (item.categoria || "").toLowerCase() === selectedCategory.nombre.toLowerCase()
        );
      })
      // Filtro por búsqueda (nombre, código)
      .filter((item) => {
        if (!search) return true;
        const nombre = (item.nombre || "").toLowerCase();
        const codigo = (item.codigo || "").toLowerCase();
        return nombre.includes(search) || codigo.includes(search);
      })
      // Filtro por status (Disponible/Agotado)
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
      // Filtro por color
      .filter((item) => {
        if (!color) return true;
        return (item.color || "").toUpperCase() === color.toUpperCase();
      })
      // Filtro por rango de precios
      .filter((item) => {
        const precio = Number(item.precio1 || 0);
        return precio >= min && precio <= max;
      });
  }, [view, data, categories, filters.categoryId, filters.search, filters.status, filters.color, filters.priceMin, filters.priceMax]);

  // === Selección de categoría desde el sidebar ===
  const handleSelectCategory = (catId) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === catId ? null : catId,
    }));
  };

  // ======= CORTE =======
  const [cortes, setCortes] = useState([]);
  const [corteFilters, setCorteFilters] = useState({
    search: "",
    categoryId: null,        // Para el CategorySidebar
    category: "Vidrio",      // Mantener por compatibilidad
    color: "",
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
      // Filtro por categoría (CategorySidebar)
      .filter((c) => {
        if (!corteFilters.categoryId) return true;
        
        // Buscar la categoría seleccionada para obtener su nombre
        const selectedCategory = categories.find(cat => cat.id === corteFilters.categoryId);
        if (!selectedCategory) return true;
        
        // Comparar por nombre de categoría
        return (c.categoria || "").toLowerCase() === selectedCategory.nombre.toLowerCase();
      })
      // Filtro por búsqueda (nombre, código, observación)
      .filter((c) => {
        const q = (corteFilters.search || "").toLowerCase().trim();
        if (!q) return true;
        return (
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.codigo || "").toLowerCase().includes(q) ||
          (c.observacion || "").toLowerCase().includes(q)
        );
      })
      // Filtro por color
      .filter((c) => {
        if (!corteFilters.color) return true;
        return (c.color || "").toUpperCase() === corteFilters.color.toUpperCase();
      })
      // Filtro por status (usando cantidadTotal del DTO)
      .filter((c) => {
        if (!corteFilters.status) return true;
        const total = Number(c.cantidadTotal || 0) || 
                     (Number(c.cantidadInsula || 0) + Number(c.cantidadCentro || 0) + Number(c.cantidadPatios || 0));
        const estado = total > 0 ? "Disponible" : "Agotado";
        return estado === corteFilters.status;
      })
      // Filtro por rango de largo
      .filter((c) => Number(c.largoCm || 0) >= minLargo && Number(c.largoCm || 0) <= maxLargo)
      // Filtro por rango de precios (usando precio1 como principal)
      .filter((c) => {
        const precio = Number(c.precio1 || c.precio || 0);
        return precio >= minPrecio && precio <= maxPrecio;
      });
  }, [view, cortes, categories, corteFilters]);

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

  const handleSelectCorteCategory = (catId) => {
    setCorteFilters((prev) => ({
    ...prev,
    categoryId: prev.categoryId === catId ? null : catId,
  }));
  };


  useEffect(() => {
    if (view === "producto") fetchData();
  }, [view, fetchData]);

  return (
    <>
      <div className="inventory-layout">
        {/* Sidebar en AMBAS vistas */}
        <aside className="inventory-categories">
          {view === "producto" ? (
            <CategorySidebar
              categories={categories}
              selectedId={filters.categoryId}
              onSelect={handleSelectCategory}
            />
          ) : (
            <CategorySidebar
              categories={categories}
              selectedId={corteFilters.categoryId}
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
                onAddProduct={isAdmin ? handleAddProduct : null}
                loading={loading}
                view={view}
                setView={setView}
                isAdmin={isAdmin}
              />
              <Table
                data={filteredData}
                filters={filters}
                loading={loading}
                onEditar={handleEditProduct}
                onEliminar={(id) => handleDeleteProduct(id)}
                isAdmin={isAdmin}
                userSede={sedeId === 1 ? "Insula" : sedeId === 2 ? "Centro" : sedeId === 3 ? "Patios" : ""}
              />
            </>
          ) : (
            <>
              <CorteFilters
                filters={corteFilters}
                setFilters={setCorteFilters}
                onAdd={isAdmin ? handleAddCorte : null}
                view={view}
                setView={setView}
              />
              <CorteTable
                data={filteredCortes}
                onEditar={handleEditCorte}
                onEliminar={handleDeleteCorte}
                isAdmin={isAdmin}
                userSede={sedeId === 1 ? "Insula" : sedeId === 2 ? "Centro" : sedeId === 3 ? "Patios" : ""}
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
