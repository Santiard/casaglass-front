import React from "react";
import "../styles/Table.css";

export default function VentasDiaTable({ ordenes, loading }) {
  const fmtCOP = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(n)
      : "-";

  const fmtFecha = (fecha) => {
    if (!fecha) return "-";
    try {
      // Si es formato YYYY-MM-DD, formatearlo directamente sin conversión de zona horaria
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        const [año, mes, dia] = fecha.split('T')[0].split('-');
        return `${dia}/${mes}/${año}`;
      }
      
      // Fallback
      return new Date(fecha).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        Cargando ventas del día...
      </div>
    );
  }

  if (!ordenes || ordenes.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        No hay ventas registradas hoy
      </div>
    );
  }

  const totalVentas = ordenes.reduce((sum, orden) => sum + (orden.total || 0), 0);
  const totalContado = ordenes.filter(o => !o.credito).reduce((sum, orden) => sum + (orden.total || 0), 0);
  const totalCredito = ordenes.filter(o => o.credito).reduce((sum, orden) => sum + (orden.total || 0), 0);

  return (
    <div style={{ 
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #e6e8f0',
      overflow: 'hidden'
    }}>
      {/* Resumen */}
      <div style={{
        padding: '1rem 1.5rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #e6e8f0',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>Total Ventas</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e2753' }}>{fmtCOP(totalVentas)}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>Contado</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10b981' }}>{fmtCOP(totalContado)}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>Crédito</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b' }}>{fmtCOP(totalCredito)}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>Cantidad</span>
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e2753' }}>{ordenes.length}</span>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table" style={{ margin: 0, width: '100%' }}>
          <thead style={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: '#1e2753',
            zIndex: 2
          }}>
            <tr>
              <th style={{ color: '#fff', padding: '0.75rem' }}>N° Orden</th>
              <th style={{ color: '#fff', padding: '0.75rem' }}>Fecha</th>
              <th style={{ color: '#fff', padding: '0.75rem' }}>Cliente</th>
              <th style={{ color: '#fff', padding: '0.75rem' }}>Obra</th>
              <th style={{ color: '#fff', padding: '0.75rem' }}>Sede</th>
              <th style={{ color: '#fff', padding: '0.75rem', textAlign: 'center' }}>Tipo</th>
              <th style={{ color: '#fff', padding: '0.75rem', textAlign: 'center' }}>Estado</th>
              <th style={{ color: '#fff', padding: '0.75rem', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden, index) => (
              <tr 
                key={orden.id}
                style={{
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e7f3ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9'}
              >
                <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                  #{orden.numero || orden.id}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {fmtFecha(orden.fecha)}
                </td>
                <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={orden.cliente?.nombre || '-'}>
                  {orden.cliente?.nombre || '-'}
                </td>
                <td style={{ padding: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={orden.obra || '-'}>
                  {orden.obra || '-'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {orden.sede?.nombre || '-'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: orden.credito ? '#fef3c7' : '#d1fae5',
                    color: orden.credito ? '#92400e' : '#065f46'
                  }}>
                    {orden.credito ? 'Crédito' : 'Contado'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: orden.facturada ? '#dbeafe' : '#fee2e2',
                    color: orden.facturada ? '#1e40af' : '#991b1b'
                  }}>
                    {orden.facturada ? 'Facturada' : 'Sin facturar'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#1e2753' }}>
                  {fmtCOP(orden.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ 
            backgroundColor: '#f8f9fa', 
            fontWeight: 'bold', 
            position: 'sticky', 
            bottom: 0, 
            zIndex: 2 
          }}>
            <tr>
              <td colSpan="7" style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                TOTAL:
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#1e2753' }}>
                {fmtCOP(totalVentas)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
