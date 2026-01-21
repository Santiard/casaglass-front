// src/modals/MovimientoModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/MovimientoNuevoModal.css";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import { listarCategorias } from "../services/CategoriasService.js";
import { getTodayLocalDate, toLocalDateOnly } from "../lib/dateUtils.js";
import { actualizarDetallesBatch } from "../services/TrasladosService.js";

const VACIO = {
  sedeOrigenId: "",
  sedeDestinoId: "",
  fecha: getTodayLocalDate(),
  productos: [], // { id, nombre, sku?, cantidad }
};

export default function MovimientoModal({
  movimiento,
  isOpen,
  onClose,
  onSave,
  sedes = [],            // [{ id, nombre }]
  catalogoProductos = [],// [{ id, nombre, codigo }]
}) {
  const isEdit = Boolean(movimiento?.id);
  const [form, setForm] = useState(VACIO);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState("MATE"); // Filtro de color
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [editableWithin2d, setEditableWithin2d] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // En edición: permitimos cambiar cabecera Y productos si NO está confirmado
  // Los productos se editan usando endpoints de detalles (agregar, eliminar, actualizar)
  const estaConfirmado = Boolean(movimiento?.trabajadorConfirmacion);
  const canEditHeader = !isEdit || (editableWithin2d && !estaConfirmado);
  const canEditProducts = !isEdit || !estaConfirmado; // productos editables si NO está confirmado

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

  // Cargar datos iniciales
  useEffect(() => {
    setErrorMsg("");
    if (movimiento) {
      const base = {
        sedeOrigenId: movimiento.sedeOrigen?.id ?? "",
        sedeDestinoId: movimiento.sedeDestino?.id ?? "",
        fecha:
          toLocalDateOnly(movimiento.fecha) ??
          getTodayLocalDate(),
        productos: Array.isArray(movimiento.detalles)
          ? movimiento.detalles.map((d) => ({
              id: d.producto?.id ?? "",
              detalleId: d.id ?? null, // ID del detalle (para editar/eliminar)
              nombre: d.producto?.nombre ?? "",
              sku: d.producto?.codigo ?? "",
              color: d.producto?.color ?? "",
              cantidad: d.cantidad && Number(d.cantidad) > 0 ? Number(d.cantidad) : "",
            }))
          : [],
      };
      setForm(base);

      // Bloquear edición completa si pasaron más de 2 días (afecta cabecera)
      const f = new Date(`${base.fecha}T00:00:00`);
      const diff = isNaN(f)
        ? 0
        : (Date.now() - f.getTime()) / (1000 * 60 * 60 * 24);
      setEditableWithin2d(diff <= 2);
    } else {
      setForm(VACIO);
      setEditableWithin2d(true);
    }
    setSearch("");
    setSelectedCategoryId(null);
    setIsSubmitting(false);
  }, [movimiento, isOpen]);

  // Cargar categorías desde el servidor
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategorias(cats || []);
        // Seleccionar por defecto la primera categoría que no sea "TODAS"
        const primeraCategoria = cats.find(cat => 
          cat.nombre.toUpperCase() !== "TODAS" && 
          cat.nombre.toUpperCase() !== "TODAS LAS CATEGORÍAS"
        );
        if (primeraCategoria && !movimiento) {
          setSelectedCategoryId(primeraCategoria.id);
        }
      } catch (e) {
        console.error("Error cargando categorías:", e);
        setCategorias([]);
      }
    };
    
    if (isOpen) {
      fetchCategorias();
    } else {
      setCategorias([]);
      setSelectedColor("MATE"); // Reset al color por defecto
      setSelectedCategoryId(null);
    }
  }, [isOpen, movimiento]);

  // Filtro de catálogo por categoría y búsqueda
  const catalogoFiltrado = useMemo(() => {
    let filtered = catalogoProductos;
    
    // Filtrar cortes: excluir productos que tengan largoCm (son cortes)
    // Los cortes nunca se compran o trasladan, solo se quedan en la sede donde son generados
    filtered = filtered.filter(p => {
      // Incluir solo productos donde largoCm NO esté definido (undefined o null)
      // Si largoCm existe (incluso si es 0), es un corte y debe excluirse
      return p.largoCm === undefined || p.largoCm === null;
    });
    
    // Filtrar por categoría si está seleccionada
    if (selectedCategoryId) {
      const selectedCategory = categorias.find(cat => cat.id === selectedCategoryId);
      if (selectedCategory) {
        filtered = filtered.filter(p => p.categoria === selectedCategory.nombre);
      }
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
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.nombre ?? "").toLowerCase().includes(q) ||
          (p.codigo ?? "").toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [catalogoProductos, search, selectedCategoryId, selectedColor, categorias]);

  // Validaciones
  const mismaSede =
    form.sedeOrigenId && form.sedeDestinoId && form.sedeOrigenId === form.sedeDestinoId;
  const faltanCampos = !form.sedeOrigenId || !form.sedeDestinoId || !form.fecha;
  const cantidadesInvalidas = form.productos.some(
    (p) => {
      const cantidad = Number(p.cantidad);
      return p.cantidad === "" || p.cantidad === null || !Number.isFinite(cantidad) || cantidad <= 0;
    }
  );

  const disabledSubmitBase =
    faltanCampos || mismaSede || cantidadesInvalidas || isSubmitting;

  // En crear: debe haber productos; en editar: se ignoran productos, no bloquea
  const disabledSubmit = isEdit
    ? (!canEditHeader || disabledSubmitBase)
    : (disabledSubmitBase || form.productos.length === 0);

  // Handlers
  const handleChange = (field, value) => {
    // Cabecera solo editable si canEditHeader
    if (!canEditHeader) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProducto = (item) => {
    if (!canEditProducts) return;
    
    // Evitar duplicados (verificar por id de producto)
    if (form.productos.some((p) => String(p.id) === String(item.id))) return;
    
    // Siempre agregar al estado local (tanto en creación como en edición)
    setForm((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          id: item.id,
          detalleId: null, // null indica que es nuevo y debe agregarse al backend
          nombre: item.nombre,
          sku: item.codigo ?? "",
          color: item.color ?? "",
          cantidad: "", // Inicia vacío
          esNuevo: isEdit, // Marca como nuevo solo si estamos editando
        },
      ],
    }));
  };

  const handleProductoChange = (idx, field, value) => {
    if (!canEditProducts) return;
    setForm((prev) => {
      const arr = [...prev.productos];
      if (field === "cantidad") {
        // Permitir string vacío o solo números
        const filtered = value.toString().replace(/[^0-9]/g, '');
        arr[idx] = {
          ...arr[idx],
          [field]: filtered === "" ? "" : filtered, // Mantener como string hasta el submit
        };
      } else {
        arr[idx] = {
          ...arr[idx],
          [field]: value,
        };
      }
      return { ...prev, productos: arr };
    });
  };


  const removeProducto = (idx) => {
    if (!canEditProducts) return;
    
    const producto = form.productos[idx];
    
    // Si tiene detalleId (existe en backend), marcarlo como eliminado
    // Si no tiene detalleId (es nuevo), simplemente quitarlo del array
    if (producto.detalleId) {
      setForm((prev) => {
        const arr = [...prev.productos];
        arr[idx] = { ...arr[idx], eliminar: true };
        return { ...prev, productos: arr };
      });
    } else {
      // Producto nuevo que aún no se guardó, simplemente quitarlo
      setForm((prev) => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== idx),
      }));
    }
  };

  // Guardar
  const handleSubmit = async () => {
    if (disabledSubmit) return;
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      if (isEdit) {
        // Editar: cabecera + procesar cambios en productos
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        };
        await onSave(payload, true);
        
        // Procesar cambios en productos si no está confirmado usando endpoint batch
        if (!estaConfirmado) {
          // Recopilar todos los cambios para enviarlos en una sola transacción
          const cambiosBatch = {
            crear: [],
            actualizar: [],
            eliminar: []
          };
          
          // 1. Productos a eliminar (tienen detalleId y están marcados para eliminar)
          const productosAEliminar = form.productos.filter(p => p.eliminar && p.detalleId);
          cambiosBatch.eliminar = productosAEliminar.map(p => p.detalleId);
          
          // 2. Productos nuevos a crear (no tienen detalleId y no están marcados para eliminar)
          const productosNuevos = form.productos.filter(p => !p.detalleId && !p.eliminar);
          cambiosBatch.crear = productosNuevos
            .filter(p => {
              const cantidad = Number(p.cantidad);
              return cantidad > 0;
            })
            .map(p => ({
              productoId: Number(p.id),
              cantidad: Number(p.cantidad)
            }));
          
          // 3. Productos existentes a actualizar (tienen detalleId y no están marcados para eliminar)
          const productosExistentes = form.productos.filter(p => p.detalleId && !p.eliminar);
          cambiosBatch.actualizar = productosExistentes
            .filter(p => {
              const cantidad = Number(p.cantidad);
              return cantidad > 0;
            })
            .map(p => ({
              detalleId: p.detalleId,
              cantidad: Number(p.cantidad)
            }));
          
          // Debug: Ver qué se va a enviar
          console.log('🔍 Cambios batch a enviar:', JSON.stringify({
            eliminar: cambiosBatch.eliminar,
            crear: cambiosBatch.crear,
            actualizar: cambiosBatch.actualizar
          }, null, 2));
          console.log('📦 Productos marcados para eliminar:', JSON.stringify(productosAEliminar, null, 2));
          console.log('📦 Todos los productos en form:', JSON.stringify(form.productos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            detalleId: p.detalleId,
            eliminar: p.eliminar,
            cantidad: p.cantidad
          })), null, 2));
          
          // Solo hacer la llamada batch si hay cambios
          if (cambiosBatch.eliminar.length > 0 || 
              cambiosBatch.crear.length > 0 || 
              cambiosBatch.actualizar.length > 0) {
            await actualizarDetallesBatch(movimiento.id, cambiosBatch);
          }
        }
      } else {
        // Crear: cabecera + detalles
        // Filtrar productos con cantidad vacía o 0 antes de enviar
        const productosValidos = form.productos.filter((p) => {
          const cantidad = Number(p.cantidad);
          return p.cantidad !== "" && p.cantidad !== null && Number.isFinite(cantidad) && cantidad > 0;
        });
        
        // Validar que haya al menos un producto válido después de filtrar
        if (productosValidos.length === 0) {
          setErrorMsg("Debe haber al menos un producto con cantidad válida para crear el traslado.");
          setIsSubmitting(false);
          return;
        }
        
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
          detalles: productosValidos.map((p) => ({
            producto: { id: Number(p.id) },
            cantidad: Number(p.cantidad),
          })),
        };
        await onSave(payload, false);
      }
      onClose();
    } catch (e) {
      const msg =
        e?.response?.data ||
        e?.message ||
        "No se pudo guardar el traslado.";
      setErrorMsg(String(msg));
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container modal-wide" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2>
          {isEdit ? "Editar traslado" : "Nuevo traslado"}
          {isEdit && estaConfirmado && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura: traslado confirmado)
            </span>
          )}
          {isEdit && !estaConfirmado && !editableWithin2d && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura cabecera: &gt; 2 días)
            </span>
          )}
        </h2>

        {/* Alertas */}
        <div className="modal-alerts">
          {errorMsg && <div className="alert error">{errorMsg}</div>}
          {mismaSede && (
            <div className="alert error">
              La sede de origen y destino no pueden ser la misma.
            </div>
          )}
          {cantidadesInvalidas && (
            <div className="alert error">
              Hay cantidades inválidas (deben ser números &gt; 0).
            </div>
          )}
          {!isEdit && form.productos.length === 0 && (
            <div className="alert warning">
              Debes agregar al menos un producto al traslado.
            </div>
          )}
          {isEdit && !estaConfirmado && (
            <div className="alert info">
              Puedes editar la cabecera (fecha y sedes) y los productos mientras el traslado NO esté confirmado.
            </div>
          )}
          {isEdit && estaConfirmado && (
            <div className="alert warning">
              Este traslado ya fue confirmado. No se puede editar.
            </div>
          )}
        </div>

        <div className="modal-grid">
          {/* Panel izquierdo: formulario */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Sede origen
                <select
                  value={form.sedeOrigenId}
                  onChange={(e) => handleChange("sedeOrigenId", e.target.value)}
                  disabled={!canEditHeader}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.id === Number(form.sedeDestinoId)}
                    >
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sede destino
                <select
                  value={form.sedeDestinoId}
                  onChange={(e) =>
                    handleChange("sedeDestinoId", e.target.value)
                  }
                  disabled={!canEditHeader}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.id === Number(form.sedeOrigenId)}
                    >
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                  disabled={!canEditHeader}
                />
              </label>
            </div>

            <h3>Productos del traslado</h3>
            {form.productos.filter(p => !p.eliminar).length === 0 ? (
              <div className="empty-sub">
                {isEdit && estaConfirmado
                  ? "Este traslado ya fue confirmado. No se pueden editar los productos."
                  : "Doble clic en el catálogo para agregar productos."}
              </div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Color</th>
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.productos.filter(p => !p.eliminar).map((p) => {
                    const originalIdx = form.productos.findIndex(prod => prod.id === p.id && !prod.eliminar);
                    return (
                    <tr key={String(p.id)}>
                      <td>
                        {p.nombre}
                        {p.esNuevo && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981' }}>(Nuevo)</span>}
                      </td>
                      <td>{p.sku ?? "-"}</td>
                      <td>{p.color ?? "-"}</td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={p.cantidad && Number(p.cantidad) > 0 ? p.cantidad : ""}
                          onChange={(e) =>
                            handleProductoChange(originalIdx, "cantidad", e.target.value)
                          }
                          onKeyDown={(e) => {
                            // Permitir: números, backspace, delete, tab, escape, enter, y puntos decimales (aunque no los usaremos)
                            if (!/[0-9]/.test(e.key) && 
                                !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key) &&
                                !(e.key === 'a' && e.ctrlKey) && // Ctrl+A
                                !(e.key === 'c' && e.ctrlKey) && // Ctrl+C
                                !(e.key === 'v' && e.ctrlKey) && // Ctrl+V
                                !(e.key === 'x' && e.ctrlKey)) { // Ctrl+X
                              e.preventDefault();
                            }
                          }}
                          placeholder="Cantidad"
                          disabled={!canEditProducts}
                        />
                      </td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => removeProducto(originalIdx)}
                          disabled={!canEditProducts}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Centro - Sidebar de categorías */}
          <div className="pane pane-sidebar">
            <div className="category-section">
              <CategorySidebar 
                categories={[
                  { id: null, nombre: "Todas" },
                  ...categorias
                ]}
                selectedId={selectedCategoryId}
                onSelect={(id) => setSelectedCategoryId(id === null ? null : id)}
              />
            </div>
          </div>

          {/* Panel derecho: catálogo */}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!canEditProducts}
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
                disabled={!canEditProducts}
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
                    <th style={{ width: "55%" }}>Nombre</th>
                    <th style={{ width: "30%" }}>Código</th>
                    <th style={{ width: "15%" }}>Color</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty">
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    catalogoFiltrado.map((item) => (
                      <tr
                        key={String(item.id)}
                        onDoubleClick={() => {
                          if (canEditProducts) addProducto(item);
                        }}
                        title={
                          isEdit
                            ? "Solo lectura en edición"
                            : "Doble clic para agregar"
                        }
                        style={{
                          cursor: canEditProducts ? "pointer" : "not-allowed",
                          opacity: canEditProducts ? 1 : 0.6,
                        }}
                      >
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{item.nombre}</td>
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{item.codigo ?? "-"}</td>
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{item.color ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} disabled={isSubmitting}>
            {isEdit && !editableWithin2d ? "Cerrar" : "Cancelar"}
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            disabled={disabledSubmit}
            title={
              disabledSubmit
                ? "Completa la información o corrige validaciones"
                : (isEdit ? "Guardar cambios" : "Crear traslado")
            }
          >
            {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear traslado"}
          </button>
        </div>
      </div>
    </div>
  );
}
