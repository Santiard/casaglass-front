

export default function CorteTable({ data = [], onEditar, onEliminar, isAdmin = true, userSede = "" }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
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
                <th>Precio especial</th>
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
              <td colSpan={isAdmin ? 11 : 6} className="empty">Sin resultados</td>
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
                <td>{c.categoria || "-"}</td>
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
                    <td>{c.precioEspecial?.toLocaleString?.("es-CO") ?? "-"}</td>
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
                    <button className="btnLink" onClick={() => onEditar?.(c)}>Editar</button>
                    <button className="btnLink" onClick={() => onEliminar?.(c.id)}>Eliminar</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
