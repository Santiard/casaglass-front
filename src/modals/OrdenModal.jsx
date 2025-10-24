import { useEffect, useMemo, useState } from "react";
import "../styles/MovimientoNuevoModal.css";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import { listarClientes } from "../services/ClientesService.js";
import { listarSedes } from "../services/SedesService.js";
import { listarTrabajadores } from "../services/TrabajadoresService.js";
import { listarProductos } from "../services/ProductosService.js";
import { listarCategorias } from "../services/CategoriasService.js";
import { actualizarOrden, obtenerOrden, actualizarOrdenVenta } from "../services/OrdenesService.js";

import { api } from "../lib/api";
// Utilidad para formato de fecha
const toLocalDateOnly = (val) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return new Date().toISOString().slice(0, 10);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function OrdenEditarModal({
  orden,
  isOpen,
  onClose,
  onSave, // función del padre (OrdenesPage -> fetchData)
}) {
  const [form, setForm] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =============================
  // Cargar datos iniciales
  // =============================
  useEffect(() => {
    if (!isOpen || !orden?.id) return;

    // Obtener datos frescos de la orden desde el backend
    const cargarOrdenCompleta = async () => {
      try {
        console.log("🔄 Cargando orden completa desde backend, ID:", orden.id);
        const ordenCompleta = await obtenerOrden(orden.id);
        console.log("📥 Orden completa recibida:", ordenCompleta);
        
        const base = {
          id: ordenCompleta.id,
          fecha: toLocalDateOnly(ordenCompleta.fecha),
          obra: ordenCompleta.obra ?? "",
          venta: ordenCompleta.venta ?? false,
          credito: ordenCompleta.credito ?? false,
          clienteNombre: ordenCompleta.cliente?.nombre ?? "",
          trabajadorNombre: ordenCompleta.trabajador?.nombre ?? "",
          sedeNombre: ordenCompleta.sede?.nombre ?? "",
          clienteId: ordenCompleta.cliente?.id ?? "",
          trabajadorId: ordenCompleta.trabajador?.id ?? "",
          sedeId: ordenCompleta.sede?.id ?? "",
          items:
            ordenCompleta.items?.map((i) => ({
              id: i.id,
              productoId: i.producto?.id ?? null, // Preservar el ID real del producto
              codigo: i.producto?.codigo ?? "",
              nombre: i.producto?.nombre ?? "",
              descripcion: i.descripcion ?? "",
              cantidad: Number(i.cantidad ?? 1),
              precioUnitario: Number(i.precioUnitario ?? 0),
              totalLinea: Number(i.totalLinea ?? 0),
              eliminar: false,
            })) ?? [],
        };
        
        console.log("🔍 Inicializando form con orden completa:", ordenCompleta);
        console.log("📋 Base form generado:", base);
        setForm(base);
      } catch (e) {
        console.error("Error cargando orden completa:", e);
        // Fallback a los datos que ya tenemos
        const base = {
          id: orden.id,
          fecha: toLocalDateOnly(orden.fecha),
          obra: orden.obra ?? "",
          venta: orden.venta ?? false,
          credito: orden.credito ?? false,
          clienteNombre: orden.cliente?.nombre ?? "",
          trabajadorNombre: orden.trabajador?.nombre ?? "",
          sedeNombre: orden.sede?.nombre ?? "",
          clienteId: orden.cliente?.id ?? "",
          trabajadorId: orden.trabajador?.id ?? "",
          sedeId: orden.sede?.id ?? "",
          items:
            orden.items?.map((i) => ({
              id: i.id,
              productoId: i.producto?.id ?? null, // Preservar el ID real del producto
              codigo: i.producto?.codigo ?? "",
              nombre: i.producto?.nombre ?? "",
              descripcion: i.descripcion ?? "",
              cantidad: Number(i.cantidad ?? 1),
              precioUnitario: Number(i.precioUnitario ?? 0),
              totalLinea: Number(i.totalLinea ?? 0),
              eliminar: false,
            })) ?? [],
        };
        
        console.log("🔍 Fallback: Inicializando form con orden recibida:", orden);
        console.log("📋 Base form generado (fallback):", base);
        setForm(base);
      }
    };

    cargarOrdenCompleta();
  }, [orden, isOpen]);

  // =============================
  // Cargar catálogos
  // =============================
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        console.log("Cargando catálogos...");
        
        // Cargar cada servicio por separado para identificar errores específicos
        let c = [], t = [], s = [], cats = [], prods = [];
        
        try {
          c = await listarClientes();
          console.log("✅ Clientes cargados:", c.length);
        } catch (e) {
          console.error("❌ Error cargando clientes:", e);
        }
        
        try {
          t = await listarTrabajadores();
          console.log("✅ Trabajadores cargados:", t.length);
        } catch (e) {
          console.error("❌ Error cargando trabajadores:", e);
        }
        
        try {
          s = await listarSedes();
          console.log("✅ Sedes cargadas:", s.length);
        } catch (e) {
          console.error("❌ Error cargando sedes:", e);
        }
        
        try {
          cats = await listarCategorias();
          console.log("✅ Categorías cargadas:", cats.length);
        } catch (e) {
          console.error("❌ Error cargando categorías:", e);
        }
        
        try {
          prods = await listarProductos();
          console.log("✅ Productos cargados:", prods.length);
        } catch (e) {
          console.error("❌ Error cargando productos:", e);
        }
        
        setClientes(c);
        setTrabajadores(t);
        setSedes(s);
        setCategorias(cats);
        setCatalogoProductos(prods);
        
        console.log("✅ Catálogos cargados exitosamente");
      } catch (e) {
        console.error("Error general cargando catálogos:", e);
      }
    })();
  }, [isOpen]);

  // =============================
  // Filtro de catálogo
  // =============================
  const catalogoFiltrado = useMemo(() => {
    let filtered = catalogoProductos;
    if (selectedCategoryId) {
      const selected = categorias.find((c) => c.id === selectedCategoryId);
      if (selected)
        filtered = filtered.filter(
          (p) => p.categoria === selected.nombre
        );
    }
    const q = search.trim().toLowerCase();
    if (q)
      filtered = filtered.filter(
        (p) =>
          (p.nombre ?? "").toLowerCase().includes(q) ||
          (p.codigo ?? "").toLowerCase().includes(q)
      );
    return filtered;
  }, [catalogoProductos, search, selectedCategoryId, categorias]);

  if (!isOpen || !form) return null;

  // =============================
  // Handlers
  // =============================
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const arr = [...prev.items];
      const item = { ...arr[idx] };
      
      if (field === "cantidad") {
        item.cantidad = Number(value) || 0;
        // Recalcular total de línea automáticamente
        item.totalLinea = item.cantidad * item.precioUnitario;
      } else if (field === "precioUnitario") {
        item.precioUnitario = Number(value) || 0;
        // Recalcular total de línea automáticamente
        item.totalLinea = item.cantidad * item.precioUnitario;
      } else {
        item[field] = field === "totalLinea" ? Number(value) : value;
      }
      
      arr[idx] = item;
      return { ...prev, items: arr };
    });
  };

  const addProducto = (item) => {
    console.log("🔄 Intentando agregar producto:", item);
    console.log("📋 Estado actual de items:", form?.items);
    
    setForm((prev) => {
      console.log("📝 Form anterior:", prev);
      
      const yaExiste = prev.items.some((i) => i.codigo === item.codigo && !i.eliminar);
      if (yaExiste) {
        console.log("⚠️ Producto ya existe en la lista");
        alert("Este producto ya está en la lista");
        return prev; // evitar duplicados
      }
      
      // Obtener el precio según la sede del usuario (necesitamos acceso a la sede)
      const precioUnitario = item.precio1 || 0; // Por ahora usar precio1, después se puede mejorar
      
      const nuevo = {
        id: null,
        productoId: item.id,
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion || "",
        cantidad: 1,
        precioUnitario: precioUnitario,
        totalLinea: precioUnitario, // 1 * precioUnitario
        eliminar: false,
      };
      
      const nuevosItems = [...prev.items, nuevo];
      console.log("✅ Producto agregado:", nuevo);
      console.log("📋 Nueva lista de items:", nuevosItems);
      
      return { ...prev, items: nuevosItems };
    });
  };

  const marcarEliminar = (idx) => {
    setForm((prev) => {
      const arr = [...prev.items];
      arr[idx].eliminar = !arr[idx].eliminar;
      return { ...prev, items: arr };
    });
  };

  const handleSubmit = async () => {
  try {
    // Verificar si la orden está anulada
    if (orden?.estado?.toLowerCase() === 'anulada') {
      alert("No se puede editar una orden anulada. Las órdenes anuladas no pueden ser modificadas.");
      return;
    }

    const payload = {
    id: orden.id,
    fecha: toLocalDateOnly(form.fecha),
    obra: form.obra,
    venta: form.venta,
    credito: form.credito,
    clienteId: Number(form.clienteId),
    trabajadorId: Number(form.trabajadorId),
    sedeId: Number(form.sedeId),
    items: form.items.map((i) => ({
      id: i.id ?? null,
      // Usar el productoId que ya tenemos preservado
      productoId: Number(i.productoId ?? 0),
      descripcion: i.descripcion ?? "",
      cantidad: Number(i.cantidad ?? 1),
      precioUnitario: Number(i.precioUnitario ?? 0),
      totalLinea: Number(i.totalLinea ?? 0),
      eliminar: Boolean(i.eliminar ?? false),
      // Marcar si es un producto nuevo (sin ID de item de orden)
      esNuevo: i.id === null,
    })),
};

    console.log("Guardando orden con payload:", payload);
    console.log("🔍 Detalles del payload:");
    console.log("  - ID de orden:", form.id);
    console.log("  - Es venta:", form.venta);
    console.log("  - Es crédito:", form.credito);
    console.log("  - Sede ID:", form.sedeId);
    console.log("  - Total items:", payload.items.length);
    console.log("  - Items nuevos:", payload.items.filter(i => i.esNuevo).length);
    console.log("  - Items eliminados:", payload.items.filter(i => i.eliminar).length);
    
    // Usar el endpoint específico para órdenes de venta si es una venta
    let data;
    if (form.venta) {
      console.log("🛒 Es una orden de venta, usando endpoint específico PUT /api/ordenes/venta/{id}");
      console.log("📦 Este endpoint manejará automáticamente el inventario");
      data = await actualizarOrdenVenta(form.id, payload);
    } else {
      console.log("📋 Es una orden regular, usando endpoint estándar PUT /api/ordenes/tabla/{id}");
      data = await actualizarOrden(form.id, payload);
    }

    console.log("Respuesta backend:", data);
    
    // Manejar respuesta del nuevo endpoint PUT /api/ordenes/venta/{id}
    if (data?.mensaje && data?.orden) {
      console.log("✅ Orden actualizada exitosamente:", data.orden);
      console.log("📋 Número de orden:", data.numero);
      alert(`Orden actualizada correctamente\nNúmero: ${data.numero}\nTotal: $${data.orden.total?.toLocaleString('es-CO') || '0'}`);
    } else {
      // Respuesta del endpoint fallback
      alert("Orden actualizada correctamente");
    }

    // Solo cerrar el modal, la tabla se refrescará desde onClose
    onClose();
  } catch (e) {
    console.error("Error al guardar orden:", e);
    console.log("Response data:", e?.response?.data);
    console.log("Status:", e?.response?.status);

    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Error al guardar la orden.";
    alert(msg);
  }
};


  // =============================
  // Render
  // =============================
  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>Editar Orden #{form.numero ?? form.id}</h2>

        {errorMsg && <div className="alert error">{errorMsg}</div>}

        <div className="modal-grid">
          {/* PANEL IZQUIERDO */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    handleChange("fecha", e.target.value)
                  }
                />
              </label>
              <label>
                Obra
                <input
                  type="text"
                  value={form.obra}
                  onChange={(e) =>
                    handleChange("obra", e.target.value)
                  }
                />
              </label>

              <label>
                Cliente
                <select
                  value={form.clienteId}
                  onChange={(e) =>
                    handleChange("clienteId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Trabajador
                <select
                  value={form.trabajadorId}
                  onChange={(e) =>
                    handleChange("trabajadorId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sede
                <select
                  value={form.sedeId}
                  onChange={(e) =>
                    handleChange("sedeId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Venta
                <input
                  type="checkbox"
                  checked={form.venta}
                  onChange={(e) =>
                    handleChange("venta", e.target.checked)
                  }
                />
              </label>

              <label>
                Crédito
                <input
                  type="checkbox"
                  checked={form.credito}
                  onChange={(e) =>
                    handleChange("credito", e.target.checked)
                  }
                />
              </label>
            </div>

            <h3>Ítems de la orden</h3>
            
            {/* Total de la venta */}
            <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Total de la venta: ${form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0).toFixed(2)}</strong>
            </div>
            
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((i, idx) => (
                  <tr
                    key={idx}
                    style={{
                      textDecoration: i.eliminar ? "line-through" : "none",
                      opacity: i.eliminar ? 0.6 : 1,
                    }}
                  >
                    <td>{i.nombre}</td>
                    <td>
                      <input
                        type="number"
                        value={i.cantidad || ""}
                        min={1}
                        placeholder="1"
                        onChange={(e) =>
                          handleItemChange(idx, "cantidad", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={i.precioUnitario}
                        step={0.01}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        title="El precio no se puede modificar"
                      />
                    </td>
                    <td>
                      {(i.cantidad * i.precioUnitario).toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="btn-ghost"
                        onClick={() => marcarEliminar(idx)}
                      >
                        {i.eliminar ? "↩️" : "🗑️"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PANEL CENTRAL */}
          <div className="pane pane-sidebar">
            <CategorySidebar
              categories={[{ id: null, nombre: "Todas" }, ...categorias]}
              selectedId={selectedCategoryId}
              onSelect={(id) =>
                setSelectedCategoryId(id === null ? null : id)
              }
            />
          </div>

          {/* PANEL DERECHO */}
          <div className="pane pane-right">
            <div className="inv-header">
              <h3>Catálogo de Productos</h3>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoFiltrado.map((p) => (
                    <tr
                      key={p.id}
                      onDoubleClick={() => addProducto(p)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{p.nombre}</td>
                      <td>{p.codigo}</td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => addProducto(p)}
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                  {catalogoFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={3} className="empty">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
