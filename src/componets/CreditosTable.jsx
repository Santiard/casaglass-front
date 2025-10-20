import { useState } from "react";
import "../styles/Creditos.css";

const CreditosTable = ({ creditos, onAbrirAbonoModal }) => {
  const [expandido, setExpandido] = useState(null);

  const toggleExpandido = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  return (
    <div className="tabla-creditos">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Orden</th>
            <th>Fecha Inicio</th>
            <th>Fecha Cierre</th>
            <th>Total</th>
            <th>Abonado</th>
            <th>Saldo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {creditos.length === 0 ? (
            <tr>
              <td colSpan="10" className="sin-datos">No hay créditos registrados.</td>
            </tr>
          ) : (
            creditos.map((credito) => (
              <>
                <tr key={credito.id} className={`fila-credito ${credito.estado.toLowerCase()}`}>
                  <td>{credito.id}</td>
                  <td>{credito.cliente?.nombre}</td>
                  <td>{credito.orden?.numero || "-"}</td>
                  <td>{credito.fechaInicio}</td>
                  <td>{credito.fechaCierre || "-"}</td>
                  <td>${credito.totalCredito.toLocaleString()}</td>
                  <td>${credito.totalAbonado.toLocaleString()}</td>
                  <td>${credito.saldoPendiente.toLocaleString()}</td>
                  <td>
                    <span className={`estado-badge ${credito.estado.toLowerCase()}`}>{credito.estado}</span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-ver-detalles"
                      onClick={() => toggleExpandido(credito.id)}
                    >
                      {expandido === credito.id ? "Ocultar" : "Ver"}
                    </button>
                    
                    {credito.estado === "ABIERTO" && (
                      <button 
                        className="btn-abonar"
                        onClick={() => onAbrirAbonoModal(credito)}
                        title="Registrar abono"
                      >
                        Abonar
                      </button>
                    )}
                  </td>
                </tr>
                {expandido === credito.id && (
                  <tr className="detalle-abonos">
                    <td colSpan="10">
                      <h4>Abonos realizados</h4>
                      {credito.abonos && credito.abonos.length > 0 ? (
                        <table className="tabla-abonos">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Método</th>
                              <th>Factura</th>
                              <th>Total</th>
                              <th>Saldo post-abono</th>
                            </tr>
                          </thead>
                          <tbody>
                            {credito.abonos.map((a) => (
                              <tr key={a.id}>
                                <td>{a.fecha}</td>
                                <td>{a.metodoPago}</td>
                                <td>{a.factura || "-"}</td>
                                <td>${a.total.toLocaleString()}</td>
                                <td>${a.saldo.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="sin-abonos">No hay abonos registrados para este crédito.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CreditosTable;
