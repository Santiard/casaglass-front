// src/components/InventoryTable.jsx
import "../styles/Table.css";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";

export default function InventoryTable({ data = [], filters = {}, onEditar, onEliminar }) {
  const isVidrio = filters.category === "Vidrios";

  // 👉 función para calcular el total de cantidades en todas las sedes
  const getTotalCantidad = (p) =>
    (Number(p.cantidad) || 0) +
    (Number(p.cantidadInsula) || 0) +
    (Number(p.cantidadCentro) || 0) +
    (Number(p.cantidadPatios) || 0);

  return (
    <div className="table-wrapper">
      <table className="table inventory-table">
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Insula</th>
            <th>Centro</th>
            <th>Patios</th>
            <th>Total</th>
            <th>Precio 1</th>
            <th>Precio 2</th>
            <th>Precio 3</th>
            <th>Precio especial</th>
            {isVidrio && (
              <>
                <th>Espesor (mm)</th>
                <th>Área (m²)</th>
                <th>Láminas</th>
              </>
            )}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={isVidrio ? 13 : 10} className="empty">
                No hay productos
              </td>
            </tr>
          ) : (
            data.map((p) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>{p.cantidadInsula ?? 0}</td>
                <td>{p.cantidadCentro ?? 0}</td>
                <td>{p.cantidadPatios ?? 0}</td>
                <td>{getTotalCantidad(p)}</td>
                <td>{p.precio1 ?? "-"}</td>
                <td>{p.precio2 ?? "-"}</td>
                <td>{p.precio3 ?? "-"}</td>
                <td>{p.precioEspecial ?? "-"}</td>
                {isVidrio && (
                  <>
                    <td>{p.mm ?? "-"}</td>
                    <td>{p.m1m2 ?? "-"}</td>
                    <td>{p.laminas ?? "-"}</td>
                  </>
                )}
                <td className="clientes-actions">
                  {onEditar && (
                    <button className="btnEdit" onClick={() => onEditar(p)}>
                      <img src={editar} className="iconButton" />
                    </button>
                  )}
                  {onEliminar && (
                    <button className="btnDelete" onClick={() => onEliminar(p)}>
                      <img src={eliminar} className="iconButton" />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
