// src/modals/MovimientoModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/CrudModal.css";

const VACIO = {
  sedeOrigenId: "",
  sedeDestinoId: "",
  fecha: new Date().toISOString().substring(0, 10),
  productos: [], // { id, nombre, sku?, cantidad }
};

export default function MovimientoModal({
  movimiento,
  isOpen,
  onClose,
  onSave,
  sedes = [], // [{ id, nombre }]
  catalogoProductos = [], // [{ id, nombre, codigo }]
}) {
  const isEdit = Boolean(movimiento?.id);
  const [form, setForm] = useState(VACIO);
  const [search, setSearch] = useState("");
  const [editable, setEditable] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    if (movimiento) {
      const base = {
        sedeOrigenId: movimiento.sedeOrigen?.id ?? "",
        sedeDestinoId: movimiento.sedeDestino?.id ?? "",
        fecha: movimiento.fecha?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
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

      // Bloquear edición si pasaron más de 2 días
      const f = new Date(movimiento.fecha);
      const diff = (Date.now() - f.getTime()) / (1000 * 60 * 60 * 24);
      setEditable(diff <= 2);
    } else {
      setForm(VACIO);
      setEditable(true);
    }
    setSearch("");
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

  const disabledSubmit =
    (!editable && isEdit) ||
    faltanCampos ||
    mismaSede ||
    cantidadesInvalidas ||
    form.productos.length === 0;

  // Handlers
  const handleChange = (field, value) => {
    if (!editable && isEdit) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProducto = (item) => {
    if (!editable && isEdit) return;
    setForm((prev) => {
      if (prev.productos.some((p) => p.id === item.id)) return prev; // evitar duplicados
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
    if (!editable && isEdit) return;
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
    if (!editable && isEdit) return;
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== idx),
    }));
  };

  // Guardar
  const handleSubmit = async () => {
    if (disabledSubmit) return;

    const payload = {
      fecha: form.fecha,
      sedeOrigen: { id: Number(form.sedeOrigenId) },
      sedeDestino: { id: Number(form.sedeDestinoId) },
      detalles: form.productos.map((p) => ({
        producto: { id: Number(p.id) },
        cantidad: Number(p.cantidad),
      })),
    };

    await onSave(payload, isEdit);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>
          {isEdit ? "Editar traslado" : "Nuevo traslado"}
          {isEdit && !editable && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura: &gt; 2 días)
            </span>
          )}
        </h2>

        {/* Alertas */}
        <div className="modal-alerts">
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
          {form.productos.length === 0 && (
            <div className="alert warning">
              Debes agregar al menos un producto al traslado.
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
                  onChange={(e) =>
                    handleChange("sedeOrigenId", e.target.value)
                  }
                  disabled={!editable && isEdit}
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
                  disabled={!editable && isEdit}
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
                  disabled={!editable && isEdit}
                />
              </label>
            </div>

            <h3>Productos del traslado</h3>
            {form.productos.length === 0 ? (
              <div className="empty-sub">
                {isEdit && !editable
                  ? "Traslado bloqueado para edición."
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
                          disabled={!editable && isEdit}
                        />
                      </td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => removeProducto(idx)}
                          disabled={!editable && isEdit}
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
                <small>Selecciona un producto para agregarlo al traslado</small>
              </div>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={!editable && isEdit}
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
                    title="Doble clic para agregar"
                    onDoubleClick={() => addProducto(p)}
                    style={{
                      cursor: !editable && isEdit ? "not-allowed" : "pointer",
                      opacity: !editable && isEdit ? 0.6 : 1,
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
          <button className="btn-cancelar" onClick={onClose}>
            {isEdit && !editable ? "Cerrar" : "Cancelar"}
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            disabled={disabledSubmit}
          >
            {isEdit ? "Guardar cambios" : "Crear traslado"}
          </button>
        </div>
      </div>
    </div>
  );
}
