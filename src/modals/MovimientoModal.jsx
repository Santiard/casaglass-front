// src/modals/MovimientoModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/CrudModal.css";

const VACIO = {
  sedeOrigenId: "",
  sedeDestinoId: "",
  fecha: new Date().toISOString().slice(0, 10),
  productos: [], // { id, nombre, sku?, cantidad }
};

// Asegura un string YYYY-MM-DD, sin zonas horarias raras
const toLocalDateOnly = (val) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return new Date().toISOString().slice(0, 10);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
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
  const [editableWithin2d, setEditableWithin2d] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // En edición: solo permitimos cambiar cabecera (fecha/sedes).
  // Los productos del traslado se gestionan con endpoints de detalles y aquí se muestran en solo lectura.
  const canEditHeader = !isEdit || editableWithin2d;
  const canEditProducts = !isEdit; // productos editables solo en creación

  // Cargar datos iniciales
  useEffect(() => {
    setErrorMsg("");
    if (movimiento) {
      const base = {
        sedeOrigenId: movimiento.sedeOrigen?.id ?? "",
        sedeDestinoId: movimiento.sedeDestino?.id ?? "",
        fecha:
          toLocalDateOnly(movimiento.fecha) ??
          new Date().toISOString().slice(0, 10),
        productos: Array.isArray(movimiento.detalles)
          ? movimiento.detalles.map((d) => ({
              id: d.producto?.id ?? "",
              nombre: d.producto?.nombre ?? "",
              sku: d.producto?.codigo ?? "",
              cantidad: Number(d.cantidad ?? 1),
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
    setIsSubmitting(false);
  }, [movimiento, isOpen]);

  // Filtro de catálogo
  const catalogoFiltrado = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogoProductos;
    return catalogoProductos.filter(
      (p) =>
        (p.nombre ?? "").toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q)
    );
  }, [catalogoProductos, search]);

  // Validaciones
  const mismaSede =
    form.sedeOrigenId && form.sedeDestinoId && form.sedeOrigenId === form.sedeDestinoId;
  const faltanCampos = !form.sedeOrigenId || !form.sedeDestinoId || !form.fecha;
  const cantidadesInvalidas = form.productos.some(
    (p) => !p.cantidad || p.cantidad <= 0 || !Number.isFinite(Number(p.cantidad))
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
    setForm((prev) => {
      if (prev.productos.some((p) => String(p.id) === String(item.id))) return prev; // evitar duplicados
      return {
        ...prev,
        productos: [
          ...prev.productos,
          {
            id: item.id,
            nombre: item.nombre,
            sku: item.codigo ?? "",
            cantidad: 1,
          },
        ],
      };
    });
  };

  const handleProductoChange = (idx, field, value) => {
    if (!canEditProducts) return;
    setForm((prev) => {
      const arr = [...prev.productos];
      arr[idx] = {
        ...arr[idx],
        [field]: field === "cantidad" ? Number(value) : value,
      };
      return { ...prev, productos: arr };
    });
  };

  const removeProducto = (idx) => {
    if (!canEditProducts) return;
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== idx),
    }));
  };

  // Guardar
  const handleSubmit = async () => {
    if (disabledSubmit) return;
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      if (isEdit) {
        // Editar: solo cabecera (coincide con PUT /api/traslados/{id})
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        };
        await onSave(payload, true);
      } else {
        // Crear: cabecera + detalles
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
          detalles: form.productos.map((p) => ({
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
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>
          {isEdit ? "Editar traslado" : "Nuevo traslado"}
          {isEdit && !editableWithin2d && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura: &gt; 2 días)
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
          {isEdit && (
            <div className="alert info">
              En edición solo se actualiza la cabecera (fecha y sedes). Los productos se gestionan con endpoints de detalles.
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
            {form.productos.length === 0 ? (
              <div className="empty-sub">
                {isEdit
                  ? "Productos en solo lectura (edición de cabecera)."
                  : "Doble clic en el catálogo para agregar productos."}
              </div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>SKU</th>
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.productos.map((p, idx) => (
                    <tr key={String(p.id)}>
                      <td>{p.nombre}</td>
                      <td>{p.sku ?? "-"}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={Number(p.cantidad ?? 1)}
                          onChange={(e) =>
                            handleProductoChange(idx, "cantidad", e.target.value)
                          }
                          disabled={!canEditProducts}
                        />
                      </td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => removeProducto(idx)}
                          disabled={!canEditProducts}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Panel derecho: catálogo */}
          <div className="pane pane-right">
            <div className="inv-header">
              <div>
                <h3 style={{ margin: 0 }}>Catálogo de productos</h3>
                <small>
                  {isEdit
                    ? "Solo lectura en edición."
                    : "Selecciona un producto para agregarlo al traslado"}
                </small>
              </div>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!canEditProducts}
              />
            </div>

            <div className="inventory-list">
              {catalogoFiltrado.length === 0 ? (
                <div className="empty-sub">Sin resultados</div>
              ) : (
                catalogoFiltrado.map((p) => (
                  <div
                    key={p.id}
                    className="inventory-item"
                    title={
                      isEdit
                        ? "Solo lectura en edición"
                        : "Doble clic para agregar"
                    }
                    onDoubleClick={() => {
                      if (canEditProducts) addProducto(p);
                    }}
                    style={{
                      cursor: canEditProducts ? "pointer" : "not-allowed",
                      opacity: canEditProducts ? 1 : 0.6,
                    }}
                  >
                    <div className="inv-name">{p.nombre}</div>
                    <div className="inv-meta">
                      <span>{p.codigo ?? "-"}</span>
                    </div>
                  </div>
                ))
              )}
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
