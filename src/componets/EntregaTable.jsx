import "../styles/EntregaTable.css";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import EntregaModal from "../modals/EntregaModal.jsx";

export default function EntregasTable({
  data = [],
  rowsPerPage = 10,
  onVerDetalles, // (entrega) => void
  onConfirmar, // (entrega) => void
  onEliminar, // (entrega) => Promise<void>
  onImprimir, // (entrega) => void - nuevo prop para imprimir
  onImprimirSeleccionadas, // (entregas[]) => void - nuevo prop para imprimir múltiples
  entregasSeleccionadasCount = 0, // Contador de entregas seleccionadas para mostrar en el header
  onImprimirSeleccionadasClick, // Handler para el botón de imprimir seleccionadas
}) {
  const [entregas, setEntregas] = useState([]);
  const [entregasSeleccionadas, setEntregasSeleccionadas] = useState([]); // IDs de entregas seleccionadas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entregaEditando, setEntregaEditando] = useState(null);

  // Actualizar entregas cuando cambian los datos del padre
  useEffect(() => {
    setEntregas(Array.isArray(data) ? data : []);
  }, [data]);

  const openNuevo = () => { setEntregaEditando(null); setIsModalOpen(true); };
  const openConfirmar = (ent) => {
    // Solo llamar a onConfirmar, el diálogo se maneja en la página padre
    if (onConfirmar) {
      onConfirmar(ent);
    }
  };

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

  // Manejar selección individual
  const toggleSeleccion = (entregaId) => {
    setEntregasSeleccionadas(prev => {
      if (prev.includes(entregaId)) {
        return prev.filter(id => id !== entregaId);
      } else {
        return [...prev, entregaId];
      }
    });
  };

  // Manejar seleccionar/deseleccionar todo en la página actual
  const toggleSeleccionarTodo = () => {
    const todosIds = pageData.map(ent => ent.id);
    const todosSeleccionados = todosIds.every(id => entregasSeleccionadas.includes(id));
    
    if (todosSeleccionados) {
      // Deseleccionar todos de la página actual
      setEntregasSeleccionadas(prev => prev.filter(id => !todosIds.includes(id)));
    } else {
      // Seleccionar todos de la página actual
      setEntregasSeleccionadas(prev => {
        const nuevos = [...prev];
        todosIds.forEach(id => {
          if (!nuevos.includes(id)) {
            nuevos.push(id);
          }
        });
        return nuevos;
      });
    }
  };

  // Verificar si todos los de la página están seleccionados
  const todosSeleccionadosEnPagina = pageData.length > 0 && 
    pageData.every(ent => entregasSeleccionadas.includes(ent.id));

  // Handler para imprimir seleccionadas - usar refs para evitar dependencias
  const entregasRef = React.useRef(entregas);
  const entregasSeleccionadasRef = React.useRef(entregasSeleccionadas);
  const onImprimirSeleccionadasRef = React.useRef(onImprimirSeleccionadas);
  
  React.useEffect(() => {
    entregasRef.current = entregas;
    entregasSeleccionadasRef.current = entregasSeleccionadas;
    onImprimirSeleccionadasRef.current = onImprimirSeleccionadas;
  }, [entregas, entregasSeleccionadas, onImprimirSeleccionadas]);

  const handleImprimirSeleccionadas = useCallback(() => {
    if (!onImprimirSeleccionadasRef.current) return;
    const seleccionadas = entregasRef.current.filter(ent => entregasSeleccionadasRef.current.includes(ent.id));
    if (seleccionadas.length > 0) {
      onImprimirSeleccionadasRef.current(seleccionadas);
    }
  }, []); // Sin dependencias - usa refs

  // Actualizar el callback del padre SOLO cuando cambia el count de seleccionadas
  // Usar useRef para rastrear el count anterior
  const prevCountRef = React.useRef(0);
  const onImprimirSeleccionadasClickRef = React.useRef(onImprimirSeleccionadasClick);
  
  React.useEffect(() => {
    onImprimirSeleccionadasClickRef.current = onImprimirSeleccionadasClick;
  }, [onImprimirSeleccionadasClick]);
  
  // Solo actualizar cuando el count cambia, usando refs para evitar loops
  React.useEffect(() => {
    const currentCount = entregasSeleccionadas.length;
    if (prevCountRef.current !== currentCount && onImprimirSeleccionadasClickRef.current) {
      prevCountRef.current = currentCount;
      onImprimirSeleccionadasClickRef.current({
        count: currentCount,
        handler: handleImprimirSeleccionadas
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregasSeleccionadas.length]);

  return (
    <div className="entregas-table-container">
      {/* Wrapper con scroll solo para el contenido */}
      <div className="entregas-table-wrapper">
        <table className="entregas-table">
          <thead>
            <tr>
              <th style={{ width: "50px" }}>
                <input
                  type="checkbox"
                  checked={todosSeleccionadosEnPagina}
                  onChange={toggleSeleccionarTodo}
                  title="Seleccionar/Deseleccionar todos en esta página"
                  style={{ 
                    width: "20px", 
                    height: "20px", 
                    cursor: "pointer",
                    transform: "scale(1.2)"
                  }}
                />
              </th>
              <th>Fecha</th>
              <th>Sede</th>
              <th>Empleado</th>
              <th>Monto Total</th>
              <th>Efectivo</th>
              <th>Transferencia</th>
              <th>Cheque</th>
              <th>Depósito</th>
              <th>Estado</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={12} className="empty">No hay entregas registradas</td></tr>
            ) : pageData.map((ent) => {
              const monto = Number(ent.monto ?? 0);
              const montoEfectivo = Number(ent.montoEfectivo ?? 0);
              const montoTransferencia = Number(ent.montoTransferencia ?? 0);
              const montoCheque = Number(ent.montoCheque ?? 0);
              const montoDeposito = Number(ent.montoDeposito ?? 0);
              const estaSeleccionada = entregasSeleccionadas.includes(ent.id);
              
              return (
                <tr
                  key={ent.id}
                  onDoubleClick={() => verDetalles(ent)}
                  style={{ cursor:"pointer", backgroundColor: estaSeleccionada ? "#e3f2fd" : "transparent" }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={estaSeleccionada}
                      onChange={() => toggleSeleccion(ent.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        width: "20px", 
                        height: "20px", 
                        cursor: "pointer",
                        transform: "scale(1.2)"
                      }}
                    />
                  </td>
                  <td>{fmtFecha(ent.fechaEntrega)}</td>
                  <td>{ent.sede?.nombre ?? "-"}</td>
                  <td>{ent.empleado?.nombre ?? "-"}</td>
                  <td className="monto-total">{fmtCOP(monto)}</td>
                  <td className="monto-desglose">{fmtCOP(montoEfectivo)}</td>
                  <td className="monto-desglose">{fmtCOP(montoTransferencia)}</td>
                  <td className="monto-desglose">{fmtCOP(montoCheque)}</td>
                  <td className="monto-desglose">{fmtCOP(montoDeposito)}</td>
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
                    <button className="btn" onClick={() => onImprimir?.(ent)} title="Imprimir">Imprimir</button>
                    <button 
                      className="btn" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openConfirmar(ent);
                      }} 
                      disabled={ent.estado !== "PENDIENTE"}
                    >
                      Confirmar
                    </button>
                    <button className="btn" onClick={() => handleEliminar(ent)} disabled={ent.estado === "ENTREGADA"}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="entregas-pagination">
        <div className="entregas-pagination-info">
          Mostrando {Math.min((curPage - 1) * rowsPerPage + 1, total)}–{Math.min(curPage * rowsPerPage, total)} de {total}
        </div>
        <div className="entregas-pagination-controls">
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


    </div>
  );
}