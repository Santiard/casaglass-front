// src/componets/InventoryTable.jsx
import "../styles/Table.css"
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";

export default function InventoryTable({ data = [], filters, loading, onEditar, onEliminar, isAdmin = true, userSede = "" }) {
  const isVidrio =
    (filters?.category || "").toLowerCase() === "vidrio" ||
    (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Color</th>
            {isVidrio && <th>mm</th>}
            {isVidrio && <th>m²</th>}
            {isVidrio && <th>Láminas</th>}
            {/* Para ADMINISTRADOR: mostrar todas las columnas de inventario */}
            {isAdmin ? (
              <>
                <th>Insula</th>
                <th>Centro</th>
                <th>Patios</th>
                <th>Total</th>
              </>
            ) : (
              // Para VENDEDOR: mostrar solo la cantidad de su sede
              <th>Cantidad ({userSede})</th>
            )}
            {/* Precios según el rol */}
            {isAdmin ? (
              <>
                <th>Precio 1</th>
                <th>Precio 2</th>
                <th>Precio 3</th>
              </>
            ) : (
              <th>Precio</th>
            )}
            {isAdmin && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 14 : 11) : (isVidrio ? 11 : 8)} className="empty">Cargando…</td></tr>
          )}
          {!loading && data.length === 0 && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 14 : 11) : (isVidrio ? 11 : 8)} className="empty">Sin resultados</td></tr>
          )}
          {!loading && data.map((p) => {
            const total = Number(p.cantidadTotal || 0) || 
              (Number(p.cantidadInsula || 0) + Number(p.cantidadCentro || 0) + Number(p.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica
            const cantidadVendedor = isAdmin ? total : (
              userSede === "Insula" ? Number(p.cantidadInsula || 0) :
              userSede === "Centro" ? Number(p.cantidadCentro || 0) :
              userSede === "Patios" ? Number(p.cantidadPatios || 0) : 0
            );

            // Determinar si la fila debe pintarse de rojo (sin stock)
            const sinStock = isAdmin ? total === 0 : cantidadVendedor === 0;

            return (
              <tr key={p.id} className={sinStock ? "row-sin-stock" : ""}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>{p.color ?? "N/A"}</td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1m2 ?? "-"}</td>}
                {isVidrio && <td>{p.laminas ?? "-"}</td>}
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td>{p.cantidadInsula ?? 0}</td>
                    <td>{p.cantidadCentro ?? 0}</td>
                    <td>{p.cantidadPatios ?? 0}</td>
                    <td><strong>{total}</strong></td>
                  </>
                ) : (
                  // Para VENDEDOR: mostrar solo la cantidad de su sede
                  <td><strong>{cantidadVendedor}</strong></td>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <>
                    <td>{p.precio1 ?? "-"}</td>
                    <td>{p.precio2 ?? "-"}</td>
                    <td>{p.precio3 ?? "-"}</td>
                  </>
                ) : (
                  // Para VENDEDOR: mostrar solo el precio de su sede
                  <td><strong>
                    {userSede === "Insula" ? (p.precio1 ?? "-") : 
                     userSede === "Centro" ? (p.precio2 ?? "-") :
                     userSede === "Patios" ? (p.precio3 ?? "-") : "-"}
                  </strong></td>
                )}
                
                {/* Solo administradores pueden editar/eliminar */}
                {isAdmin && (
                  <td className="acciones">
                    <button className="btnEdit" onClick={() => onEditar?.(p)}>
                    <img src={editar} className="iconButton" />
                    </button>
                    <button className="btnDelete" onClick={() => onEliminar?.(p.id)}>
                    <img src={eliminar} className="iconButton" />
                    </button>
                  </td>

                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
