// src/componets/InventoryTable.jsx
import "../styles/Table.css"

export default function InventoryTable({ data = [], filters, loading, onEditar, onEliminar }) {
  const isVidrio =
    (filters?.category || "").toLowerCase() === "vidrio" ||
    (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            {isVidrio && <th>mm</th>}
            {isVidrio && <th>m²</th>}
            {isVidrio && <th>Láminas</th>}
            <th>Total</th>
            <th>Precio 1</th>
            <th>Precio 2</th>
            <th>Precio 3</th>
            <th>Precio especial</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={isVidrio ? 12 : 9} className="empty">Cargando…</td></tr>
          )}
          {!loading && data.length === 0 && (
            <tr><td colSpan={isVidrio ? 12 : 9} className="empty">Sin resultados</td></tr>
          )}
          {!loading && data.map((p) => {
            const total =
              Number(p.cantidadInsula || 0) +
              Number(p.cantidadCentro || 0) +
              Number(p.cantidadPatios || 0) +
              Number(p.cantidad || 0);

            return (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1m2 ?? "-"}</td>}
                {isVidrio && <td>{p.laminas ?? "-"}</td>}
                <td>{total}</td>
                <td>{p.precio1 ?? "-"}</td>
                <td>{p.precio2 ?? "-"}</td>
                <td>{p.precio3 ?? "-"}</td>
                <td>{p.precioEspecial ?? "-"}</td>
                <td className="acciones">
                  <button className="btnLink" onClick={() => onEditar?.(p)}>Editar</button>
                  <button className="btnLink" onClick={() => onEliminar?.(p.id)}>Eliminar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
