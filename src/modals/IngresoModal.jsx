// src/modals/IngresoModal.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/IngresoNuevoModal.css";
import {
  toLocalDateTimeString,
  crearIngresoDesdeForm,
  actualizarIngresoDesdeForm,
} from "../services/IngresosService.js";

export default function IngresoModal({
  isOpen,
  onClose,
  onSave,                   // callback opcional para refrescar la tabla del padre
  proveedores = [],         // [{id, nombre}]
  catalogoProductos = [],   // [{id, nombre, codigo}]
  ingresoInicial = null,    // si viene => editar
}) {
  const empty = {
    fecha: new Date().toISOString().substring(0, 16), // input datetime-local
    proveedorId: "",
    proveedorNombre: "", // (solo usado si quisieras permitir libre, aquí no lo usamos)
    numeroFactura: "",
    observaciones: "",
    detalles: [], // [{producto:{id,nombre,codigo}, cantidad, costoUnitario}]
  };

  const [form, setForm] = useState(empty);
  const [searchCat, setSearchCat] = useState("");
  const [editable, setEditable] = useState(true);

  const isEdit = Boolean(ingresoInicial?.id);

  useEffect(() => {
    if (ingresoInicial) {
      const f = new Date(ingresoInicial.fecha ?? Date.now());
      const fechaLocal = (isNaN(f) ? new Date() : f).toISOString().substring(0, 16);

      setForm({
        fecha: fechaLocal,
        proveedorId: ingresoInicial.proveedor?.id ?? "",
        proveedorNombre: ingresoInicial.proveedor?.nombre ?? "",
        numeroFactura: ingresoInicial.numeroFactura ?? "",
        observaciones: ingresoInicial.observaciones ?? "",
        detalles: Array.isArray(ingresoInicial.detalles)
          ? ingresoInicial.detalles.map((d) => ({
              producto: {
                id: d.producto?.id ?? "",
                nombre: d.producto?.nombre ?? "",
                codigo: d.producto?.codigo ?? "",
              },
              cantidad: Number(d.cantidad ?? 1),
              costoUnitario: Number(d.costoUnitario ?? 0),
            }))
          : [],
      });

      // UI: bloquea si está procesado o > 2 días (el backend ya valida procesado)
      const base = new Date(ingresoInicial.fecha);
      const diffDays = isNaN(base)
        ? 0
        : (Date.now() - base.getTime()) / (1000 * 60 * 60 * 24);
      setEditable(diffDays <= 2 && !ingresoInicial.procesado);
    } else {
      setForm(empty);
      setEditable(true);
    }
    setSearchCat("");
  }, [isOpen, ingresoInicial]);

  // Catálogo filtrado
  const catalogoFiltrado = useMemo(() => {
    const q = searchCat.trim().toLowerCase();
    if (!q) return catalogoProductos;
    return catalogoProductos.filter(
      (p) =>
        (p.nombre ?? "").toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q)
    );
  }, [catalogoProductos, searchCat]);

  // Total costo calculado en UI (el back recalcula igual)
  const totalCosto = useMemo(
    () =>
      form.detalles.reduce(
        (acc, d) =>
          acc + Number(d.cantidad ?? 0) * Number(d.costoUnitario ?? 0),
        0
      ),
    [form.detalles]
  );

  // Validaciones básicas
  const cantidadesInvalidas = form.detalles.some(
    (d) =>
      !Number.isFinite(Number(d.cantidad)) ||
      Number(d.cantidad) < 1
  );
  const costosInvalidos = form.detalles.some(
    (d) =>
      !Number.isFinite(Number(d.costoUnitario)) ||
      Number(d.costoUnitario) < 0
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

  const handleProveedorSelect = (value) => {
    if (!editable) return;
    setForm((prev) => {
      const prov = proveedores.find((p) => String(p.id) === String(value));
      return {
        ...prev,
        proveedorId: value,
        proveedorNombre: prov?.nombre ?? prev.proveedorNombre,
      };
    });
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
        arr[idx] = {
          ...arr[idx],
          cantidad: Number(arr[idx].cantidad ?? 0) + 1,
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
            },
            cantidad: 1,
            costoUnitario: 0,
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
      if (field === "cantidad" || field === "costoUnitario") {
        row[field] = Number(value);
      } else if (field === "nombre" || field === "codigo") {
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

  // Submit usando los services (mapper centralizado)
  const handleSubmit = async () => {
    if (disabledSubmit) return;

    // Aseguramos LocalDateTime "YYYY-MM-DDTHH:mm"
    const fechaStr =
      form.fecha?.length === 16
        ? toLocalDateTimeString(new Date(form.fecha))
        : toLocalDateTimeString(new Date());

    const formParaService = {
      ...form,
      fecha: fechaStr, // normalizada para el mapper
    };

    try {
      if (isEdit) {
        await actualizarIngresoDesdeForm(ingresoInicial.id, formParaService);
      } else {
        await crearIngresoDesdeForm(formParaService);
      }
      onSave?.();   // refresca la tabla desde el padre si quieres
      onClose?.();
    } catch (e) {
      console.error("Error guardando ingreso", {
        status: e?.response?.status,
        data: e?.response?.data,
      });
      alert(
        e?.response?.data?.message || "No se pudo guardar el ingreso."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>
          {isEdit ? "Editar ingreso" : "Nuevo ingreso"}
          {isEdit && !editable && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#8b1a1a" }}>
              (bloqueado: procesado o &gt; 2 días)
            </span>
          )}
        </h2>

        <div className="modal-alerts">
          {!isEdit && form.detalles.length === 0 && (
            <div className="alert warning">Agrega al menos un producto.</div>
          )}
          {(!isEdit || editable) &&
            (form.detalles.length === 0 ||
              !Number.isFinite(proveedorIdNum) ||
              proveedorIdNum <= 0 ||
              cantidadesInvalidas ||
              costosInvalidos) && (
              <>
                {(!Number.isFinite(proveedorIdNum) ||
                  proveedorIdNum <= 0) && (
                  <div className="alert warning">
                    Debes seleccionar un proveedor.
                  </div>
                )}
                {cantidadesInvalidas && (
                  <div className="alert error">
                    Hay cantidades inválidas (&gt; 0).
                  </div>
                )}
                {costosInvalidos && (
                  <div className="alert error">
                    Hay costos inválidos (≥ 0).
                  </div>
                )}
              </>
            )}
        </div>

        <div className="modal-grid">
          {/* Izquierda */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Fecha
                <input
                  type="datetime-local"
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
                Proveedor (seleccionar)
                <select
                  value={form.proveedorId}
                  onChange={(e) => handleProveedorSelect(e.target.value)}
                  disabled={!editable && isEdit}
                >
                  <option value="">-- Ninguno --</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
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
                            onChange={(e) =>
                              setDetalle(idx, "nombre", e.target.value)
                            }
                            disabled={!editable && isEdit}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={d.producto.codigo ?? ""}
                            onChange={(e) =>
                              setDetalle(idx, "codigo", e.target.value)
                            }
                            disabled={!editable && isEdit}
                          />
                        </td>
                        <td>
                          <input
                            className="qty-input"
                            type="number"
                            min={1}
                            value={Number(d.cantidad ?? 1)}
                            onChange={(e) =>
                              setDetalle(idx, "cantidad", e.target.value)
                            }
                            disabled={!editable && isEdit}
                          />
                        </td>
                        <td>
                          <input
                            className="qty-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={Number(d.costoUnitario ?? 0)}
                            onChange={(e) =>
                              setDetalle(idx, "costoUnitario", e.target.value)
                            }
                            disabled={!editable && isEdit}
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
                      <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>
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

          {/* Derecha */}
          <div className="pane pane-right">
            <div className="inv-header">
              <h3 style={{ margin: 0 }}>Inventario / Catálogo</h3>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar por nombre o código…"
                value={searchCat}
                onChange={(e) => setSearchCat(e.target.value)}
                disabled={!editable && isEdit}
              />
            </div>

            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: "55%" }}>Nombre</th>
                    <th style={{ width: "30%" }}>Código</th>
                    <th style={{ width: "15%" }}>Agregar</th>
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
                        <td>{item.nombre}</td>
                        <td>{item.codigo ?? "-"}</td>
                        <td>
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={() => addProducto(item)}
                            disabled={!editable && isEdit}
                          >
                            +
                          </button>
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
    </div>
  );
}
