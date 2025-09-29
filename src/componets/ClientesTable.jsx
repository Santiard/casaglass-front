import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import ClienteModal from "../modals/ClienteModal.jsx";

export default function ClientesTable({

  data = [],
  onEditar,        // (cliente) => void   (opcional)
  onEliminar,      // (cliente) => void   (opcional)
  rowsPerPage = 10
  
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [creditoMin, setCreditoMin] = useState("");
  const [creditoMax, setCreditoMax] = useState("");
  const [orden, setOrden] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

    const handleSaveCliente = (cliente, isEdit) => {
  if (isEdit) {
    // PUT al backend
    console.log("Editar cliente", cliente);
  } else {
    // POST al backend
    console.log("Agregar cliente", cliente);
  }
};
  // Abrir modal en modo agregar
const handleAgregar = () => {
  setClienteEditando(null);
  setIsModalOpen(true);
};

// Abrir modal en modo editar
const handleEditar = (cliente) => {
  setClienteEditando(cliente);
  setIsModalOpen(true);
};

  const formatoCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
      : n ?? "-";

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((c) =>
          [
            c.nombre,
            c.nit,
            c.correo,
            c.ciudad,
            c.direccion,
            c.telefono,
            String(c.credito)
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : data;

    // paginación simple
    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);

    return { pageData, total, maxPage, curPage };
  }, [data, query, page, rowsPerPage]);

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

          <input
            className="clientes-input"
            type="number"
            placeholder="Crédito mín."
            inputMode="numeric"   
            value={creditoMin}
            min="0"
            onChange={(e) => { setCreditoMin(e.target.value); setPage(1); }}
          />

          <input
            className="clientes-input"
            type="number"
            placeholder="Crédito máx."
            inputMode="numeric"   
            min="0"
            value={creditoMax}
            onChange={(e) => { setCreditoMax(e.target.value); setPage(1); }}
          />
          <button  onClick={handleAgregar} className="addButton">
          <img src={add} className="iconButton"/>
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
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">No hay registros</td>
              </tr>
            ) : (
              pageData.map((cli) => (
                <tr key={cli.id ?? cli.nit ?? cli.correo}>
                  <td>{cli.nombre ?? "-"}</td>
                  <td>{cli.nit ?? "-"}</td>
                  <td>{cli.correo ?? "-"}</td>
                  <td>{formatoCOP(Number(cli.credito))}</td>
                  <td>{cli.telefono ?? "-"}</td>
                  <td>{cli.ciudad ?? "-"}</td>
                  <td className="clientes-dir">{cli.direccion ?? "-"}</td>
                  <td className="clientes-actions">
                    {onEditar && (
                      <button className="btnEdit" onClick={()=> handleEditar(cli)}>
                      <img src={editar} className="iconButton"/>
                      </button>
                    )}
                    {onEliminar && (
                      <button className="btnDelete" onClick={() => onEliminar(cli)}>
                      <img src={eliminar} className="iconButton"/>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
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
