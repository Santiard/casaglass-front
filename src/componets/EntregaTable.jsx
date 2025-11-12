import "../styles/Table.css";
import { useEffect, useMemo, useState } from "react";
import editar from "../assets/editar.png";
import EntregaModal from "../modals/EntregaModal.jsx";
import EntregaConfirmarModal from "../modals/EntregaConfirmarModal.jsx";
import EntregaCancelarModal from "../modals/EntregaCancelarModal.jsx";

export default function EntregasTable({
  data = [],
  rowsPerPage = 10,
  onVerDetalles, // (entrega) => void
  onConfirmar, // (entrega) => void
  onCancelar, // (entrega, motivo) => void
  onEliminar, // (entrega) => Promise<void>
  onImprimir, // (entrega) => void - nuevo prop para imprimir
}) {
  const [entregas, setEntregas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [entregaEditando, setEntregaEditando] = useState(null);

  // Actualizar entregas cuando cambian los datos del padre
  useEffect(() => {
    setEntregas(Array.isArray(data) ? data : []);
  }, [data]);

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

    setIsModalOpen(false);
    setEntregaEditando(null);
  };

  const handleConfirmar = (entrega) => {
    if (onConfirmar) {
      onConfirmar(entrega);
    }
    setIsConfirmOpen(false);
    setEntregaEditando(null);
  };

  const handleCancelar = ({ motivo }) => {
    if (onCancelar && entregaEditando) {
      onCancelar(entregaEditando, motivo);
    }
    setIsCancelOpen(false);
    setEntregaEditando(null);
  };

  const handleEliminar = async (ent) => {
    await onEliminar?.(ent);
  };

  // Paginación simple sin filtros (los filtros están en la página padre)  
  const [page, setPage] = useState(1);

  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit"
    });
  };
  const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n||0));

  const filtrados = useMemo(() => {
    const total = entregas.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = entregas.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage };
  }, [entregas, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage } = filtrados;

  const verDetalles = (ent) => onVerDetalles?.(ent);

  return (
    <div className="table-container">
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
                    <button className="btnEdit" onClick={() => openEditar(ent)} title="Editar">
                      <img src={editar} className="iconButton" alt="Editar" />
                    </button>
                    <button className="btn" onClick={() => onImprimir?.(ent)} title="Imprimir">Imprimir</button>
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

      {/* Paginación */}
      <div className="pagination-bar">
        <div className="pagination-info">
          Mostrando {Math.min((curPage - 1) * rowsPerPage + 1, total)}–{Math.min(curPage * rowsPerPage, total)} de {total}
        </div>
        <div className="pagination-controls">
          <button className="pg-btn" onClick={() => setPage(1)} disabled={curPage <= 1}>«</button>
          <button className="pg-btn" onClick={() => setPage(curPage - 1)} disabled={curPage <= 1}>‹</button>
          {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
            const p = Math.max(1, Math.min(curPage - 2, maxPage - 4)) + i;
            return p <= maxPage ? (
              <button key={p} className={`pg-btn ${p === curPage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="pg-btn" onClick={() => setPage(curPage + 1)} disabled={curPage >= maxPage}>›</button>
          <button className="pg-btn" onClick={() => setPage(maxPage)} disabled={curPage >= maxPage}>»</button>
        </div>
      </div>

      {/* Modales */}
      <EntregaModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEntregaEditando(null); }}
        onSave={handleGuardarEntrega}
        entregaInicial={entregaEditando}
        ordenesDisponibles={[]}
        gastosDisponibles={[]}
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