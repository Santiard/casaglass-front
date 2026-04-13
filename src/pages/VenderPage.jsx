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

  // === Inventario y cortes completos sin filtros ===
  const [inventarioCompletoSinFiltros, setInventarioCompletoSinFiltros] = useState([]);
  const [cortesCompletosSinFiltros, setCortesCompletosSinFiltros] = useState([]);
  // Cargar TODO el inventario y cortes sin filtros al montar
  useEffect(() => {
    const cargarInventarioYCortes = async () => {
      try {
        const inventario = await listarInventarioCompleto({}, isAdmin, sedeId);
        setInventarioCompletoSinFiltros(inventario || []);
        const cortes = await listarCortesInventarioCompleto({}, isAdmin, sedeId);
        setCortesCompletosSinFiltros(cortes || []);
      } catch (e) {
        showError("No se pudo cargar el inventario/cortes completos para impresión.");
      }
    };
    cargarInventarioYCortes();
  }, [isAdmin, sedeId, showError]);

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

  // === Filtrar categorías para venta (excluir "TODAS") ===
  const categoriasParaVenta = useMemo(() => {
    return categories.filter(cat => {
      const nombre = cat.nombre?.toUpperCase().trim() || "";
      return nombre !== "TODAS" && nombre !== "TODAS LAS CATEGORÍAS";
    });
  }, [categories]);

  // === Establecer primera categoría y primer color al cargar ===
  useEffect(() => {
    if (categoriasParaVenta.length > 0 && !filters.categoryId) {
      // Establecer la primera categoría para productos
      const primeraCategoria = categoriasParaVenta[0];
      if (primeraCategoria) {
        setFilters((prev) => ({
          ...prev,
          categoryId: primeraCategoria.id,
        }));
      }
    }
  }, [categoriasParaVenta, filters.categoryId]);

  useEffect(() => {
    if (categoriasParaVenta.length > 0 && !cortesFilters.categoryId) {
      // Establecer la primera categoría para cortes
      const primeraCategoria = categoriasParaVenta[0];
      if (primeraCategoria) {
        setCortesFilters((prev) => ({
          ...prev,
          categoryId: primeraCategoria.id,
        }));
      }
    }
  }, [categoriasParaVenta, cortesFilters.categoryId]);

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
      // Construir filtros para el endpoint
      const params = {};
      if (filters.categoryId) {
        params.categoriaId = filters.categoryId;
        // console.log("⏳ Filtrando productos por categoría ID:", filters.categoryId);
      }
      
      const productos = await listarInventarioCompleto(params, isAdmin, sedeId);
      
      // Ordenar productos por posición (productos sin posición al final)
      productos.sort((a, b) => {
        const posA = a.posicion ? parseInt(a.posicion) : Number.MAX_SAFE_INTEGER;
        const posB = b.posicion ? parseInt(b.posicion) : Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });
      
      setData(productos || []);
    } catch (e) {
      console.error("Error cargando inventario completo", e);
      showError(e?.response?.data?.message || "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }, [view, isAdmin, sedeId, filters.categoryId, showError]);

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
      // Construir filtros para el endpoint
      const params = {};
      if (cortesFilters.categoryId) {
        params.categoriaId = cortesFilters.categoryId;
        // console.log("⏳ Filtrando cortes por categoría ID:", cortesFilters.categoryId);
      }
      
      const cortes = await listarCortesInventarioCompleto(params, isAdmin, sedeId);
      setCortesData(cortes || []);
    } catch (e) {
      console.error(" Error cargando inventario de cortes", e);
      showError(e?.response?.data?.message || "No se pudo cargar el inventario de cortes.");
    } finally {
      if (actualizarEstado) {
        setLoading(false);
      }
    }
  }, [view, isAdmin, sedeId, cortesFilters.categoryId, showError]);

  useEffect(() => { fetchCortesData(); }, [fetchCortesData]);

  // ======= Funciones del Carrito =======
  const agregarProducto = (producto, cantidad, precioUsado) => {
    if (cantidad <= 0) return; // No agregar si la cantidad es 0 o negativa

    // console.log(` agregarProducto llamado: ${producto.codigo} - ${producto.nombre}, Cantidad: ${cantidad}, Precio: ${precioUsado}`);

    // Usar función de actualización de estado para asegurar que siempre use el estado más reciente
    setProductosCarrito((prevCarrito) => {
      // console.log(`  Estado anterior del carrito: ${prevCarrito.length} productos`);
      // console.log(`  Productos en carrito:`, prevCarrito.map(p => `${p.codigo} (${p.cantidadVender})`));
      
      const index = prevCarrito.findIndex(
        (p) => p.id === producto.id && p.precioUsado === precioUsado && (p.color || "") === (producto.color || "")
      );

      if (index !== -1) {
        // Si el producto ya existe, actualizar la cantidad
        // IMPORTANTE: Crear un nuevo objeto para evitar mutaciones
        const newCarrito = prevCarrito.map((item, i) => {
          if (i === index) {
            const cantidadAnterior = item.cantidadVender;
            const cantidadNueva = cantidadAnterior + cantidad;
            // console.log(`   Producto existente: ${producto.codigo} - Cantidad anterior: ${cantidadAnterior}, Cantidad a sumar: ${cantidad}, Cantidad nueva: ${cantidadNueva}`);
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
        // console.log(`   Producto nuevo: ${producto.codigo} - Agregando con cantidad: ${cantidad}`);
        return [
          ...prevCarrito, 
          { 
            ...producto, 
            cantidadVender: cantidad,
            precioUsado: precioUsado,
            color: producto.color || "N/A"
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

  const actualizarCantidad = (index, nuevaCantidad) => {
    const cantidad = parseInt(nuevaCantidad) || 1;
    if (cantidad > 0) {
      const newCarrito = [...productosCarrito];
      newCarrito[index].cantidadVender = cantidad;
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
      console.log('🛒 [VenderPage] Agregando corte al carrito:', {
        id: corteParaVender.id,
        nombre: corteParaVender.nombre,
        medidaCorte: corteParaVender.medidaCorte,
        productoOriginal: corteParaVender.productoOriginal,
        esCorte: corteParaVender.esCorte,
        esCorteExistente: corteParaVender.esCorteExistente
      });
      
      console.log('⚠️ [VenderPage] IMPORTANTE - productoId que se usará:', {
        idDelCorte: corteParaVender.id,
        productoOriginal: corteParaVender.productoOriginal,
        explicacion: 'El id del corte es temporal (usado solo en frontend). productoOriginal es el productoId del backend que se debe usar.'
      });
      
      // ✅ Agregar marca especial si es un corte de otro corte
      const corteConMarca = {
        ...corteParaVender,
        esCorteDeCorte: corteParaVender.esCorteExistente || false
      };
      
      console.log('✅ [VenderPage] Corte con marca agregado:', {
        id: corteConMarca.id,
        nombre: corteConMarca.nombre,
        esCorteDeCorte: corteConMarca.esCorteDeCorte
      });
      
      // 1. Agregar el corte al carrito
      setProductosCarrito(prev => [...prev, corteConMarca]);
      
      // 2. Guardar el corte sobrante en el estado SOLO SI EXISTE y es válido
      // Si medidaSobrante es 0 o null, no agregarlo (significa que se vendió el 100%)
      if (corteSobrante && corteSobrante.medidaSobrante > 0) {
        setCortesPendientes(prev => [...prev, corteSobrante]);
      } else {
        console.log('✅ [VenderPage] No hay corte sobrante (se vendió el 100% del corte)');
      }
      
      
    } catch (error) {
      console.error(" Error al procesar corte:", error);
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
    const categoryId = currentFilters.categoryId;
    const selectedCat = categories.find((cat) => cat.id === categoryId);
    const categoryName = selectedCat?.nombre || "";
    const sede = currentFilters.sede || "";
    const color = currentFilters.color || "";

    const min = currentFilters.priceMin !== "" ? Number(currentFilters.priceMin) : -Infinity;
    const max = currentFilters.priceMax !== "" ? Number(currentFilters.priceMax) : Infinity;

    // Debug: mostrar qué categoría está seleccionada
    if (view === "producto" && categoryId) {
      // console.log(` [VENDER] Filtro activo - Categoría seleccionada:`, {
      //   categoryId,
      //   categoryNombre: categoryName,
      //   totalProductos: currentData?.length || 0,
      //   productosVidrio: currentData?.filter(p => p.esVidrio).length || 0
      // });
    }

    let filtered = currentData;
    
    // Filtro 1: Búsqueda
    filtered = filtered.filter((item) => !search || item.nombre.toLowerCase().includes(search));
    if (view === "producto" && categoryId === 26) {
      // console.log(` [VENDER] Después de filtro búsqueda:`, {
      //   total: filtered.length,
      //   vidrios: filtered.filter(p => p.esVidrio).length
      // });
    }
    
    // Filtro 2: Categoría
    filtered = filtered.filter((item) => {
      // Si no hay categoría seleccionada, mostrar todos los productos
      if (!categoryId) return true;
      
      // IMPORTANTE: Ahora TODOS los productos (normales y vidrios) tienen categoria como objeto {id, nombre}
      //  Backend unificado: categoria siempre es { id: X, nombre: "..." }
      const itemCategoriaNombre = typeof item.categoria === 'string' 
        ? item.categoria  // Compatibilidad: si aún llega como string
        : item.categoriaObj?.nombre || item.categoria?.nombre || item.categoria;
      
      // Comparar por ID (más confiable) o por nombre de categoría
      const coincidePorId = item.categoriaId === categoryId || 
                           item.categoria_id === categoryId ||
                           item.categoriaObj?.id === categoryId ||
                           item.categoria?.id === categoryId;
      const coincidePorNombre = (itemCategoriaNombre || "").toLowerCase() === categoryName.toLowerCase();
      
      const coincide = coincidePorId || coincidePorNombre;
      
      // Debug detallado para vidrios en VENDER
      if (view === "producto" && item.esVidrio && categoryId) {
        // console.log(` [VENDER] Filtro categoría - Vidrio (${coincide ? '' : ''}):`, {
        //   itemId: item.id,
        //   itemNombre: item.nombre,
        //   itemCategoria: item.categoria,
        //   itemCategoriaObj: item.categoriaObj,
        //   itemCategoriaId: item.categoriaId,
        //   itemCategoriaNombre,
        //   selectedCategoryId: categoryId,
        //   selectedCategoryNombre: categoryName,
        //   coincidePorId,
        //   coincidePorNombre,
        //   coincide,
        //   tipoCategoria: typeof item.categoria,
        //   tieneCategoriaObj: !!item.categoriaObj,
        //   categoriaObjId: item.categoriaObj?.id,
        //   categoriaObjNombre: item.categoriaObj?.nombre
        // });
      }
      
      return coincide;
    });
    if (view === "producto" && categoryId === 26) {
      // console.log(` [VENDER] Después de filtro categoría:`, {
      //   total: filtered.length,
      //   vidrios: filtered.filter(p => p.esVidrio).length
      // });
    }
    
    // Filtro 3: Color
    filtered = filtered.filter((item) => {
      if (!color) return true;
      const pasa = (item.color || "").toUpperCase() === color.toUpperCase();
      if (view === "producto" && item.esVidrio && !pasa && categoryId === 26) {
        // console.log(` [VENDER] Filtro color - Vidrio filtrado:`, {
        //   itemId: item.id,
        //   itemNombre: item.nombre,
        //   itemColor: item.color,
        //   colorFiltro: color
        // });
      }
      return pasa;
    });
    if (view === "producto" && categoryId === 26) {
      // console.log(` [VENDER] Después de filtro color:`, {
      //   total: filtered.length,
      //   vidrios: filtered.filter(p => p.esVidrio).length
      // });
    }
    
    // Filtro 4: Sede
    filtered = filtered.filter((item) => {
      if (!sede) return true;
      
      // Para productos vidrio, mostrar siempre (incluso con inventario 0)
      // Esto permite que los productos vidrio aparezcan independientemente del inventario por sede
      if (item.esVidrio) {
        return true;
      }
      
      // Para productos normales, aplicar el filtro de sede
      const map = {
        Insula: Number(item.cantidadInsula || 0),
        Centro: Number(item.cantidadCentro || 0),
        Patios: Number(item.cantidadPatios || 0),
      };
      const cantidadSede = map[sede] ?? 0;
      // Permitir inventario positivo o negativo (ventas anticipadas), pero no exactamente 0
      return cantidadSede > 0 || cantidadSede < 0;
    });
    if (view === "producto" && categoryId === 26) {
      // console.log(` [VENDER] Después de filtro sede:`, {
      //   total: filtered.length,
      //   vidrios: filtered.filter(p => p.esVidrio).length,
      //   sedeSeleccionada: sede
      // });
    }
    
    // Filtro 5: Precio
    filtered = filtered.filter((item) => {
      const precio = Number(item.precio1 || item.precio || 0);
      const pasa = precio >= min && precio <= max;
      if (view === "producto" && item.esVidrio && !pasa && categoryId === 26) {
        // console.log(` [VENDER] Filtro precio - Vidrio filtrado:`, {
        //   itemId: item.id,
        //   itemNombre: item.nombre,
        //   precio,
        //   min,
        //   max
        // });
      }
      return pasa;
    });
    if (view === "producto" && categoryId === 26) {
      // console.log(` [VENDER] Después de filtro precio:`, {
      //   total: filtered.length,
      //   vidrios: filtered.filter(p => p.esVidrio).length,
      //   min,
      //   max
      // });
    }
    
    // Filtro 6: Cortes (solo para vista de cortes)
    filtered = filtered.filter((item) => {
      // Solo aplicar este filtro cuando estamos en la vista de cortes
      if (view !== "corte") return true;
      
      if (isAdmin) {
        // Admin: mostrar solo cortes con cantidadTotal > 0 (suma de las 3 sedes)
        const total = Number(item.cantidadTotal || 0) || 
                     (Number(item.cantidadInsula || 0) + Number(item.cantidadCentro || 0) + Number(item.cantidadPatios || 0));
        return total > 0;
      } else {
        // Vendedor: mostrar solo cortes con cantidad de su sede > 0
        const cantidadSede = sedeId === 1 ? Number(item.cantidadInsula || 0) :
                            sedeId === 2 ? Number(item.cantidadCentro || 0) :
                            sedeId === 3 ? Number(item.cantidadPatios || 0) : 0;
        return cantidadSede > 0;
      }
    });
    
    // Debug: mostrar resultado final del filtro
    if (view === "producto") {
      const vidriosFiltrados = filtered.filter(p => p.esVidrio).length;
      // console.log(` [VENDER] Resultado final del filtro:`, {
      //   totalProductos: currentData?.length || 0,
      //   productosFiltrados: filtered.length,
      //   vidriosFiltrados,
      //   filtrosActivos: {
      //     categoryId,
      //     categoryName,
      //     search,
      //     sede,
      //     color,
      //     priceMin: min !== -Infinity ? min : null,
      //     priceMax: max !== Infinity ? max : null
      //   }
      // });
      // console.log(` [VENDER] Productos que pasaron todos los filtros:`, filtered);
    }
    
    return filtered;
  }, [data, cortesData, filters, cortesFilters, categories, view, isAdmin, sedeId]);

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
    setFilters((prev) => {
      const newCategoryId = prev.categoryId === catId ? null : catId;
      
      // Si se selecciona la categoría VIDRIO (ID: 26), establecer color a "NA"
      // Si se deselecciona o se selecciona otra categoría, mantener o resetear el color
      let newColor = prev.color;
      
      if (newCategoryId === 26) {
        // Categoría VIDRIO: establecer color a "NA"
        newColor = "NA";
      } else if (newCategoryId !== null) {
        // Otra categoría seleccionada: establecer color según la categoría (similar a InventoryPage)
        const selectedCategory = categories.find(cat => cat.id === newCategoryId);
        const categoriaNombre = selectedCategory?.nombre?.toUpperCase().trim() || "";
        
        // Categorías que deben tener color "MATE" por defecto
        const categoriasConMate = [
          "5020",
          "744",
          "8025",
          "7038",
          "3831",
          "BAÑO",
          "TUBOS CUARTO CIRCULOS",
          "CANALES"
        ];
        
        const tieneMate = categoriasConMate.some(cat => 
          cat.toUpperCase().trim() === categoriaNombre
        );
        
        newColor = tieneMate ? "MATE" : "";
      } else {
        // No hay categoría seleccionada: mantener el color actual o establecer "MATE" por defecto
        newColor = prev.color || "MATE";
      }
      
      return {
        ...prev,
        categoryId: newCategoryId,
        color: newColor,
      };
    });
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
            categories={categoriasParaVenta}
            selectedId={filters.categoryId}
            onSelect={handleSelectCategory}
          />
        ) : (
          <CategorySidebar
            categories={categoriasParaVenta}
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
              categoryId={filters.categoryId} // Pasar el categoryId para detectar VIDRIO
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
              onCortarProducto={manejarCorte}
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
          actualizarCantidad={actualizarCantidad}
          cortesPendientes={cortesPendientes}
          inventarioCompleto={inventarioCompletoSinFiltros}
          cortesCompletos={cortesCompletosSinFiltros}
        />
      </aside>
    </div>
  );
}