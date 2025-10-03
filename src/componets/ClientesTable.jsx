// src/componets/ClientesTable.jsx
import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import ClienteModal from "../modals/ClienteModal.jsx";

export default function ClientesTable({
  data = [],
  onEditar,       // (cliente, isEdit) => Promise<void>
  onEliminar,     // (cliente) => Promise<void>
  onCrear,        // (cliente) => Promise<void>  (opcional)
  rowsPerPage = 10,
  loading = false
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtroCiudad, setFiltroCiudad] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  // Guardar desde modal
  const handleSaveCliente = async (cliente, isEdit) => {
    try {
      // Normaliza credito: modal podría mandarlo como string "true"/"false"
      const payload = { ...cliente, credito: cliente.credito === true || cliente.credito === "true" };
      if (isEdit) {
        await onEditar?.(payload, true);
      } else {
        // Si te gusta centralizar en onEditar, puedes llamarlo con false. Aquí uso onCrear si está:
        if (onCrear) await onCrear(payload);
        else await onEditar?.(payload, false);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error("Error guardando cliente", e);
      alert("No se pudo guardar el cliente.");
    }
  };

  // Abrir modal en modo agregar
  const handleAgregar = () => { setClienteEditando(null); setIsModalOpen(true); };

  // Abrir modal en modo editar
  const handleEditar = (cliente) => { setClienteEditando(cliente); setIsModalOpen(true); };

  const formatoBool = (b) => (b ? "Sí" : "No");

  // Filtro/búsqueda local + paginación local
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

    const total = porCiudad.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = porCiudad.slice(start, start + rowsPerPage);

    return { pageData, total, maxPage, curPage };
  }, [data, query, filtroCiudad, page, rowsPerPage]);

  const { pageData } = filtrados;

  return (
    <div className="table-container">
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
                <td>{cli.nombre ?? "-"}</td>
                <td>{cli.nit ?? "-"}</td>
                <td>{cli.correo ?? "-"}</td>
                <td>{formatoBool(!!cli.credito)}</td>
                <td>{cli.telefono ?? "-"}</td>
                <td>{cli.ciudad ?? "-"}</td>
                <td className="clientes-dir">{cli.direccion ?? "-"}</td>
                <td className="clientes-actions">
                  <button className="btnEdit" onClick={() => handleEditar(cli)}>
                    <img src={editar} className="iconButton" />
                  </button>

                  <button className="btnDelete" onClick={() => onEliminar?.(cli)}>
                    <img src={eliminar} className="iconButton" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ClienteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCliente}
          clienteAEditar={clienteEditando}
        />
      </div>
    </div>
  );
}