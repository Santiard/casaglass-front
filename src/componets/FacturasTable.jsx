import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import check from "../assets/check.png";

export default function FacturasTable({
  data = [],
  onVerificar,
  onEliminar,
  clientes = [],
  rowsPerPage = 10,
  loading = false,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);
  const [filtroCliente, setFiltroCliente] = useState("");

  const fmtFecha = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : n ?? "-";

  const formatearEstado = (estado) => {
    const estadoLimpio = estado?.toLowerCase() || 'pendiente';
    const textos = {
      'pendiente': 'Pendiente',
      'pagada': 'Pagada', 
      'anulada': 'Anulada',
      'en_proceso': 'En Proceso'
    };
    
    const texto = textos[estadoLimpio] || estado || 'Pendiente';
    
    let bgColor, textColor;
    switch(estadoLimpio) {
      case 'pagada':
        bgColor = 'var(--color-success-bg)';
        textColor = 'var(--color-success)';
        break;
      case 'anulada':
        bgColor = 'var(--color-danger-bg)';
        textColor = 'var(--color-danger)';
        break;
      case 'pendiente':
        bgColor = 'var(--color-warning-bg)';
        textColor = 'var(--color-warning)';
        break;
      case 'en_proceso':
        bgColor = 'var(--color-info-bg)';
        textColor = 'var(--color-info)';
        break;
      default:
        bgColor = 'var(--color-gray)';
        textColor = 'var(--color-white)';
    }
    
    return (
      <span 
        className="badge"
        style={{
          background: bgColor,
          color: textColor,
          padding: '0.25rem 0.5rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}
      >
        {texto}
      </span>
    );
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = data;

    if (q) {
      arr = arr.filter((f) =>
        [
          f.numeroFactura,
          f.numero,
          f.fecha,
          f.cliente?.nombre,
          f.cliente?.nit,
          f.observaciones,
          f.formaPago,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (filtroCliente) {
      arr = arr.filter((f) => Number(f.cliente?.id || f.orden?.cliente?.id) === Number(filtroCliente));
    }

    arr = [...arr].sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      const diffFechas = fechaB - fechaA;
      if (diffFechas === 0) return (b.id || 0) - (a.id || 0);
      return diffFechas;
    });

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPageState));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPageState;
    const pageData = arr.slice(start, start + rowsPerPageState);
    return { pageData, total, maxPage, curPage, start };
  }, [data, query, page, rowsPerPageState, filtroCliente]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;
  const goFirst = () => setPage(1);
  const goPrev  = () => setPage(p => Math.max(1, p - 1));
  const goNext  = () => setPage(p => Math.min(maxPage, p + 1));
  const goLast  = () => setPage(maxPage);

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPageState, total);

  return (
    <div className="table-container facturas">
      {/* 🔍 Buscador y Filtros */}
      <div className="ordenes-toolbar">
        <div className="ordenes-filters">
          <input
            className="clientes-input ordenes-search"
            type="text"
            placeholder="Buscar factura por número, cliente, NIT..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          
          <select
            className="clientes-input ordenes-estado-filter"
            value={filtroCliente}
            onChange={(e) => {
              setFiltroCliente(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
          
          {(query || filtroCliente) && (
            <button
              onClick={() => {
                setQuery("");
                setFiltroCliente("");
                setPage(1);
              }}
              className="btn-clear-filters"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="ordenes-actions">
          <div className="rows-per-page">
            <span>Filas:</span>
            <select
              className="clientes-select"
              value={rowsPerPageState}
              onChange={(e) => { setRowsPerPageState(Number(e.target.value)); setPage(1); }}
            >
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 📋 Tabla principal */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Número Factura</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>NIT</th>
              <th>Orden</th>
              <th>Subtotal</th>
              <th>IVA</th>
              <th>Total</th>
              <th>Forma de Pago</th>
              <th>Estado</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="empty">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={12} className="empty">
                  No hay facturas registradas
                </td>
              </tr>
            )}

            {!loading &&
              pageData.map((f) => {
                const cliente = f.cliente || f.orden?.cliente;
                const subtotal = f.subtotal || 0;
                const iva = f.iva || 0;
                const descuentos = f.descuentos || 0;
                const total = f.total || (subtotal + iva - descuentos);
                const estado = f.estado?.toLowerCase() || 'pendiente';
                const puedeVerificar = estado === 'pendiente' || estado === 'en_proceso';
                const puedeEliminar = estado !== 'pagada'; // Backend no permite eliminar pagadas

                return (
                  <tr key={f.id}>
                    <td>#{f.numeroFactura || f.numero || f.id}</td>
                    <td>{fmtFecha(f.fecha)}</td>
                    <td>{cliente?.nombre ?? "-"}</td>
                    <td>{cliente?.nit ?? "-"}</td>
                    <td>#{f.orden?.numero ?? f.ordenId ?? "-"}</td>
                    <td>{fmtCOP(subtotal)}</td>
                    <td>{fmtCOP(iva)}</td>
                    <td>{fmtCOP(total)}</td>
                    <td>{f.formaPago ?? "-"}</td>
                    <td>{formatearEstado(f.estado)}</td>
                    <td className="cut">{f.observaciones ?? "-"}</td>
                    <td className="clientes-actions">
                      {puedeVerificar && (
                        <button 
                          className="btnConfirm" 
                          onClick={() => onVerificar?.(f)} 
                          title="Verificar / Marcar como pagada"
                          style={{
                            backgroundColor: '#28a745',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            marginRight: '4px'
                          }}
                        >
                          <img src={check} className="iconButton" alt="Verificar" />
                        </button>
                      )}
                      {puedeEliminar && (
                        <button 
                          className="btnDelete" 
                          onClick={() => onEliminar?.(f)} 
                          title="Eliminar factura"
                        >
                          <img src={eliminar} className="iconButton" alt="Eliminar" />
                        </button>
                      )}
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
          Mostrando {showingFrom}–{showingTo} de {total}
        </div>

        <div className="pagination-controls">
          <button className="pg-btn" onClick={goFirst} disabled={!canPrev}>«</button>
          <button className="pg-btn" onClick={goPrev}  disabled={!canPrev}>‹</button>
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
  );
}
