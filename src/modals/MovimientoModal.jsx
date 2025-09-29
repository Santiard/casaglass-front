import { useEffect, useMemo, useState } from "react";
import "../styles/CrudModal.css";

const MOVIMIENTO_VACIO = {
  sedePartida: "",
  sedeLlegada: "",
  fecha: new Date().toISOString().substring(0, 10), // yyyy-mm-dd
  productos: [] // { id, nombre, sku?, cantidad }
};

export default function MovimientoModal({
  movimiento,
  isOpen,
  onClose,
  onSave,
  sedes = [],
  inventarioPorSede = {}
}) {
  const isEdit = Boolean(movimiento?.id);
  const [form, setForm] = useState(MOVIMIENTO_VACIO);
  const [searchInv, setSearchInv] = useState("");

  // Inicializa/actualiza el formulario cuando cambia el movimiento o se abre el modal
  useEffect(() => {
    const base = movimiento
      ? {
          sedePartida: movimiento.sedePartida ?? "",
          sedeLlegada: movimiento.sedeLlegada ?? "",
          fecha:
            (movimiento.fecha ?? "").substring(0, 10) ||
            new Date().toISOString().substring(0, 10),
          productos: Array.isArray(movimiento.productos)
            ? movimiento.productos.map((p) => ({
                id: p.id ?? `${p.sku ?? p.nombre ?? ""}`,
                nombre: p.nombre ?? "",
                sku: p.sku ?? "",
                cantidad: Number(p.cantidad ?? 1),
              }))
            : [],
        }
      : MOVIMIENTO_VACIO;

    setForm(base);
    setSearchInv("");
  }, [movimiento, isOpen]);

  // 👉 Hooks SIEMPRE se ejecutan (no los pongas tras un return condicional)
  const inventarioOrigen = useMemo(() => {
    const lista = inventarioPorSede[form.sedePartida] ?? [];
    const q = searchInv.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (it) =>
        (it.nombre ?? "").toLowerCase().includes(q) ||
        (it.sku ?? "").toLowerCase().includes(q)
    );
  }, [inventarioPorSede, form.sedePartida, searchInv]);

  const mismaSede =
    form.sedePartida && form.sedeLlegada && form.sedePartida === form.sedeLlegada;
  const faltanCampos = !form.sedePartida || !form.sedeLlegada || !form.fecha;
  const cantidadesInvalidas = form.productos.some(
    (p) => !p.cantidad || p.cantidad <= 0 || !Number.isFinite(Number(p.cantidad))
  );

  const excedeStock = useMemo(() => {
    if (!form.sedePartida) return false;
    const mapaStock = new Map(
      (inventarioPorSede[form.sedePartida] ?? []).map((it) => [
        String(it.id ?? it.sku ?? it.nombre),
        it.stock,
      ])
    );
    return form.productos.some((p) => {
      const key = String(p.id ?? p.sku ?? p.nombre);
      const stock = mapaStock.get(key);
      return typeof stock === "number" && stock >= 0 && Number(p.cantidad) > stock;
    });
  }, [form.productos, form.sedePartida, inventarioPorSede]);

  const disabledSubmit =
    faltanCampos ||
    mismaSede ||
    cantidadesInvalidas ||
    form.productos.length === 0 ||
    excedeStock;

  // Handlers
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProductoDesdeInventario = (item) => {
    setForm((prev) => {
      const key = String(item.id ?? item.sku ?? item.nombre);
      const ya = prev.productos.find(
        (p) => String(p.id ?? p.sku ?? p.nombre) === key
      );
      if (ya) return prev; // no duplicar
      return {
        ...prev,
        productos: [
          ...prev.productos,
          {
            id: item.id ?? key,
            nombre: item.nombre ?? "",
            sku: item.sku ?? "",
            cantidad: 1,
          },
        ],
      };
    });
  };

  const handleProductoChange = (idx, field, value) => {
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
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = () => {
    if (disabledSubmit) return;
    const payload = {
      ...form,
      // normaliza fecha a ISO completa si viene yyyy-mm-dd
      fecha: form.fecha.length === 10 ? new Date(form.fecha).toISOString() : form.fecha,
    };
    onSave(payload, isEdit);
    onClose();
  };

  // ⬇️ El return condicional va al FINAL (después de todos los hooks)
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>{isEdit ? "Editar Movimiento" : "Nuevo Movimiento"}</h2>

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
          {excedeStock && (
            <div className="alert warning">
              Algunas cantidades exceden el stock disponible.
            </div>
          )}
        </div>

        <div className="modal-grid">
          {/* Panel izquierdo */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Sede origen
                <select
                  value={form.sedePartida}
                  onChange={(e) => handleChange("sedePartida", e.target.value)}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s}
                      value={s}
                      disabled={s === form.sedeLlegada}
                    >
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sede destino
                <select
                  value={form.sedeLlegada}
                  onChange={(e) => handleChange("sedeLlegada", e.target.value)}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s}
                      value={s}
                      disabled={s === form.sedePartida}
                    >
                      {s}
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
                />
              </label>
            </div>

            <h3>Productos del movimiento</h3>
            <div className="selected-products">
              {form.productos.length === 0 ? (
                <div className="empty-sub">
                  Aún no hay productos. Doble clic en el inventario para agregar.
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
                      <tr
                        key={String(p.id ?? p.sku ?? `${p.nombre}-${idx}`)}
                      >
                        <td>{p.nombre}</td>
                        <td>{p.sku ?? "-"}</td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className="qty-input"
                            value={Number(p.cantidad ?? 1)}
                            onChange={(e) =>
                              handleProductoChange(
                                idx,
                                "cantidad",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn-ghost"
                            type="button"
                            title="Quitar"
                            onClick={() => removeProducto(idx)}
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
          </div>

          {/* Panel derecho */}
          <div className="pane pane-right">
            <div className="inv-header">
              <div>
                <h3 style={{ margin: 0 }}>Inventario</h3>
                <small>
                  {form.sedePartida
                    ? `Sede: ${form.sedePartida}`
                    : "Selecciona una sede de origen"}
                </small>
              </div>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar por nombre o SKU…"
                value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)}
              />
            </div>

            <div className="inventory-list">
              {form.sedePartida ? (
                inventarioOrigen.length === 0 ? (
                  <div className="empty-sub">Sin resultados</div>
                ) : (
                  inventarioOrigen.map((item) => (
                    <div
                      key={String(item.id ?? item.sku ?? item.nombre)}
                      className="inventory-item"
                      title="Doble clic para agregar"
                      onDoubleClick={() => addProductoDesdeInventario(item)}
                    >
                      <div className="inv-name">{item.nombre}</div>
                      <div className="inv-meta">
                        <span className="sku">{item.sku ?? "SKU-"}</span>
                        <span className="dot">•</span>
                        <span className="stock">
                          Stock: {item.stock ?? 0}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="empty-sub">
                  Selecciona primero la sede de origen.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            type="button"
            disabled={disabledSubmit}
            title={
              disabledSubmit
                ? "Completa la información y corrige las validaciones"
                : "Crear movimiento"
            }
          >
            {isEdit ? "Guardar cambios" : "Crear movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
