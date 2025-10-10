import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import editar from "../assets/editar.png";
import EntregaModal from "../modals/EntregaModal.jsx";
import EntregaConfirmarModal from "../modals/EntregaConfirmarModal.jsx";
import EntregaCancelarModal from "../modals/EntregaCancelarModal.jsx";
import { ENTREGAS_MOCK, ORDENES_DISPONIBLES_MOCK, GASTOS_DISPONIBLES_MOCK } from "../mocks/mocks_entregas.js";

export default function EntregasTable({
  data = [],
  rowsPerPage = 10,
  onVerDetalles, // (entrega) => void
}) {
  const [entregas, setEntregas] = useState(() => (Array.isArray(data) && data.length ? data : ENTREGAS_MOCK));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [entregaEditando, setEntregaEditando] = useState(null);

  const [ordenesDisponibles, setOrdenesDisponibles] = useState(ORDENES_DISPONIBLES_MOCK);
  const [gastosDisponibles, setGastosDisponibles] = useState(GASTOS_DISPONIBLES_MOCK);

  useEffect(() => {
    if (Array.isArray(data) && data.length) setEntregas(data);
  }, [data]);

  const openNuevo = () => { setEntregaEditando(null); setIsModalOpen(true); };
  const openEditar = (ent) => { setEntregaEditando(ent); setIsModalOpen(true); };
  const openConfirmar = (ent) => { setEntregaEditando(ent); setIsConfirmOpen(true); };
  const openCancelar = (ent) => { setEntregaEditando(ent); setIsCancelOpen(true); };

  const handleGuardarEntrega = (payload, isEdit) => {
    setEntregas(prev => {
      if (isEdit) {
        return prev.map(it => (String(it.id) === String(payload.id) ? payload : it));
      }
      return [payload, ...prev];
    });
    // Marcar/Desmarcar en los catálogos simples de mock según selección
    setOrdenesDisponibles(prev => prev.map(o => ({ ...o, incluidaEntrega: payload.detalles.some(d => String(d.orden?.id) === String(o.id)) })));
    setGastosDisponibles(prev => prev.map(g => ({ ...g, asignadoEntregaId: payload.gastos?.some(x => String(x.id) === String(g.id)) ? payload.id : null })));

    setIsModalOpen(false);
    setEntregaEditando(null);
  };

  const handleConfirmar = ({ id, montoEntregado, observaciones }) => {
    setEntregas(prev => prev.map(e => {
      if (String(e.id) !== String(id)) return e;
      const esperadoNeto = Number(e.montoEsperado ?? 0) - Number(e.montoGastos ?? 0);
      const diferencia = Number(montoEntregado ?? 0) - esperadoNeto;
      return { ...e, montoEntregado: Number(montoEntregado), observaciones, estado: "ENTREGADA", diferencia };
    }));
    setIsConfirmOpen(false);
    setEntregaEditando(null);
  };

  const handleCancelar = ({ id, motivo }) => {
    setEntregas(prev => prev.map(e => (String(e.id) === String(id) ? { ...e, estado: "RECHAZADA", observaciones: motivo } : e)));
    // Liberar gastos asociados en el mock
    setGastosDisponibles(prev => prev.map(g => (g.asignadoEntregaId === id ? { ...g, asignadoEntregaId: null } : g)));
    setIsCancelOpen(false);
    setEntregaEditando(null);
  };

  const handleEliminar = (ent) => {
    if (ent.estado === "ENTREGADA") return; // Regla: no eliminar confirmadas
    if (!confirm(`¿Eliminar entrega #${ent.id}?`)) return;
    setEntregas(prev => prev.filter(e => String(e.id) !== String(ent.id)));
    // Liberar órdenes y gastos en los catálogos mock
    setOrdenesDisponibles(prev => prev.map(o => ({ ...o, incluidaEntrega: o.incluidaEntrega && ent.detalles.every(d => String(d.orden?.id) !== String(o.id)) ? false : o.incluidaEntrega })));
    setGastosDisponibles(prev => prev.map(g => (g.asignadoEntregaId === ent.id ? { ...g, asignadoEntregaId: null } : g)));
  };

  // Filtro y paginación
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit"
    });
  };
  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? entregas.filter((e) =>
          [
            e.observaciones,
            e.sede?.nombre,
            e.empleado?.nombre,
            e.estado,
            ...(e.detalles ?? []).map(d => `${d.numeroOrden ?? ""}`)
          ].filter(Boolean).some(v => String(v).toLowerCase().includes(q))
        )
      : entregas;

    const total = base.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = base.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage };
  }, [entregas, query, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage } = filtrados;

  const verDetalles = (ent) => onVerDetalles?.(ent);

  return (
    <div className="table-container">
      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar por sede, empleado, observaciones u orden..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ opacity: .7 }}>{total} registro(s)</span>
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage <= 1}>◀</button>
          <span>{curPage}/{maxPage}</span>
          <button className="btn" onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={curPage >= maxPage}>▶</button>
          <button className="btn" type="button" onClick={openNuevo}>+ Nueva entrega</button>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="table-wrapper">
        <table className="table entregas-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sede</th>
              <th>Empleado</th>
              <th>Monto esperado</th>
              <th>Gastos</th>
              <th>Entregado</th>
              <th>Diferencia</th>
              <th>Estado</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={10} className="empty">No hay entregas registradas</td></tr>
            ) : pageData.map((ent) => {
              const esperadoNeto = Number(ent.montoEsperado ?? 0) - Number(ent.montoGastos ?? 0);
              const diferencia = ent.estado === "ENTREGADA"
                ? Number(ent.montoEntregado ?? 0) - esperadoNeto
                : (ent.diferencia ?? 0);
              return (
                <tr
                  key={ent.id}
                  onDoubleClick={() => verDetalles(ent)}
                  style={{ cursor:"pointer" }}
                >
                  <td>{fmtFecha(ent.fechaEntrega)}</td>
                  <td>{ent.sede?.nombre ?? "-"}</td>
                  <td>{ent.empleado?.nombre ?? "-"}</td>
                  <td>{fmtCOP(ent.montoEsperado)}</td>
                  <td>{fmtCOP(ent.montoGastos)}</td>
                  <td>{ent.montoEntregado != null ? fmtCOP(ent.montoEntregado) : "-"}</td>
                  <td style={{ fontWeight: 600 }}>{fmtCOP(diferencia)}</td>
                  <td>
                    {ent.estado === "ENTREGADA" && <span className="status ok">Entregada</span>}
                    {ent.estado === "PENDIENTE" && <span className="status pending">Pendiente</span>}
                    {ent.estado === "RECHAZADA" && <span className="status error">Rechazada</span>}
                  </td>
                  <td>
                    <button className="btnLink" type="button" onClick={() => verDetalles(ent)}>
                      Ver detalles
                    </button>
                  </td>
                  <td className="clientes-actions" style={{ display: "flex", gap: 6 }}>
                    <button className="btnEdit" onClick={() => openEditar(ent)} title="Editar" disabled={ent.estado === "ENTREGADA"}>
                      <img src={editar} className="iconButton" alt="Editar" />
                    </button>
                    <button className="btn" onClick={() => openConfirmar(ent)} disabled={ent.estado !== "PENDIENTE"}>Confirmar</button>
                    <button className="btn" onClick={() => openCancelar(ent)} disabled={ent.estado !== "PENDIENTE"}>Cancelar</button>
                    <button className="btn" onClick={() => handleEliminar(ent)} disabled={ent.estado === "ENTREGADA"}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      <EntregaModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEntregaEditando(null); }}
        onSave={handleGuardarEntrega}
        entregaInicial={entregaEditando}
        ordenesDisponibles={ordenesDisponibles}
        gastosDisponibles={gastosDisponibles}
      />

      <EntregaConfirmarModal
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setEntregaEditando(null); }}
        entrega={entregaEditando}
        onConfirm={handleConfirmar}
      />

      <EntregaCancelarModal
        isOpen={isCancelOpen}
        onClose={() => { setIsCancelOpen(false); setEntregaEditando(null); }}
        entrega={entregaEditando}
        onCancel={handleCancelar}
      />
    </div>
  );
}