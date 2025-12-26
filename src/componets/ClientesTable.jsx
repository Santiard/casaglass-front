// src/componets/ClientesTable.jsx
import "../styles/Table.css";
import { useMemo, useState, useEffect } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import ClienteModal from "../modals/ClienteModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ClientesTable({
  data = [],
  onEditar,       // (cliente, isEdit) => Promise<void>
  onEliminar,     // (cliente) => Promise<void>
  onCrear,        // (cliente) => Promise<void>  (opcional)
  rowsPerPage: rowsPerPageProp = 10,
  loading = false
}) {
  const { showError } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageProp);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  // Sincroniza si te pasan un rowsPerPage distinto por props
  useEffect(() => { setRowsPerPage(rowsPerPageProp); }, [rowsPerPageProp]);

  // Guardar desde modal
  const handleSaveCliente = async (cliente, isEdit) => {
    try {
      const payload = { ...cliente, credito: cliente.credito === true || cliente.credito === "true" };
      if (isEdit) {
        await onEditar?.(payload, true);
      } else {
        if (onCrear) await onCrear(payload);
        else await onEditar?.(payload, false);
        // tras crear, vuelve a página 1 para ver el nuevo
        setPage(1);
      }
      setIsModalOpen(false);
    } catch (e) {
      // Error guardando cliente
      showError("No se pudo guardar el cliente.");
    }
  };

  // Abrir modal en modo agregar
  const handleAgregar = () => { setClienteEditando(null); setIsModalOpen(true); };
  // Abrir modal en modo editar
  const handleEditar = (cliente) => { setClienteEditando(cliente); setIsModalOpen(true); };

  const formatoBool = (b) => (b ? "Sí" : "No");

  // Filtro/búsqueda local + ordenación alfabética + paginación local
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    const porTexto = q
      ? data.filter((c) =>
          [c.nombre, c.nit, c.correo, c.ciudad, c.direccion, c.telefono]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : data;

    const porCiudad = filtroCiudad
      ? porTexto.filter((c) => (c.ciudad || "").toLowerCase() === filtroCiudad.toLowerCase())
      : porTexto;

    // Ordenar alfabéticamente por nombre (ignorando mayúsculas/minúsculas)
    const ordenados = [...porCiudad].sort((a, b) => {
      const nombreA = (a.nombre || "").toLowerCase();
      const nombreB = (b.nombre || "").toLowerCase();
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });

    const total = ordenados.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = ordenados.slice(start, start + rowsPerPage);

    return { pageData, total, maxPage, curPage, start };
  }, [data, query, filtroCiudad, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage, start } = filtrados;

  // Helpers de paginación
  const canPrev = curPage > 1;
  const canNext = curPage < maxPage;

  const goFirst = () => setPage(1);
  const goPrev  = () => setPage((p) => Math.max(1, p - 1));
  const goNext  = () => setPage((p) => Math.min(maxPage, p + 1));
  const goLast  = () => setPage(maxPage);

  // Cálculo “Mostrando X–Y de Z”
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo   = Math.min(start + rowsPerPage, total);

  // Genera pequeños botones de página (máx 5 visibles)
  const visiblePages = useMemo(() => {
    const span = 5;
    let startP = Math.max(1, curPage - Math.floor(span / 2));
    let endP = Math.min(maxPage, startP + span - 1);
    startP = Math.max(1, endP - span + 1);
    const arr = [];
    for (let i = startP; i <= endP; i++) arr.push(i);
    return arr;
  }, [curPage, maxPage]);

  return (
    <div className="table-container clientes">
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />

        <select
          className="clientes-select"
          value={filtroCiudad}
          onChange={(e) => { setFiltroCiudad(e.target.value); setPage(1); }}
        >
          <option value="">Todas las ciudades</option>
          <option value="Bogotá">Bogotá</option>
          <option value="Medellín">Medellín</option>
          <option value="Cali">Cali</option>
          <option value="Barranquilla">Barranquilla</option>
        </select>

        <div className="rows-per-page">
          <span className="items-count">Filas:</span>
          <select
            className="clientes-select"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button onClick={handleAgregar} className="addButton">
          <img src={add} className="iconButton" />
          Agregar Nuevo Cliente
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Correo</th>
              <th>Crédito</th>
              <th>Teléfono</th>
              <th>Ciudad</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr><td colSpan={8} className="empty">Cargando…</td></tr>
            )}

            {!loading && pageData.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">No hay registros</td>
              </tr>
            )}

            {!loading && pageData.map((cli) => (
              <tr key={cli.id ?? cli.nit ?? cli.correo}>
                <td title={cli.nombre ?? "-"}>{cli.nombre ?? "-"}</td>
                <td title={cli.nit ?? "-"}>{cli.nit ?? "-"}</td>
                <td title={cli.correo ?? "-"}>{cli.correo ?? "-"}</td>
                <td>{formatoBool(!!cli.credito)}</td>
                <td title={cli.telefono ?? "-"}>{cli.telefono ?? "-"}</td>
                <td title={cli.ciudad ?? "-"}>{cli.ciudad ?? "-"}</td>
                <td 
                  className="clientes-dir" 
                  title={cli.direccion ?? "-"}
                  data-full-text={cli.direccion ?? "-"}
                >
                  {cli.direccion ?? "-"}
                </td>
                <td className="clientes-actions">
                  <button className="btnEdit" onClick={() => handleEditar(cli)} title="Editar">
                    <img src={editar} className="iconButton" />
                  </button>
                  <button className="btnDelete" onClick={() => onEliminar?.(cli)} title="Eliminar">
                    <img src={eliminar} className="iconButton" />
                  </button>
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

        <ClienteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCliente}
          clienteAEditar={clienteEditando}
          clientesExistentes={data} // 👈 pasamos la lista completa para validar duplicados
        />
      
    </div>
  );
}
