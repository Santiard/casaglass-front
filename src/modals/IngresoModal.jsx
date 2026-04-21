// src/modals/IngresoModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/IngresoNuevoModal.css";
import "../styles/Table.css";
import {
  obtenerIngreso,
} from "../services/IngresosService.js";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import { listarCategorias } from "../services/CategoriasService.js";
import { listarInventarioCompleto } from "../services/InventarioService.js";
import { useToast } from "../context/ToastContext.jsx";
import { listarProveedores } from "../services/ProveedoresService.js";
import { getTodayLocalDate, parseLocalDate, diffDaysFromToday } from "../lib/dateUtils.js";

export default function IngresoModal({
  isOpen,
  onClose,
  onSave,                   // callback opcional para refrescar la tabla del padre
  proveedores = [],         // [{id, nombre}]
  catalogoProductos = [],   // [{id, nombre, codigo}] - DEPRECATED: ahora se cargan filtrados por categoría
  ingresoInicial = null,    // si viene => editar
}) {
  const { showError } = useToast();
  const empty = {
    fecha: getTodayLocalDate(), // input date
    proveedorId: "",
    proveedorNombre: "", // (solo usado si quisieras permitir libre, aquí no lo usamos)
    numeroFactura: "",
    observaciones: "",
    detalles: [], // [{producto:{id,nombre,codigo}, cantidad, costoUnitario}]
  };

  const [form, setForm] = useState(empty);
  const [searchCat, setSearchCat] = useState("");
  const [selectedColor, setSelectedColor] = useState(""); // Filtro de color
  const [editable, setEditable] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [catalogoProductosFiltrados, setCatalogoProductosFiltrados] = useState([]); // Productos cargados por categoría
  const [loadingProductos, setLoadingProductos] = useState(false); // Estado de carga de productos
  const [proveedoresLista, setProveedoresLista] = useState([]);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [proveedorSearchModal, setProveedorSearchModal] = useState("");

  const isEdit = Boolean(ingresoInicial?.id);

  // Prevenir cierre/recarga de pestaña cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const cargarIngreso = async () => {
      if (ingresoInicial) {
        let ingresoCompleto = ingresoInicial;
        
        // Si el ingreso no tiene detalles o están vacíos, obtenerlo del backend
        if (!ingresoInicial.detalles || ingresoInicial.detalles.length === 0) {
          if (ingresoInicial.id) {
            try {
              // console.log("📥 Obteniendo ingreso completo para edición:", ingresoInicial.id);
              ingresoCompleto = await obtenerIngreso(ingresoInicial.id);
              // console.log("Ingreso completo obtenido:", ingresoCompleto);
            } catch (error) {
              // console.error("❌ Error al obtener ingreso completo:", error);
              showError("No se pudieron cargar los detalles del ingreso");
              return;
            }
          }
        }
        
        setForm({
          fecha: ingresoCompleto.fecha ?? getTodayLocalDate(),
          proveedorId: ingresoCompleto.proveedor?.id ?? "",
          proveedorNombre: ingresoCompleto.proveedor?.nombre ?? "",
          numeroFactura: ingresoCompleto.numeroFactura ?? "",
          observaciones: ingresoCompleto.observaciones ?? "",
          detalles: Array.isArray(ingresoCompleto.detalles)
            ? ingresoCompleto.detalles.map((d) => ({
                producto: {
                  id: d.producto?.id ?? "",
                  nombre: d.producto?.nombre ?? "",
                  codigo: d.producto?.codigo ?? "",
                  color: d.producto?.color ?? "N/A",
                },
                cantidad: d.cantidad && Number(d.cantidad) > 0 ? Number(d.cantidad) : "",
                costoUnitario: d.costoUnitario && Number(d.costoUnitario) > 0 ? Number(d.costoUnitario) : "",
              }))
            : [],
        });

        // Edición siempre permitida, sin importar procesado o antigüedad
        setEditable(true);
      } else {
        setForm({
          fecha: getTodayLocalDate(),
          proveedorId: "",
          proveedorNombre: "",
          numeroFactura: "",
          observaciones: "",
          detalles: [],
        });
        setEditable(true);
      }

      setSearchCat("");
      setSelectedCategoryId(null);
    };

    cargarIngreso();
  }, [isOpen, ingresoInicial]);

  // Cargar categorías y proveedores desde el servidor
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategorias(cats || []);
      } catch (e) {
        // console.error("Error cargando categorías:", e);
        setCategorias([]); // Asegurar que quede un array vacío
        // No mostramos alert para evitar interrumpir la UX del modal
      }
    };

    const fetchProveedores = async () => {
      try {
        const provs = await listarProveedores();
        setProveedoresLista(Array.isArray(provs) ? provs : []);
      } catch (e) {
        // console.error("Error cargando proveedores:", e);
        setProveedoresLista([]);
      }
    };
    
    if (isOpen) {
      fetchCategorias();
      fetchProveedores();
    } else {
      // Reset categorías y proveedores cuando se cierre el modal
      setCategorias([]);
      setProveedoresLista([]);
      setCatalogoProductosFiltrados([]); // Limpiar productos filtrados
    }
  }, [isOpen]);

  // Cargar productos filtrados por categoría
  useEffect(() => {
    const fetchProductosPorCategoria = async () => {
      if (!selectedCategoryId || !isOpen) {
        setCatalogoProductosFiltrados([]);
        setLoadingProductos(false);
        return;
      }
      
      try {
        setLoadingProductos(true);
        // console.log("⏳ [IngresoModal] Cargando productos para categoría ID:", selectedCategoryId);
        const params = { categoriaId: selectedCategoryId };
        const productos = await listarInventarioCompleto(params, true, null);
        // console.log("[IngresoModal] Productos cargados:", { categoriaId: selectedCategoryId, total: productos?.length || 0 });
        setCatalogoProductosFiltrados(productos || []);
      } catch (e) {
        // console.error("❌ [IngresoModal] Error cargando productos por categoría:", e);
        showError("No se pudieron cargar los productos");
        setCatalogoProductosFiltrados([]);
      } finally {
        setLoadingProductos(false);
      }
    };
    
    fetchProductosPorCategoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, isOpen]);

  // Seleccionar primera categoría por defecto cuando se carguen las categorías
  useEffect(() => {
    if (categorias.length > 0 && !selectedCategoryId) {
      const categoriasValidas = categorias.filter(cat => {
        const nombre = cat.nombre?.toUpperCase().trim() || "";
        return nombre !== "TODAS" && nombre !== "TODAS LAS CATEGORÍAS";
      });
      
      if (categoriasValidas.length > 0) {
        // console.log("📌 [IngresoModal] Seleccionando primera categoría por defecto:", categoriasValidas[0]);
        setSelectedCategoryId(categoriasValidas[0].id);
      }
    }
  }, [categorias, selectedCategoryId]);

  // Catálogo filtrado por búsqueda y categoría
  const obtenerCodigoProducto = (p) => (
    p?.codigo ?? p?.codigoProducto ?? p?.producto?.codigo ?? ""
  );

  // Detectar si la categoría seleccionada es de vidrios
  const esCategoriaVidrio = useMemo(() => {
    const cat = categorias.find(c => c.id === selectedCategoryId);
    const nombre = cat?.nombre?.toUpperCase().trim() || "";
    return nombre.includes("VIDRIO") || catalogoProductosFiltrados.some(p => p.esVidrio);
  }, [categorias, selectedCategoryId, catalogoProductosFiltrados]);

  const catalogoFiltrado = useMemo(() => {
    let filtered = catalogoProductosFiltrados;
    
    // Filtrar cortes: excluir productos con largoCm > 0 que NO sean vidrios
    // Los vidrios tienen largoCm como su dimensión m1 — nunca se deben excluir
    // Si es categoría vidrio, omitir este filtro completamente
    if (!esCategoriaVidrio) {
      filtered = filtered.filter(p => {
        const largo = Number(p.largoCm);
        return !p.largoCm || largo <= 0 || !Number.isFinite(largo);
      });
    }
    
    // Filtrar por color
    if (selectedColor) {
      const colorFiltro = selectedColor.toUpperCase().trim();
      filtered = filtered.filter((p) => {
        const productoColor = (p.color || "").toUpperCase().trim();
        return productoColor === colorFiltro;
      });
    }
    
    // Filtrar por búsqueda de texto
    const q = searchCat.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.nombre ?? "").toLowerCase().includes(q) ||
          obtenerCodigoProducto(p).toLowerCase().includes(q)
      );
    }
    
    // Ordenar por posición (productos sin posición al final)
    filtered.sort((a, b) => {
      const posA = a.posicion ? parseInt(a.posicion) : Number.MAX_SAFE_INTEGER;
      const posB = b.posicion ? parseInt(b.posicion) : Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
    
    return filtered;
  }, [catalogoProductosFiltrados, searchCat, selectedColor]);

  // Total costo calculado en UI (el back recalcula igual)
  const totalCosto = useMemo(
    () =>
      form.detalles.reduce(
        (acc, d) => {
          const cantidad = Number(d.cantidad) || 0;
          const costo = Number(d.costoUnitario) || 0;
          return acc + cantidad * costo;
        },
        0
      ),
    [form.detalles]
  );

  // Validaciones básicas
  const cantidadesInvalidas = form.detalles.some(
    (d) => {
      const cantidad = Number(d.cantidad);
      return !Number.isFinite(cantidad) || cantidad < 1 || cantidad === 0 || d.cantidad === "" || d.cantidad === null;
    }
  );
  const costosInvalidos = form.detalles.some(
    (d) => {
      const costo = Number(d.costoUnitario);
      return d.costoUnitario === "" || d.costoUnitario === null || !Number.isFinite(costo) || costo < 0;
    }
  );

  const proveedorIdNum = Number(form.proveedorId);
  const disabledSubmit =
    !editable ||
    !form.fecha ||
    !Number.isFinite(proveedorIdNum) ||
    proveedorIdNum <= 0 ||
    form.detalles.length === 0 ||
    cantidadesInvalidas ||
    costosInvalidos;

  // Helpers UI
  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleProveedorSelect = (proveedor) => {
    if (!editable) return;
    setForm((prev) => ({
      ...prev,
      proveedorId: String(proveedor.id),
      proveedorNombre: proveedor.nombre ?? "",
    }));
    setShowProveedorModal(false);
    setProveedorSearchModal("");
  };

  const addProducto = (prod) => {
    if (!editable) return;
    setForm((prev) => {
      const key = String(prod.id);
      const idx = prev.detalles.findIndex(
        (d) => String(d.producto.id) === key
      );
      if (idx >= 0) {
        const arr = [...prev.detalles];
        const cantidadActual = Number(arr[idx].cantidad) || 0;
        arr[idx] = {
          ...arr[idx],
          cantidad: cantidadActual + 1,
        };
        return { ...prev, detalles: arr };
      }
      return {
        ...prev,
        detalles: [
          ...prev.detalles,
          {
            producto: {
              id: prod.id,
              nombre: prod.nombre ?? "",
              codigo: prod.codigo ?? "",
              color: prod.color, // Incluir el color del producto
            },
            cantidad: "",
            costoUnitario: "",
          },
        ],
      };
    });
  };

  const setDetalle = (idx, field, value) => {
    if (!editable) return;
    setForm((prev) => {
      const arr = [...prev.detalles];
      const row = { ...arr[idx] };
      if (field === "cantidad") {
        // Filtrar solo números enteros (sin decimales)
        const filtered = value.toString().replace(/[^0-9]/g, '');
        row[field] = filtered === "" ? "" : Number(filtered);
      } else if (field === "costoUnitario") {
        // Filtrar números y un punto decimal
        // Permitir formato: números, un punto, y máximo 2 decimales
        let filtered = value.toString();
        // Remover todo excepto números y punto
        filtered = filtered.replace(/[^0-9.]/g, '');
        // Asegurar solo un punto decimal
        const parts = filtered.split('.');
        if (parts.length > 2) {
          filtered = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limitar a 2 decimales
        if (parts.length === 2 && parts[1].length > 2) {
          filtered = parts[0] + '.' + parts[1].substring(0, 2);
        }
        row[field] = filtered === "" || filtered === "." ? "" : filtered;
      } else if (field === "nombre" || field === "codigo" || field === "color") {
        row.producto = { ...row.producto, [field]: value };
      }
      arr[idx] = row;
      return { ...prev, detalles: arr };
    });
  };

  const removeDetalle = (idx) => {
    if (!editable) return;
    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== idx),
    }));
  };

  // Submit usando el callback del padre
  const handleSubmit = async () => {
    if (disabledSubmit) return;

    // La fecha ya viene en formato correcto "YYYY-MM-DD" del input
    // No necesitamos convertirla - solo asegurarnos que existe
    const fechaStr = form.fecha || getTodayLocalDate();

    const formParaService = {
      ...form,
      fecha: fechaStr, // normalizada para el mapper
    };

    try {
      // Llamamos al callback del padre que manejará la lógica de crear/actualizar
      await onSave?.(formParaService, isEdit);
      // Si llegamos aquí, fue exitoso - el modal se cerrará desde el padre
    } catch (e) {
      // console.error("Error guardando ingreso", {
      //   status: e?.response?.status,
      //   data: e?.response?.data,
      //   message: e?.message,
      // });
      showError(
        e?.message || e?.response?.data?.message || "No se pudo guardar el ingreso."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container modal-wide" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2>
          {isEdit ? "Editar ingreso" : "Nuevo ingreso"}
        </h2>

        <div className="modal-alerts">
          {!isEdit && form.detalles.length === 0 && (
            <div className="alert warning">Agrega al menos un producto.</div>
          )}
          {(!isEdit || editable) &&
            (form.detalles.length === 0 ||
              !Number.isFinite(proveedorIdNum) ||
              proveedorIdNum <= 0) && (
              <>
                {(!Number.isFinite(proveedorIdNum) ||
                  proveedorIdNum <= 0) && (
                  <div className="alert warning">
                    Debes seleccionar un proveedor.
                  </div>
                )}
              </>
            )}

        </div>

        <div className="modal-grid">
          {/* Izquierda - Formulario y productos seleccionados */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setField("fecha", e.target.value)}
                  disabled={isEdit && !editable}
                />
              </label>

              <label>
                N° Factura
                <input
                  type="text"
                  value={form.numeroFactura}
                  onChange={(e) => setField("numeroFactura", e.target.value)}
                  disabled={!editable && isEdit}
                />
              </label>

              <label>
                Proveedor
                <div className="proveedor-input-group">
                  <input
                    type="text"
                    value={form.proveedorNombre || ""}
                    readOnly
                    onClick={() => editable && !isEdit && setShowProveedorModal(true)}
                    placeholder="Haz clic para seleccionar un proveedor..."
                    disabled={!editable && isEdit}
                    className="proveedor-input"
                    style={{
                      cursor: editable && !isEdit ? 'pointer' : 'not-allowed',
                      backgroundColor: editable && !isEdit ? '#fff' : '#f5f5f5'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editable && !isEdit) {
                        setProveedorSearchModal("");
                        setShowProveedorModal(true);
                      }
                    }}
                    className="btn-guardar proveedor-select-btn"
                    disabled={!editable && isEdit}
                  >
                    {form.proveedorId ? 'Cambiar' : 'Seleccionar'}
                  </button>
                </div>
              </label>

              <label className="full">
                Observaciones
                <input
                  type="text"
                  value={form.observaciones}
                  onChange={(e) => setField("observaciones", e.target.value)}
                  disabled={!editable && isEdit}
                />
              </label>
            </div>

            <h3 style={{ marginTop: 8 }}>Productos del ingreso</h3>
            <div className="selected-products">
              {form.detalles.length === 0 ? (
                <div className="empty-sub">
                  Doble clic en la tabla de la derecha para agregar.
                </div>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Color</th>
                      <th style={{ width: 110 }}>Cantidad</th>
                      <th style={{ width: 130 }}>Costo unit.</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.detalles.map((d, idx) => (
                      <tr
                        key={String(d.producto.id ?? `${d.producto.nombre}-${idx}`)}
                      >
                        <td>
                          <input
                            type="text"
                            value={d.producto.nombre}
                            readOnly
                            disabled
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={d.producto.codigo ?? ""}
                            readOnly
                            disabled
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                          />
                        </td>
                        <td>
                          <span className={`color-badge color-${(d.producto.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}
                            style={{ display: 'inline-block', minWidth: 48, textAlign: 'center' }}
                          >
                            {d.producto.color ?? "N/A"}
                          </span>
                        </td>
                        <td>
                          <input
                            className="qty-input"
                            type="text"
                            inputMode="numeric"
                            value={d.cantidad && d.cantidad > 0 ? d.cantidad : ""}
                            onChange={(e) =>
                              setDetalle(idx, "cantidad", e.target.value)
                            }
                            onKeyDown={(e) => {
                              // Permitir: números, backspace, delete, tab, escape, enter, y teclas de navegación
                              if (!/[0-9]/.test(e.key) && 
                                  !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            disabled={!editable && isEdit}
                            placeholder="Cantidad"
                          />
                        </td>
                        <td>
                          <input
                            className="qty-input"
                            type="text"
                            inputMode="decimal"
                            value={d.costoUnitario && Number(d.costoUnitario) > 0 ? d.costoUnitario : ""}
                            onChange={(e) =>
                              setDetalle(idx, "costoUnitario", e.target.value)
                            }
                            onKeyDown={(e) => {
                              // Permitir: números, punto decimal, backspace, delete, tab, escape, enter, y teclas de navegación
                              if (!/[0-9.]/.test(e.key) && 
                                  !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            disabled={!editable && isEdit}
                            placeholder="Costo"
                          />
                        </td>
                        <td>
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={() => removeDetalle(idx)}
                            disabled={!editable && isEdit}
                            title={
                              !editable && isEdit
                                ? "Edición bloqueada"
                                : "Quitar"
                            }
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} style={{ textAlign: "right", fontWeight: 600 }}>
                        Total
                      </td>
                      <td colSpan={2} style={{ fontWeight: 700 }}>
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(totalCosto)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Centro - Sidebar de categorías */}
          <div className="pane pane-sidebar">
            <div className="category-section">
              <CategorySidebar 
                categories={categorias}
                selectedId={selectedCategoryId}
                onSelect={(id) => {
                  // Determinar el color por defecto según la categoría
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
                  
                  const selectedCategory = categorias.find(cat => cat.id === id);
                  const categoriaNombre = selectedCategory?.nombre?.toUpperCase().trim() || "";
                  
                  const tieneMate = categoriasConMate.some(cat => 
                    cat.toUpperCase().trim() === categoriaNombre
                  );
                  
                  const colorDefault = tieneMate ? "MATE" : "";
                  
                  setSelectedCategoryId(id);
                  setSelectedColor(colorDefault);
                }}
                hideAllCategory={true}
              />
            </div>
          </div>

          {/* Derecha - Inventario/Catálogo */}
          <div className="pane pane-right">
            <div className="inv-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <h3 style={{ margin: 0 }}>
                  Catálogo de Productos
                  {selectedCategoryId && categorias.find(c => c.id === selectedCategoryId) && (
                    <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>
                      {' '}• {categorias.find(c => c.id === selectedCategoryId)?.nombre}
                    </span>
                  )}
                </h3>
              </div>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar por nombre o código…"
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                disabled={!editable && isEdit}
                style={{ flex: 1, minWidth: '160px' }}
              />
              <select
                className="filter-select"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "0.9rem",
                  minWidth: "140px"
                }}
                disabled={!editable && isEdit}
              >
                <option value="">Todos los colores</option>
                <option value="MATE">MATE</option>
                <option value="BLANCO">BLANCO</option>
                <option value="NEGRO">NEGRO</option>
                <option value="BRONCE">BRONCE</option>
                <option value="NA">NA</option>
              </select>
            </div>

            {catalogoFiltrado.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', textAlign: 'right' }}>
                {catalogoFiltrado.length} producto{catalogoFiltrado.length !== 1 ? 's' : ''} encontrado{catalogoFiltrado.length !== 1 ? 's' : ''}
              </div>
            )}

            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: esCategoriaVidrio ? "30%" : "45%" }}>Nombre</th>
                    <th style={{ width: "20%" }}>Código</th>
                    {!esCategoriaVidrio && <th style={{ width: "15%" }}>Color</th>}
                    {esCategoriaVidrio && <th style={{ width: "10%", textAlign: 'right' }}>MM</th>}
                    {esCategoriaVidrio && <th style={{ width: "10%", textAlign: 'right' }}>M1</th>}
                    {esCategoriaVidrio && <th style={{ width: "10%", textAlign: 'right' }}>M2</th>}
                    <th style={{ width: "15%", textAlign: 'right' }}>Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProductos ? (
                    <tr>
                      <td colSpan={esCategoriaVidrio ? 6 : 4} className="empty" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                        Cargando productos...
                      </td>
                    </tr>
                  ) : catalogoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={esCategoriaVidrio ? 6 : 4} className="empty" style={{ textAlign: 'center', padding: '2rem' }}>
                        {selectedCategoryId ? 'No hay productos en esta categoría' : 'Selecciona una categoría para ver productos'}
                      </td>
                    </tr>
                  ) : (
                    catalogoFiltrado.map((item) => (
                      <tr
                        key={String(item.id)}
                        onDoubleClick={() => {
                          if (editable || !isEdit) addProducto(item);
                        }}
                        title={
                          !editable && isEdit
                            ? "Edición bloqueada"
                            : "Doble clic para agregar"
                        }
                        style={{
                          cursor: !editable && isEdit ? "not-allowed" : "pointer",
                        }}
                      >
                        <td onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>{item.nombre}</td>
                        <td onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>{obtenerCodigoProducto(item) || "-"}</td>
                        {!esCategoriaVidrio && (
                          <td onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>
                            <span className={`color-badge color-${(item.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}
                              style={{ display: 'inline-block', minWidth: 48, textAlign: 'center' }}
                            >
                              {item.color ?? "N/A"}
                            </span>
                          </td>
                        )}
                        {esCategoriaVidrio && (
                          <td style={{ textAlign: 'right' }} onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>
                            {item.mm ?? item.grosorMm ?? '—'}
                          </td>
                        )}
                        {esCategoriaVidrio && (
                          <td style={{ textAlign: 'right' }} onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>
                            {item.m1 ?? item.largoCm ?? '—'}
                          </td>
                        )}
                        {esCategoriaVidrio && (
                          <td style={{ textAlign: 'right' }} onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}>
                            {item.m2 ?? item.anchoCm ?? '—'}
                          </td>
                        )}
                        <td
                          style={{ textAlign: 'right', fontWeight: '500', color: '#1e2753' }}
                          onDoubleClick={(e) => { e.stopPropagation(); if (editable || !isEdit) addProducto(item); }}
                        >
                          {item.costo != null
                            ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.costo)
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">
            Cerrar
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            type="button"
            disabled={disabledSubmit}
            title={
              disabledSubmit
                ? "Completa proveedor, productos y corrige validaciones"
                : isEdit
                ? "Guardar"
                : "Crear ingreso"
            }
          >
            {isEdit ? "Guardar" : "Crear ingreso"}
          </button>
        </div>
      </div>

      {/* Modal de selección de proveedores */}
      {showProveedorModal && (
        <div className="modal-overlay proveedor-seleccion-overlay" style={{ zIndex: 100001 }}>
          <div className="proveedor-seleccion-modal-container">
            <header className="modal-header proveedor-seleccion-header">
              <h2>Seleccionar Proveedor</h2>
              <button 
                className="close-btn-proveedor" 
                onClick={() => {
                  setProveedorSearchModal("");
                  setShowProveedorModal(false);
                }}
              >
                ✕
              </button>
            </header>
            
            <div className="proveedor-seleccion-search-container">
              <input
                type="text"
                value={proveedorSearchModal}
                onChange={(e) => setProveedorSearchModal(e.target.value)}
                placeholder="Buscar proveedor por nombre, NIT, ciudad, dirección o teléfono..."
                className="clientes-input"
                style={{
                  width: '100%',
                  fontSize: '1rem',
                  padding: '0.5rem',
                  border: '1px solid #d2d5e2',
                  borderRadius: '5px'
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = proveedorSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? proveedoresLista.filter((p) =>
                      [p.nombre, p.nit, p.ciudad, p.direccion, p.telefono]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : proveedoresLista;
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </div>
                );
              })()}
            </div>
            
            <div className="proveedor-seleccion-table-container">
              {(() => {
                const searchTerm = proveedorSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? proveedoresLista.filter((p) =>
                      [p.nombre, p.nit, p.ciudad, p.direccion, p.telefono]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : proveedoresLista;
                
                // Ordenar alfabéticamente
                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  // Si "VARIOS" está en alguno, siempre va primero
                  if (nombreA === "varios") return -1;
                  if (nombreB === "varios") return 1;
                  return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                });
                
                if (sorted.length === 0) {
                  return (
                    <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                      No se encontraron proveedores
                    </div>
                  );
                }
                
                return (
                  <div style={{ 
                    overflowX: 'auto', 
                    overflowY: 'auto',
                    maxWidth: '100%',
                    width: '100%',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    <table className="table proveedor-seleccion-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--color-dark-blue, #1e2753)', color: '#fff' }}>
                        <tr>
                          <th style={{ width: '35%', padding: '0.6rem 0.75rem', fontWeight: 600 }}>Nombre</th>
                          <th style={{ width: '15%', padding: '0.6rem 0.75rem', fontWeight: 600 }}>NIT</th>
                          <th style={{ width: '15%', padding: '0.6rem 0.75rem', fontWeight: 600 }}>Ciudad</th>
                          <th style={{ width: '15%', padding: '0.6rem 0.75rem', fontWeight: 600 }}>Dirección</th>
                          <th style={{ width: '10%', padding: '0.6rem 0.75rem', fontWeight: 600 }}>Teléfono</th>
                          <th style={{ width: '10%', padding: '0.6rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((p) => (
                          <tr key={p.id}>
                            <td title={p.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {p.nombre || '-'}
                            </td>
                            <td title={p.nit || '-'}>
                              {p.nit || '-'}
                            </td>
                            <td title={p.ciudad || '-'}>
                              {p.ciudad || '-'}
                            </td>
                            <td title={p.direccion || '-'}>
                              {p.direccion || '-'}
                            </td>
                            <td title={p.telefono || '-'}>
                              {p.telefono || '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleProveedorSelect(p)}
                                className="btn-guardar"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.9rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            
            <div className="proveedor-seleccion-footer">
              <button 
                className="proveedor-seleccion-cancel-btn" 
                onClick={() => {
                  setProveedorSearchModal("");
                  setShowProveedorModal(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
