import React from 'react';
import '../styles/ConfirmModal.css';

export default function FacturarOpcionesModal({
  isOpen,
  onClose,
  onSoloEstaOrden,
  onTodasLasOrdenes,
  ordenNumero
}) {
  if (!isOpen) return null;

  const handleSoloEstaOrden = () => {
    onSoloEstaOrden?.(); // Esto ya cierra el modal de opciones y abre el de facturación
    // NO llamar onClose() aquí porque ya se maneja en OrdenesTable
  };

  const handleTodasLasOrdenes = () => {
    onTodasLasOrdenes?.(); // Esto ya cierra el modal de opciones y abre el de facturación múltiple
    // NO llamar onClose() aquí porque ya se maneja en OrdenesTable
  };

  return (
    <div className="modal-overlay confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="confirm-modal-icon confirm-modal-icon-info">
          📄
        </div>
        <h2 className="confirm-modal-title">Facturar Orden #{ordenNumero}</h2>
        <p className="confirm-modal-message" style={{ marginBottom: '1.5rem' }}>
          ¿Cómo deseas proceder con la facturación?
        </p>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem',
          width: '100%',
          marginBottom: '1rem'
        }}>
          <button
            className="confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-info"
            onClick={handleSoloEstaOrden}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📋</span>
            <span>Solo esta orden</span>
          </button>
          <button
            className="confirm-modal-btn confirm-modal-btn-confirm"
            onClick={handleTodasLasOrdenes}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              backgroundColor: '#1e2753',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: '2px solid #1e2753'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2d3a6b';
              e.target.style.borderColor = '#2d3a6b';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#1e2753';
              e.target.style.borderColor = '#1e2753';
            }}
          >
            <span>📚</span>
            <span>Todas las órdenes del cliente</span>
          </button>
        </div>
        <div style={{ 
          borderTop: '1px solid #e0e0e0', 
          paddingTop: '1rem',
          marginTop: '0.5rem'
        }}>
          <button
            className="confirm-modal-btn confirm-modal-btn-cancel"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

