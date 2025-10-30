import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";

export default function CorteTable({ data = [], onEditar, onEliminar, isAdmin = true, userSede = "" }) {
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
            <th>Largo (cm)</th>
            
            {/* Columnas de inventario según el rol */}
            {isAdmin ? (
              <>
                <th>Insula</th>
                <th>Centro</th>
                <th>Patios</th>
                <th>Total</th>
              </>
            ) : (
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
            
            <th>Observación</th>
            {isAdmin && <th>Acciones</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 12 : 7} className="empty">Sin resultados</td>
            </tr>
          )}

          {data.map((c) => {
            const total = Number(c.cantidadTotal || 0) || 
              (Number(c.cantidadInsula || 0) + Number(c.cantidadCentro || 0) + Number(c.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica
            const cantidadVendedor = isAdmin ? total : (
              Number(c.cantidadInsula || 0) + Number(c.cantidadCentro || 0) + Number(c.cantidadPatios || 0)
            );

            return (
              <tr key={c.id}>
                <td>{c.codigo}</td>
                <td>{c.nombre}</td>
                <td>{c.categoria?.nombre || c.categoria || "-"}</td>
                <td>{c.color ?? "N/A"}</td>
                <td>{c.largoCm ?? "-"}</td>
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td>{c.cantidadInsula ?? 0}</td>
                    <td>{c.cantidadCentro ?? 0}</td>
                    <td>{c.cantidadPatios ?? 0}</td>
                    <td><strong>{total}</strong></td>
                  </>
                ) : (
                  <td><strong>{cantidadVendedor}</strong></td>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <>
                    <td>{c.precio1?.toLocaleString?.("es-CO") ?? "-"}</td>
                    <td>{c.precio2?.toLocaleString?.("es-CO") ?? "-"}</td>
                    <td>{c.precio3?.toLocaleString?.("es-CO") ?? "-"}</td>
                  </>
                ) : (
                  <td><strong>
                    {userSede === "Insula" ? (c.precio1?.toLocaleString?.("es-CO") ?? "-") : 
                     userSede === "Centro" ? (c.precio2?.toLocaleString?.("es-CO") ?? "-") :
                     userSede === "Patios" ? (c.precio3?.toLocaleString?.("es-CO") ?? "-") : "-"}
                  </strong></td>
                )}
                
                <td className="truncate" title={c.observacion || ""}>
                  {c.observacion || "-"}
                </td>
                
                {/* Solo administradores pueden editar/eliminar */}
                {isAdmin && (
                  <td className="acciones">
                    <button className="btnEdit" onClick={() => onEditar?.(c)}>
                    <img src={editar} className="iconButton" />
                    </button>
                    <button className="btnDelete" onClick={() => onEliminar?.(c.id)}>
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
