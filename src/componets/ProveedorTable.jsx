import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import ProveedorModal from "../modals/ProveedorModal.jsx";

export default function ProveedoresTable({
  data = [],
  onEditar,        // (proveedor) => void
  onEliminar,      // (proveedor) => void
  rowsPerPage = 10
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);

  const handleSaveProveedor = (proveedor, isEdit) => {
    if (isEdit) {
      console.log("Editar proveedor", proveedor); // aquí iría PUT al backend
    } else {
      console.log("Agregar proveedor", proveedor); // aquí iría POST al backend
    }
  };

  const handleAgregar = () => {
    setProveedorEditando(null);
    setIsModalOpen(true);
  };

  const handleEditar = (proveedor) => {
    setProveedorEditando(proveedor);
    setIsModalOpen(true);
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? data.filter((p) =>
          [p.nombre, p.nit, p.ciudad, p.direccion, p.telefono]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : data;

    const ciudadFiltered = filtroCiudad
      ? arr.filter((p) => p.ciudad === filtroCiudad)
      : arr;

    const total = ciudadFiltered.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = ciudadFiltered.slice(start, start + rowsPerPage);

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
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="clientes-select"
          value={filtroCiudad}
          onChange={(e) => {
            setFiltroCiudad(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las ciudades</option>
          <option value="Bogotá">Bogotá</option>
          <option value="Medellín">Medellín</option>
          <option value="Cali">Cali</option>
          <option value="Barranquilla">Barranquilla</option>
        </select>

        <button onClick={handleAgregar} className="addButton">
          <img src={add} className="iconButton" />
          Agregar Nuevo Proveedor
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Teléfono</th>
              <th>Ciudad</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No hay registros
                </td>
              </tr>
            ) : (
              pageData.map((prov) => (
                <tr key={prov.id ?? prov.nit}>
                  <td>{prov.nombre ?? "-"}</td>
                  <td>{prov.nit ?? "-"}</td>
                  <td>{prov.telefono ?? "-"}</td>
                  <td>{prov.ciudad ?? "-"}</td>
                  <td className="clientes-dir">{prov.direccion ?? "-"}</td>
                  <td className="clientes-actions">
                    {onEditar && (
                      <button
                        className="btnEdit"
                        onClick={() => handleEditar(prov)}
                      >
                        <img src={editar} className="iconButton" />
                      </button>
                    )}
                    {onEliminar && (
                      <button
                        className="btnDelete"
                        onClick={() => onEliminar(prov)}
                      >
                        <img src={eliminar} className="iconButton" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <ProveedorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProveedor}
          proveedorAEditar={proveedorEditando}
        />
      </div>
    </div>
  );
}
