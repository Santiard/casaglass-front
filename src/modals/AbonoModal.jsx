import React, { useState } from 'react';
import './AbonoModal.css';

const AbonoModal = ({ isOpen, onClose, credito, onSuccess }) => {
  const [formData, setFormData] = useState({
    total: '',
    fecha: new Date().toISOString().slice(0, 10),
    metodoPago: 'EFECTIVO',
    factura: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({
      total: '',
      fecha: new Date().toISOString().slice(0, 10),
      metodoPago: 'EFECTIVO',
      factura: ''
    });
    setError('');
  };

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 🔍 Validaciones lógicas
    const total = parseFloat(formData.total);
    const hoy = new Date().toISOString().split('T')[0];
    if (isNaN(total) || total <= 0) {
      setError('El monto del abono debe ser mayor a 0.');
      return;
    }
    if (credito && total > credito.saldoPendiente) {
      setError(`El abono no puede ser mayor al saldo pendiente ($${credito.saldoPendiente?.toLocaleString()}).`);
      return;
    }
    if (formData.fecha > hoy) {
      setError('La fecha no puede ser futura.');
      return;
    }
    if (!formData.metodoPago) {
      setError('Debes seleccionar un método de pago.');
      return;
    }

    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
      
      const abonoData = {
        total: total,
        fecha: formData.fecha,
        metodoPago: formData.metodoPago,
        factura: formData.factura
      };
      
      console.log("Enviando abono:", abonoData, "para crédito:", credito?.id);
      
      const response = await fetch(`${baseUrl}/creditos/${credito?.id}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abonoData)
      });

      console.log("Respuesta del servidor:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del servidor:", errorText);
        throw new Error(`Error al registrar abono (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log("Abono creado exitosamente:", result);
      
      resetForm();
      if (onSuccess) {
        console.log("Ejecutando callback de éxito para recargar datos");
        onSuccess(); // 🔄 Refresca la vista padre
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear el abono');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="abono-modal-overlay">
      <div className="abono-modal">
        <h2>Registrar Abono</h2>
        {credito && (
          <div className="credito-info">
            <p><strong>Cliente:</strong> {credito.cliente?.nombre}</p>
            <p><strong>Saldo Pendiente:</strong> ${credito.saldoPendiente?.toLocaleString()}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Monto del Abono (COP)</label>
          <input
            type="number"
            name="total"
            value={formData.total}
            onChange={handleChange}
            step="100"
            min="0"
            max={credito?.saldoPendiente || undefined}
            placeholder={`Máx: $${credito?.saldoPendiente?.toLocaleString() || '0'}`}
          />

          <label>Fecha</label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
          />

          <label>Método de Pago</label>
          <select
            name="metodoPago"
            value={formData.metodoPago}
            onChange={handleChange}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTRO">Otro</option>
          </select>

          <label>Número de Factura / Recibo</label>
          <input
            type="text"
            name="factura"
            value={formData.factura}
            onChange={handleChange}
            placeholder="Ej: FAC-001"
            maxLength={50}
          />

          {error && <p className="error-msg">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-confirm" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AbonoModal;
