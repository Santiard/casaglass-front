

export default function CorteTable({ data = [], onEditar, onEliminar }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Color</th>
            <th>Sede</th>
            <th>Largo (cm)</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Observación</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={9} className="empty">Sin resultados</td>
            </tr>
          )}

          {data.map((c) => (
            <tr key={c.id}>
              <td>{c.codigo}</td>
              <td>{c.nombre}</td>
              <td>{c.color ?? "-"}</td>
              <td>{c.sede ?? "-"}</td>
              <td>{c.largoCm ?? "-"}</td>
              <td>{c.cantidad ?? 0}</td>
              <td>{c.precio?.toLocaleString?.("es-CO") ?? "-"}</td>
              <td className="truncate" title={c.observacion || ""}>
                {c.observacion || "-"}
              </td>
              <td className="acciones">
                <button className="btnLink" onClick={() => onEditar?.(c)}>Editar</button>
                <button className="btnLink" onClick={() => onEliminar?.(c.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
