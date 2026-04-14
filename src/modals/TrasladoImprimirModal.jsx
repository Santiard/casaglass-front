import React from "react";
import Modal from "./Modal";

// TODO: Adjust props and logic as needed for traslado print
export default function TrasladoImprimirModal({ isOpen, onClose, traslado }) {
  if (!traslado) return null;
  const detalles = traslado.detalles || [];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Imprimir Traslado #${traslado.id}`}> 
      <div style={{ padding: 24, minWidth: 400 }}>
        <h2 style={{ marginBottom: 16 }}>Traslado #{traslado.id}</h2>
        <div><b>Fecha:</b> {traslado.fecha}</div>
        <div><b>Sede Origen:</b> {traslado.sedeOrigen?.nombre}</div>
        <div><b>Sede Destino:</b> {traslado.sedeDestino?.nombre}</div>
        <div style={{ margin: '16px 0' }}>
          <b>Productos:</b>
          <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Producto</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Color</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d, i) => (
                <tr key={i}>
                  <td>{d.producto?.nombre || '-'}</td>
                  <td>{d.producto?.color || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{d.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={window.print} style={{ background: '#2563eb', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Imprimir</button>
      </div>
    </Modal>
  );
}
