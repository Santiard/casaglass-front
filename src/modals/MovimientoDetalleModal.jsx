// src/modals/MovimientoDetalleModal.jsx
import "../styles/IngresoDetalleModal.css"; // Reutilizar estilos de Ingreso

export default function MovimientoDetalleModal({ movimiento, onClose }) {
  if (!movimiento) return null;

  const dets = Array.isArray(movimiento.detalles) ? movimiento.detalles : [];

  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  const diaDeSemana = (iso) => {
    if (!iso) return "-";
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
      weekday: "long"
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-tall ingreso-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ color: 'white' }}>Detalles del traslado #{movimiento.id ?? "—"}</h2>
          <button className="btn" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        {/* Contenido principal */}
        <section className="ingreso-panel">
          {/* Información general */}
          <div className="ingreso-panel__meta">
            <div>
              <strong>Fecha:</strong> {fmtFecha(movimiento.fecha)}
            </div>
            <div>
              <strong>Día:</strong> {diaDeSemana(movimiento.fecha)}
            </div>
            <div>
              <strong>Sede Origen:</strong> {movimiento.sedeOrigen?.nombre ?? "-"}
            </div>
            <div>
              <strong>Sede Destino:</strong> {movimiento.sedeDestino?.nombre ?? "-"}
            </div>
            <div>
              <strong>Estado:</strong>{" "}
              {movimiento.trabajadorConfirmacion ? (
                <span className="status ok">Confirmado</span>
              ) : (
                <span className="status pending">Pendiente</span>
              )}
            </div>
            {movimiento.trabajadorConfirmacion && (
              <div className="span2">
                <strong>Confirmado por:</strong> {movimiento.trabajadorConfirmacion?.nombre ?? "-"}
              </div>
            )}
          </div>

          {/* Tabla de detalles */}
          <div className="ingreso-detalle-scroll">
            <table className="subtable">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {dets.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      Sin productos
                    </td>
                  </tr>
                ) : (
                  dets.map((d, idx) => (
                    <tr key={d.id ?? idx}>
                      <td>{d.producto?.codigo ?? "-"}</td>
                      <td>{d.producto?.nombre ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{d.cantidad ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
