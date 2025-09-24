import "../styles/ClientesTable.css";
import { useMemo, useState } from "react";

export default function ClientesTable({
  data = [],
  onSeleccionar,   // (cliente) => void   (opcional)
  onEditar,        // (cliente) => void   (opcional)
  onEliminar,      // (cliente) => void   (opcional)
  rowsPerPage = 10
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

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

  const { pageData, total, maxPage, curPage } = filtrados;

  return (
    <div className="clientes-table-container">
      <div className="clientes-toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar por nombre, NIT, correo, ciudad..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <div className="clientes-pager">
          <span>{total} registro(s)</span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={curPage <= 1}
          >
            ◀
          </button>
          <span>{curPage}/{maxPage}</span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={curPage >= maxPage}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="clientes-table-wrapper">
        <table className="clientes-table">
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
                <td colSpan={8} className="clientes-empty">No hay registros</td>
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
                    {onSeleccionar && (
                      <button className="btn-primary" onClick={() => onSeleccionar(cli)}>
                        Seleccionar
                      </button>
                    )}
                    {onEditar && (
                      <button className="btn-edit" onClick={() => onEditar(cli)}>
                        Editar
                      </button>
                    )}
                    {onEliminar && (
                      <button className="btn-danger" onClick={() => onEliminar(cli)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}