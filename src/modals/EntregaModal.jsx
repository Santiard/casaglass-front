// File: src/modals/EntregaModal.jsx
import { useEffect, useMemo, useState } from "react";
import { getTodayLocalDate, toLocalDateOnly } from "../lib/dateUtils.js";
import "../styles/IngresoNuevoModal.css"; // Reutilizamos estilos del modal

export default function EntregaModal({
  isOpen,
  onClose,
  onSave,                     // onSave(payload, isEdit)
  entregaInicial = null,      // si viene => editar
  ordenesDisponibles = [],    // [{id, numero, fecha, total, incluidaEntrega}]
  // gastosDisponibles eliminado - ya no se usan gastos en entregas
}) {
  const empty = {
    fechaEntrega: getTodayLocalDate(),
    sede: { id: "sede-1", nombre: "Sede Principal" },
    empleado: { id: "emp-1", nombre: "Cajero (mock)" },
    detalles: [],             // [{ id, orden:{id}, numeroOrden, fechaOrden, montoOrden }]
    // gastos eliminado - ya no se usan gastos en entregas
    monto: 0,                 // Monto total (único campo de monto según modelo simplificado)
    montoEfectivo: 0,
    montoTransferencia: 0,
    montoCheque: 0,
    montoDeposito: 0,
    estado: "PENDIENTE",
  };

  const [form, setForm] = useState(empty);
  const [qOrden, setQOrden] = useState("");
  // qGasto eliminado - ya no se usan gastos en entregas

  const isEdit = Boolean(entregaInicial?.id);
  const editable = entregaInicial ? entregaInicial.estado !== "ENTREGADA" : true;

  useEffect(() => {
    if (entregaInicial) {
      const f = new Date(entregaInicial.fechaEntrega ?? Date.now());
      const fechaLocal = isNaN(f) ? getTodayLocalDate() : toLocalDateOnly(entregaInicial.fechaEntrega);
      setForm({
        id: entregaInicial.id,
        fechaEntrega: fechaLocal,
        sede: entregaInicial.sede ?? empty.sede,
        empleado: entregaInicial.empleado ?? empty.empleado,
        detalles: Array.isArray(entregaInicial.detalles) ? entregaInicial.detalles : [],
        // gastos eliminado - ya no se usan gastos en entregas
        monto: Number(entregaInicial.monto ?? 0),
        montoEfectivo: Number(entregaInicial.montoEfectivo ?? 0),
        montoTransferencia: Number(entregaInicial.montoTransferencia ?? 0),
        montoCheque: Number(entregaInicial.montoCheque ?? 0),
        montoDeposito: Number(entregaInicial.montoDeposito ?? 0),
        estado: entregaInicial.estado ?? "PENDIENTE",
      });
    } else {
      setForm(empty);
    }
    setQOrden("");
    // setQGasto eliminado - ya no se usan gastos en entregas
  }, [isOpen, entregaInicial]);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const ordenesFiltradas = useMemo(() => {
    const q = qOrden.trim().toLowerCase();
    const base = ordenesDisponibles.filter(o => !o.incluidaEntrega || form.detalles.some(d => String(d.orden?.id) === String(o.id)));
    if (!q) return base;
    return base.filter(o => String(o.numero ?? "").toLowerCase().includes(q));
  }, [ordenesDisponibles, qOrden, form.detalles]);

  // gastosFiltrados eliminado - ya no se usan gastos en entregas

  // Calcular monto total desde el desglose
  const montoCalculado = useMemo(() => {
    return (form.montoEfectivo ?? 0) + (form.montoTransferencia ?? 0) + (form.montoCheque ?? 0) + (form.montoDeposito ?? 0);
  }, [form.montoEfectivo, form.montoTransferencia, form.montoCheque, form.montoDeposito]);

  useEffect(() => {
    // Actualizar monto total cuando cambia el desglose
    setField("monto", Math.round(montoCalculado));
  }, [montoCalculado]);

  const addOrden = (o) => {
    if (!editable) return;
    const ya = form.detalles.some(d => String(d.orden?.id) === String(o.id));
    if (ya) return;
    const det = {
      id: `det-${Date.now()}-${o.id}`,
      orden: { id: o.id },
      numeroOrden: o.numero,
      fechaOrden: o.fecha,
      montoOrden: o.total,
    };
    setForm(prev => ({ ...prev, detalles: [...prev.detalles, det] }));
  };

  const removeOrden = (idx) => {
    if (!editable) return;
    setForm(prev => ({ ...prev, detalles: prev.detalles.filter((_, i) => i !== idx) }));
  };

  // addGasto y removeGasto eliminados - ya no se usan gastos en entregas

  const disabledSubmit = !editable || !form.fechaEntrega || form.detalles.length === 0;

  const handleSubmit = () => {
    if (disabledSubmit) return;
    // Usar la fecha directamente en formato YYYY-MM-DD, el backend la procesará correctamente
    const fechaEntrega = form.fechaEntrega.length === 10 ? form.fechaEntrega : getTodayLocalDate();
    const payload = {
      id: entregaInicial?.id ?? `ent-${Date.now()}`,
      fechaEntrega: fechaEntrega,
      sede: form.sede,
      empleado: form.empleado,
      detalles: form.detalles.map(d => ({
        id: d.id,
        orden: { id: d.orden.id },
        numeroOrden: d.numeroOrden,
        fechaOrden: d.fechaOrden,
        montoOrden: Number(d.montoOrden),
      })),
      // gastos eliminado - ya no se usan gastos en entregas
      monto: Number(form.monto ?? 0),
      montoEfectivo: Number(form.montoEfectivo ?? 0),
      montoTransferencia: Number(form.montoTransferencia ?? 0),
      montoCheque: Number(form.montoCheque ?? 0),
      montoDeposito: Number(form.montoDeposito ?? 0),
      estado: form.estado ?? "PENDIENTE",
    };
    onSave?.(payload, isEdit);
    onClose?.();
  };

  if (!isOpen) return null;

  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>
          {isEdit ? "Editar entrega" : "Nueva entrega"}
          {!editable && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#8b1a1a" }}>
              (solo lectura: entregada)
            </span>
          )}
        </h2>

        <div className="modal-alerts">
          {!isEdit && form.detalles.length === 0 && (
            <div className="alert warning">Agrega al menos una orden.</div>
          )}
          {!editable && (
            <div className="alert error">No se puede editar una entrega confirmada.</div>
          )}
        </div>

        <div className="modal-grid">
          {/* Izquierda: formulario y listas seleccionadas */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Fecha entrega
                <input
                  type="date"
                  value={form.fechaEntrega}
                  onChange={(e) => setField("fechaEntrega", e.target.value)}
                  disabled={!editable}
                />
              </label>

              <label>
                Sede
                <input type="text" value={form.sede?.nombre ?? ""} onChange={(e) => setField("sede", { ...form.sede, nombre: e.target.value })} disabled={!editable} />
              </label>

              <label>
                Empleado
                <input type="text" value={form.empleado?.nombre ?? ""} onChange={(e) => setField("empleado", { ...form.empleado, nombre: e.target.value })} disabled={!editable} />
              </label>

              <label>
                Monto Efectivo
                <input type="number" value={form.montoEfectivo ?? 0} onChange={(e) => setField("montoEfectivo", parseFloat(e.target.value) || 0)} disabled={!editable} />
              </label>
              <label>
                Monto Transferencia
                <input type="number" value={form.montoTransferencia ?? 0} onChange={(e) => setField("montoTransferencia", parseFloat(e.target.value) || 0)} disabled={!editable} />
              </label>
              <label>
                Monto Cheque
                <input type="number" value={form.montoCheque ?? 0} onChange={(e) => setField("montoCheque", parseFloat(e.target.value) || 0)} disabled={!editable} />
              </label>
              <label>
                Monto Depósito
                <input type="number" value={form.montoDeposito ?? 0} onChange={(e) => setField("montoDeposito", parseFloat(e.target.value) || 0)} disabled={!editable} />
              </label>
            </div>

            <h3 style={{ marginTop: 8 }}>Órdenes en la entrega</h3>
            <div className="selected-products">
              {form.detalles.length === 0 ? (
                <div className="empty-sub">Doble clic en la tabla de la derecha para agregar.</div>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th># Orden</th>
                      <th style={{ width: 140 }}>Fecha</th>
                      <th style={{ width: 140 }}>Monto</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.detalles.map((d, idx) => (
                      <tr key={d.id}>
                        <td>{d.numeroOrden}</td>
                        <td>{new Date(d.fechaOrden).toLocaleDateString("es-CO")}</td>
                        <td>{fmtCOP(d.montoOrden)}</td>
                        <td>
                          <button className="btn-ghost" type="button" onClick={() => removeOrden(idx)} disabled={!editable} title={!editable ? "Edición bloqueada (entregada)" : "Quitar"}>✕</button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ textAlign: "right", fontWeight: 600 }}>Total órdenes</td>
                      <td colSpan={2} style={{ fontWeight: 700 }}>{fmtCOP(form.detalles.reduce((sum, d) => sum + (Number(d.montoOrden) || 0), 0))}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Sección de gastos eliminada - ya no se usan gastos en entregas */}
          </div>

          {/* Derecha: catálogo de órdenes (gastos eliminados) */}
          <div className="pane pane-right">
            <div className="inv-header">
              <h3 style={{ margin: 0 }}>Órdenes disponibles</h3>
              <input className="inv-search" type="text" placeholder="Buscar # orden…" value={qOrden} onChange={(e) => setQOrden(e.target.value)} disabled={!editable} />
            </div>
            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th># Orden</th>
                    <th style={{ width: 120 }}>Fecha</th>
                    <th style={{ width: 120 }}>Total</th>
                    <th style={{ width: 80 }}>Agregar</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.length === 0 ? (
                    <tr><td colSpan={4} className="empty">Sin resultados</td></tr>
                  ) : (
                    ordenesFiltradas.map(o => (
                      <tr key={o.id}
                          onDoubleClick={() => { if (editable) addOrden(o); }}
                          title={!editable ? "Edición bloqueada (entregada)" : "Doble clic para agregar"}
                          style={{ cursor: !editable ? "not-allowed" : "pointer", opacity: o.incluidaEntrega && !form.detalles.some(d => String(d.orden?.id) === String(o.id)) ? 0.4 : 1 }}
                      >
                        <td>{o.numero}</td>
                        <td>{new Date(o.fecha).toLocaleDateString("es-CO")}</td>
                        <td>{fmtCOP(o.total)}</td>
                        <td>
                          <button className="btn-ghost" type="button" onClick={() => addOrden(o)} disabled={!editable || (o.incluidaEntrega && !form.detalles.some(d => String(d.orden?.id) === String(o.id)))} title={!editable ? "Edición bloqueada (entregada)" : (o.incluidaEntrega ? "Ya incluida en otra entrega" : "Agregar")}>+</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Sección de gastos disponibles eliminada - ya no se usan gastos en entregas */}
          </div>
        </div>

        {/* Resumen */}
        <div className="modal-alerts" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <div className="alert info"><strong>Monto Total:</strong> {fmtCOP(form.monto ?? 0)}</div>
          <div className="alert info"><strong>Efectivo:</strong> {fmtCOP(form.montoEfectivo ?? 0)}</div>
          <div className="alert info"><strong>Transferencia:</strong> {fmtCOP(form.montoTransferencia ?? 0)}</div>
          <div className="alert info"><strong>Cheque:</strong> {fmtCOP(form.montoCheque ?? 0)}</div>
          <div className="alert info"><strong>Depósito:</strong> {fmtCOP(form.montoDeposito ?? 0)}</div>
        </div>

        {/* Botones */}
        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} type="button">Cerrar</button>
          <button className="btn-guardar" onClick={handleSubmit} type="button" disabled={disabledSubmit} title={disabledSubmit ? (editable ? "Completa fecha y agrega órdenes" : "Edición bloqueada (entregada)") : (isEdit ? "Guardar" : "Crear entrega")}>
            {isEdit ? "Guardar" : "Crear entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}