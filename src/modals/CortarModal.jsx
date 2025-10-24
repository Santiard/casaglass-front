import React, { useState, useMemo } from "react";
import "../styles/CrudModal.css";

export default function CortarModal({ 
  isOpen, 
  onClose, 
  producto, 
  onCortar 
}) {
  const [medidaCorte, setMedidaCorte] = useState("");
  const [loading, setLoading] = useState(false);

  // Constantes del sistema
  const LARGO_DEFAULT_PERFIL = 600; // 6 metros = 600 cm

  // Calcular medidas y precios usando useMemo para evitar recálculos innecesarios
  const cortesCalculados = useMemo(() => {
    // Validar que el producto existe
    if (!producto) {
      return null;
    }

    if (!medidaCorte || isNaN(medidaCorte) || medidaCorte <= 0) {
      return null;
    }

    const medida = Number(medidaCorte);
    const medidaSobrante = LARGO_DEFAULT_PERFIL - medida;

    if (medidaSobrante < 0) {
      return null; // Medida inválida
    }

    // Calcular precios proporcionales
    const precioOriginal = producto.precioUsado || producto.precio || 0;
    console.log("💰 Precio original para cálculo:", precioOriginal, "Producto:", producto);
    
    const porcentajeCorte = medida / LARGO_DEFAULT_PERFIL;
    const porcentajeSobrante = medidaSobrante / LARGO_DEFAULT_PERFIL;

    const precioCorte = precioOriginal * porcentajeCorte;
    const precioSobrante = precioOriginal * porcentajeSobrante;

    return {
      medidaCorte: medida,
      medidaSobrante,
      precioCorte,
      precioSobrante,
      porcentajeCorte: (porcentajeCorte * 100).toFixed(1),
      porcentajeSobrante: (porcentajeSobrante * 100).toFixed(1)
    };
  }, [producto, medidaCorte]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cortesCalculados) {
      alert("Por favor ingrese una medida válida");
      return;
    }

    if (cortesCalculados.medidaSobrante < 0) {
      alert("La medida del corte no puede ser mayor a 600 cm");
      return;
    }

    setLoading(true);

    try {
      // Crear el corte para vender (se agrega al carrito)
      const corteParaVender = {
        ...producto,
        id: `corte_${producto.id}_${Date.now()}`, // ID único para el corte
        nombre: `${producto.nombre} - Corte ${cortesCalculados.medidaCorte}cm`,
        cantidadVender: 1,
        precioUsado: cortesCalculados.precioCorte,
        esCorte: true,
        medidaCorte: cortesCalculados.medidaCorte,
        productoOriginal: producto.id
      };

      // Crear el corte sobrante para enviar al backend
      const corteSobrante = {
        productoId: producto.id,
        medidaSolicitada: cortesCalculados.medidaCorte,
        cantidad: 1,
        precioUnitarioSolicitado: cortesCalculados.precioCorte,
        precioUnitarioSobrante: cortesCalculados.precioSobrante
      };

      console.log("🔪 Corte para vender:", corteParaVender);
      console.log("📦 Corte sobrante:", corteSobrante);

      // Llamar a la función de corte
      if (onCortar) {
        await onCortar(corteParaVender, corteSobrante);
      }

      // Cerrar modal
      onClose();
      
    } catch (error) {
      console.error("Error al procesar corte:", error);
      alert("Error al procesar el corte. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMedidaCorte("");
    onClose();
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>✂️ Cortar Perfil</h2>
        
        <form onSubmit={handleSubmit} className="form">
          <label>
            Vender corte de: <strong>{producto?.nombre}</strong>
            <input
              type="number"
              placeholder="cms"
              value={medidaCorte}
              onChange={(e) => setMedidaCorte(e.target.value)}
              min="1"
              max="600"
              step="1"
              required
            />
          </label>

          {cortesCalculados && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e9ecef',
              marginTop: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.8rem 0', color: '#495057' }}>
                📊 Resumen del Corte
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>🔪 Corte a Vender:</strong>
                  <div>Medida: {cortesCalculados.medidaCorte} cm</div>
                  <div>Precio: ${cortesCalculados.precioCorte.toLocaleString('es-CO')}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeCorte}%</div>
                </div>
                
                <div>
                  <strong>📦 Corte Sobrante:</strong>
                  <div>Medida: {cortesCalculados.medidaSobrante} cm</div>
                  <div>Precio: ${cortesCalculados.precioSobrante.toLocaleString('es-CO')}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeSobrante}%</div>
                </div>
              </div>
              
              <div style={{ marginTop: '0.8rem', padding: '0.5rem', backgroundColor: '#e8f5e8', borderRadius: '0.25rem' }}>
                <strong>💰 Total Original:</strong> ${(producto.precioUsado || producto.precio || 0).toLocaleString('es-CO')}
              </div>
            </div>
          )}

          <div className="modal-buttons">
            <button 
              type="button" 
              className="btn-cancelar" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-guardar"
              disabled={loading || !cortesCalculados}
            >
              {loading ? "Procesando..." : "✂️ Cortar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
