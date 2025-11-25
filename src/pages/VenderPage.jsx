import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSidebar } from "../layouts/DashboardLayout.jsx"; // Importar el hook

// === Componentes específicos de venta ===
import VentaTable from "../componets/VentaTable.jsx";
import VentaCortesTable from "../componets/VentaCortesTable.jsx";
import InventaryFilters from "../componets/InventaryFilters.jsx";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import CorteFilters from "../componets/CorteFilters.jsx";
import ListadoOrden from "../componets/ListadoOrden.jsx";

// === Servicios ===
import { listarInventarioCompleto, listarCortesInventarioCompleto } from "../services/InventarioService";
import { useToast } from "../context/ToastContext.jsx";
import { listarCategorias } from "../services/CategoriasService";

// === Estilos ===
import "../styles/VenderPage.css";

export default function VenderPage() {
  const { showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [view, setView] = useState("producto"); // "producto" | "corte"

  // ======= Estados del Carrito =======
  const [productosCarrito, setProductosCarrito] = useState([]);
  const [cortesPendientes, setCortesPendientes] = useState([]);

  // ======= Estados del Inventario =======
  const [data, setData] = useState([]);
  const [cortesData, setCortesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // ======= Filtros =======
  const [filters, setFilters] = useState({
    search: "",
    categoryId: null, // 👈 ahora guardamos el id de categoría
    status: "",
    sede: "",
    color: "", // 👈 agregar campo color
    priceMin: "",
    priceMax: "",
  });

  const [cortesFilters, setCortesFilters] = useState({
    search: "",
    categoryId: null, // 👈 ahora guardamos el id de categoría
    status: "",
    sede: "",
    color: "", // 👈 agregar campo color
    priceMin: "",
    priceMax: "",
  });

  const [selectedCategory, setSelectedCategory] = useState(null);

  // ======= Cargar Categorías =======
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategories(cats || []);
      } catch (e) {
        console.error("Error cargando categorías:", e);
        showError("No se pudieron cargar las categorías desde el servidor.");
      }
    };
    fetchCategorias();
  }, []);

  // === Establecer primera categoría y primer color al cargar ===
  useEffect(() => {
    if (categories.length > 0 && !filters.categoryId) {
      // Establecer la primera categoría para productos
      const primeraCategoria = categories[0];
      if (primeraCategoria) {
        setFilters((prev) => ({
          ...prev,
          categoryId: primeraCategoria.id,
        }));
      }
    }
  }, [categories]);

  useEffect(() => {
    if (categories.length > 0 && !cortesFilters.categoryId) {
      // Establecer la primera categoría para cortes
      const primeraCategoria = categories[0];
      if (primeraCategoria) {
        setCortesFilters((prev) => ({
          ...prev,
          categoryId: primeraCategoria.id,
        }));
      }
    }
  }, [categories]);

  useEffect(() => {
    // Establecer el primer color (MATE) si no hay color seleccionado para productos
    if (!filters.color) {
      setFilters((prev) => ({
        ...prev,
        color: "MATE", // Primer color disponible
      }));
    }
  }, []); // Solo al montar el componente

  useEffect(() => {
    // Establecer el primer color (MATE) si no hay color seleccionado para cortes
    if (!cortesFilters.color) {
      setCortesFilters((prev) => ({
        ...prev,
        color: "MATE", // Primer color disponible
      }));
    }
  }, []); // Solo al montar el componente

  // ======= Cargar Productos =======
  const fetchData = useCallback(async () => {
    if (view !== "producto") return;
    setLoading(true);
    try {
      const productos = await listarInventarioCompleto({}, isAdmin, sedeId);
      setData(productos || []);
    } catch (e) {
      console.error("Error cargando inventario completo", e);
      showError(e?.response?.data?.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [view, isAdmin, sedeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ======= Cargar Cortes =======
  const fetchCortesData = useCallback(async () => {
    // Permitir refrescar cortes incluso si no estamos en la vista de cortes (para refrescar después de venta)
    // Solo no actualizar el estado si no es necesario
    const actualizarEstado = view === "corte";
    if (actualizarEstado) {
      setLoading(true);
    }
    try {
      const cortes = await listarCortesInventarioCompleto({}, isAdmin, sedeId);
      setCortesData(cortes || []);
    } catch (e) {
      console.error("❌ Error cargando inventario de cortes", e);
      showError(e?.response?.data?.message || "No se pudo cargar el inventario de cortes.");
    } finally {
      if (actualizarEstado) {
        setLoading(false);
      }
    }
  }, [view, isAdmin, sedeId]);

  useEffect(() => { fetchCortesData(); }, [fetchCortesData]);

  // ======= Funciones del Carrito =======
  const agregarProducto = (producto, cantidad, precioUsado) => {
    if (cantidad <= 0) return; // No agregar si la cantidad es 0 o negativa

    console.log(`🛒 agregarProducto llamado: ${producto.codigo} - ${producto.nombre}, Cantidad: ${cantidad}, Precio: ${precioUsado}`);

    // Usar función de actualización de estado para asegurar que siempre use el estado más reciente
    setProductosCarrito((prevCarrito) => {
      console.log(`  Estado anterior del carrito: ${prevCarrito.length} productos`);
      console.log(`  Productos en carrito:`, prevCarrito.map(p => `${p.codigo} (${p.cantidadVender})`));
      
      const index = prevCarrito.findIndex(
        (p) => p.id === producto.id && p.precioUsado === precioUsado
      );

      if (index !== -1) {
        // Si el producto ya existe, actualizar la cantidad
        // IMPORTANTE: Crear un nuevo objeto para evitar mutaciones
        const newCarrito = prevCarrito.map((item, i) => {
          if (i === index) {
            const cantidadAnterior = item.cantidadVender;
            const cantidadNueva = cantidadAnterior + cantidad;
            console.log(`  ✅ Producto existente: ${producto.codigo} - Cantidad anterior: ${cantidadAnterior}, Cantidad a sumar: ${cantidad}, Cantidad nueva: ${cantidadNueva}`);
            return {
              ...item,
              cantidadVender: cantidadNueva
            };
          }
          return item;
        });
        return newCarrito;
      } else {
        // Si el producto no existe, agregarlo
        console.log(`  ✅ Producto nuevo: ${producto.codigo} - Agregando con cantidad: ${cantidad}`);
        return [
          ...prevCarrito, 
          { 
            ...producto, 
            cantidadVender: cantidad,
            precioUsado: precioUsado 
          }
        ];
      }
    });
  };

  const actualizarPrecio = (id, precioUsado) => {
    const index = productosCarrito.findIndex((p) => p.id === id);
    if (index !== -1) {
      const newCarrito = [...productosCarrito];
      newCarrito[index].precioUsado = precioUsado;
      setProductosCarrito(newCarrito);
    }
  };

  const limpiarCarrito = () => {
    setProductosCarrito([]);
    setCortesPendientes([]); // Limpiar cortes pendientes también
    localStorage.removeItem("shopItems");
    
    // Refrescar automáticamente ambos listados después de una venta exitosa
    fetchData();
    fetchCortesData();
  };

  // ======= Función para Manejar Cortes =======
  const manejarCorte = async (corteParaVender, corteSobrante) => {
    
    try {
      // 1. Agregar el corte al carrito
      setProductosCarrito(prev => [...prev, corteParaVender]);
      
      // 2. Guardar el corte sobrante en el estado para enviarlo después de facturar
      setCortesPendientes(prev => [...prev, corteSobrante]);
      
      
    } catch (error) {
      console.error("❌ Error al procesar corte:", error);
      showError("Error al procesar el corte. Intente nuevamente.");
    }
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = productosCarrito.filter((_, i) => i !== index);
    setProductosCarrito(nuevosProductos);
  };

  // ======= Filtrado de datos =======
  const filteredData = useMemo(() => {
    const currentData = view === "producto" ? data : cortesData;
    const currentFilters = view === "producto" ? filters : cortesFilters;

    const search = (currentFilters.search || "").toLowerCase().trim();
    const selectedCat = categories.find((cat) => cat.id === currentFilters.categoryId);
    const categoryName = selectedCat?.nombre || "";
    const sede = currentFilters.sede || "";
    const color = currentFilters.color || "";

    const min = currentFilters.priceMin !== "" ? Number(currentFilters.priceMin) : -Infinity;
    const max = currentFilters.priceMax !== "" ? Number(currentFilters.priceMax) : Infinity;

    return currentData
      .filter((item) => !search || item.nombre.toLowerCase().includes(search))
      .filter((item) => !categoryName || item.categoria === categoryName)
      .filter((item) => {
        if (!color) return true;
        return (item.color || "").toUpperCase() === color.toUpperCase();
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
        const precio = Number(item.precio1 || item.precio || 0);
        return precio >= min && precio <= max;
      });
  }, [data, cortesData, filters, cortesFilters, categories, view]);

  // ======= Cálculos del carrito =======
  // El precio ya incluye IVA, así que calculamos el total
  const total = productosCarrito.reduce(
    (acc, item) => acc + (item.precioUsado || item.precio1 || item.precio || 0) * item.cantidadVender,
    0
  );
  
  // Calcular IVA como 19% del total
  const iva = total * 0.19; // 19% del total
  const subtotal = total - iva; // Subtotal sin IVA

  // === Función para manejar selección de categoría en productos ===
  const handleSelectCategory = (catId) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === catId ? null : catId,
    }));
  };

  // === Función para manejar selección de categoría en cortes ===
  const handleSelectCorteCategory = (catId) => {
    setCortesFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === catId ? null : catId,
    }));
  };

  return (
    <div className="vender-page">
      {/* Sidebar de categorías */}
      <aside className="vender-categories">
        {view === "producto" ? (
          <CategorySidebar
            categories={categories}
            selectedId={filters.categoryId}
            onSelect={handleSelectCategory}
          />
        ) : (
          <CategorySidebar
            categories={categories}
            selectedId={cortesFilters.categoryId}
            onSelect={handleSelectCorteCategory}
          />
        )}
      </aside>

      {/* Contenido principal */}
      <main className="vender-content">
        {view === "producto" ? (
          <>
            <InventaryFilters
              filters={filters}
              setFilters={setFilters}
              onAddProduct={null} // No agregamos productos en modo venta
              loading={loading}
              view={view}
              setView={setView}
              isAdmin={isAdmin}
            />
            <VentaTable
              data={filteredData}
              loading={loading}
              isAdmin={isAdmin}
              userSede={sedeId === 1 ? "Insula" : sedeId === 2 ? "Centro" : sedeId === 3 ? "Patios" : ""}
              onAgregarProducto={agregarProducto}
              onCortarProducto={manejarCorte}
              todosLosProductos={data} // data contiene TODOS los productos sin filtrar
            />
          </>
        ) : (
          <>
            <CorteFilters
              filters={cortesFilters}
              setFilters={setCortesFilters}
              onAdd={null} // No agregamos cortes en modo venta
              view={view}
              setView={setView}
            />
            <VentaCortesTable
              data={filteredData}
              loading={loading}
              isAdmin={isAdmin}
              userSede={sedeId === 1 ? "Insula" : sedeId === 2 ? "Centro" : sedeId === 3 ? "Patios" : ""}
              onAgregarProducto={agregarProducto}
            />
          </>
        )}
      </main>

      {/* Listado de orden */}
      <aside className="shop-cart-sidebar">
        <ListadoOrden 
          productosCarrito={productosCarrito} 
          subtotal={subtotal} 
          total={total} 
          limpiarCarrito={limpiarCarrito}
          eliminarProducto={eliminarProducto}
          cortesPendientes={cortesPendientes}
        />
      </aside>
    </div>
  );
}