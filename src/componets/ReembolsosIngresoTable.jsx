// src/componets/ReembolsosIngresoTable.jsx
import "../styles/Table.css";
import { useMemo, useState } from "react";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import editar from "../assets/editar.png";
import eliminar from "../assets/eliminar.png";
import check from "../assets/check.png";

export default function ReembolsosIngresoTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  onVerDetalles,
  onProcesar,
  onEliminar,
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError } = useToast();
  const [page, setPage] = useState(1);

  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  const fmtCOP = (n) => 
    new Intl.NumberFormat("es-CO", { 
      style: "currency", 
      currency: "COP", 
      maximumFractionDigits: 0 
    }).format(Number(n || 0));

  const getEstadoBadge = (estado, procesado) => {
    if (estado === "ANULADO") {
      return <span className="estado-badge anulada">ANULADO</span>;
    }
    if (procesado || estado === "PROCESADO") {
      return <span className="estado-badge procesado">PROCESADO</span>;
    }
    return <span className="estado-badge pendiente">PENDIENTE</span>;
  };

  const paginados = useMemo(() => {
    const total = data.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = data.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage, start };
  }, [data, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage, start } = paginados;

  // Funciones de paginación
  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(maxPage, p + 1));
  const goLast = () => setPage(maxPage);

  // Cálculo "Mostrando X–Y de Z"
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + rowsPerPage, total);

  const handleProcesar = async (reembolso) => {
    if (reembolso.procesado || reembolso.estado === "PROCESADO") {
      showError("Esta devolución ya está procesada.");
      return;
    }

    const confirmacion = await confirm({
      title: "Procesar Devolución",
      message: `¿Estás seguro de que deseas procesar la devolución #${reembolso.id}?\n\nEsta acción actualizará el inventario y no se puede deshacer.`,
      confirmText: "Procesar",
      cancelText: "Cancelar",
      type: "info"
    });

    if (confirmacion && onProcesar) {
      await onProcesar(reembolso.id);
    }
  };

  const handleEliminar = async (reembolso) => {
    if (reembolso.procesado || reembolso.estado === "PROCESADO") {
      showError("No se puede eliminar una devolución procesada.");
      return;
    }

    const confirmacion = await confirm({
      title: "Eliminar Devolución",
      message: `¿Estás seguro de que deseas eliminar la devolución #${reembolso.id}?\n\nEsta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });

    if (confirmacion && onEliminar) {
      await onEliminar(reembolso.id);
    }
  };

  return (
    <>
      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Ingreso Original</th>
                <th>Proveedor</th>
                <th>N° Factura Dev.</th>
                <th>Motivo</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="empty">Cargando…</td>
                </tr>
              )}
              {!loading && pageData.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">No hay devoluciones registradas</td>
                </tr>
              )}
              {!loading && pageData.map((reembolso) => (
                <tr key={reembolso.id}>
                  <td>{reembolso.id}</td>
                  <td>{fmtFecha(reembolso.fecha)}</td>
                  <td>
                    {reembolso.ingresoOriginal ? (
                      <>
                        <div>#{reembolso.ingresoOriginal.id}</div>
                        <small>{reembolso.ingresoOriginal.numeroFactura || "-"}</small>
                      </>
                    ) : "-"}
                  </td>
                  <td>{reembolso.proveedor?.nombre || "-"}</td>
                  <td>{reembolso.numeroFacturaDevolucion || "-"}</td>
                  <td>
                    <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {reembolso.motivo || "-"}
                    </div>
                  </td>
                  <td><strong>{fmtCOP(reembolso.totalReembolso)}</strong></td>
                  <td>{getEstadoBadge(reembolso.estado, reembolso.procesado)}</td>
                  <td className="acciones">
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
                      <button
                        className="btnEdit"
                        onClick={() => onVerDetalles?.(reembolso)}
                        title="Ver detalles"
                      >
                        <img src={editar} className="iconButton" alt="Ver detalles" />
                      </button>
                      {!(reembolso.procesado || reembolso.estado === "PROCESADO") && (
                        <>
                          <button
                            className="btnEdit"
                            onClick={() => handleProcesar(reembolso)}
                            title="Procesar"
                          >
                            <img src={check} className="iconButton" alt="Procesar" />
                          </button>
                          <button
                            className="btnDelete"
                            onClick={() => handleEliminar(reembolso)}
                            title="Eliminar"
                          >
                            <img src={eliminar} className="iconButton" alt="Eliminar" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="pagination-bar">
          <div className="pagination-info">
            Mostrando {showingFrom}–{showingTo} de {total}
          </div>

          <div className="pagination-controls">
            <button className="pg-btn" onClick={goFirst} disabled={!canPrev}>«</button>
            <button className="pg-btn" onClick={goPrev} disabled={!canPrev}>‹</button>
            {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
              const p = Math.max(1, Math.min(curPage - 2, maxPage - 4)) + i;
              return p <= maxPage ? (
                <button key={p} className={`pg-btn ${p === curPage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ) : null;
            })}
            <button className="pg-btn" onClick={goNext} disabled={!canNext}>›</button>
            <button className="pg-btn" onClick={goLast} disabled={!canNext}>»</button>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </>
  );
}

