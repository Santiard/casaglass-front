import React, { useState, useMemo, useEffect } from "react";
import "../styles/CrudModal.css";
import { listarCortesInventarioCompleto } from "../services/InventarioService";
import { useToast } from "../context/ToastContext.jsx";

export default function CortarModal({ 
  isOpen, 
  onClose, 
  producto, 
  onCortar 
}) {
  const { showError } = useToast();
  const [medidaCorte, setMedidaCorte] = useState("");
  const [loading, setLoading] = useState(false);

  // Prevenir cierre/recarga de pestaña cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen]);

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
      showError("Por favor ingrese una medida válida");
      return;
    }

    if (cortesCalculados.medidaSobrante < 0) {
      showError("La medida del corte no puede ser mayor a 600 cm");
      return;
    }

    setLoading(true);

    try {
      // Crear el corte para vender (se agrega al carrito)
      const precioCorteRedondeado = Math.ceil(cortesCalculados.precioCorte || 0);
      const precioSobranteRedondeado = Math.ceil(cortesCalculados.precioSobrante || 0);

      const corteParaVender = {
        ...producto,
        id: `corte_${producto.id}_${Date.now()}`, // ID único para el corte
        nombre: `${producto.nombre} Corte de ${cortesCalculados.medidaCorte} CMS`,
        cantidadVender: 1,
        precioUsado: precioCorteRedondeado,
        esCorte: true,
        medidaCorte: cortesCalculados.medidaCorte,
        productoOriginal: producto.id
      };

      // Crear el corte sobrante para enviar al backend
      let corteSobrante = {
        productoId: producto.id,
        medidaSolicitada: cortesCalculados.medidaCorte,
        cantidad: 1,
        precioUnitarioSolicitado: precioCorteRedondeado,
        precioUnitarioSobrante: precioSobranteRedondeado,
        medidaSobrante: cortesCalculados.medidaSobrante,
      };

      // Verificar si ya existen cortes para reutilizar
      // NOTA: El backend ahora usa el código base del producto (sin sufijo de medida)
      // Se busca por: código base + largoCm + categoría + color
      try {
        // Usar el mismo endpoint que la tabla para garantizar formato consistente
        const existentes = await listarCortesInventarioCompleto({}, true, null);
        
        const productoCodigo = (producto.codigo || "").toString().trim();
        // El producto puede tener categoria como objeto {nombre: "PERFIL"} o como string "PERFIL"
        const productoCategoriaRaw = producto.categoria?.nombre || producto.categoria || "";
        const productoCategoria = (typeof productoCategoriaRaw === 'string' ? productoCategoriaRaw : productoCategoriaRaw.toString()).toLowerCase().trim();
        const productoColor = (producto.color || "").toString().toLowerCase().trim();
        const largoSolicitado = Number(cortesCalculados.medidaCorte);
        const largoSobrante = Number(cortesCalculados.medidaSobrante);
        
        // Función auxiliar para buscar coincidencias
        // El backend verifica: código base (sin sufijo) + largoCm + categoría + color
        const buscarCoincidencia = (largoObjetivo) => {
          return (existentes || []).find((c) => {
            const codigo = (c.codigo || "").toString().trim();
            const categoriaRaw = c.categoria?.nombre || c.categoria || "";
            const categoria = (typeof categoriaRaw === 'string' ? categoriaRaw : categoriaRaw.toString()).toLowerCase().trim();
            const color = (c.color || "").toString().toLowerCase().trim();
            const largo = Number(c.largoCm || c.largo || 0);
            
            // Verificar código base (sin sufijo de medida), largo, categoría y color
            const coincideCodigo = codigo === productoCodigo;
            const coincideLargo = largo === largoObjetivo;
            const coincideCategoria = categoria === productoCategoria;
            const coincideColor = color === productoColor;
            
            return coincideCodigo && coincideLargo && coincideCategoria && coincideColor;
          });
        };

        // Buscar corte SOLICITADO (el que se vende)
        const coincidenteSolicitado = buscarCoincidencia(largoSolicitado);
        if (coincidenteSolicitado?.id) {
          // Guardar el ID para que el backend lo reutilice
          corteParaVender.reutilizarCorteSolicitadoId = coincidenteSolicitado.id;
          console.log(` Corte solicitado existente encontrado - Reutilizando (ID: ${coincidenteSolicitado.id}, código: ${coincidenteSolicitado.codigo}, largo: ${coincidenteSolicitado.largoCm || coincidenteSolicitado.largo}cm)`);
        } else {
          console.log(` Corte solicitado nuevo - El backend creará uno nuevo con código base "${productoCodigo}" y largo ${largoSolicitado}cm`);
        }

        // Buscar corte SOBRANTE (el que queda en inventario)
        const coincidenteSobrante = buscarCoincidencia(largoSobrante);
        if (coincidenteSobrante?.id) {
          // Marcar para reutilizar corte sobrante existente
          corteSobrante = {
            ...corteSobrante,
            reutilizarCorteId: coincidenteSobrante.id,
          };
          console.log(` Corte sobrante existente encontrado - Reutilizando (ID: ${coincidenteSobrante.id}, código: ${coincidenteSobrante.codigo}, largo: ${coincidenteSobrante.largoCm || coincidenteSobrante.largo}cm)`);
        } else {
          console.log(` Corte sobrante nuevo - El backend creará uno nuevo con código base "${productoCodigo}" y largo ${largoSobrante}cm`);
        }
      } catch (lookupErr) {
        console.warn(" No se pudo verificar cortes existentes:", lookupErr);
      }

      // Llamar a la función de corte
      if (onCortar) {
        await onCortar(corteParaVender, corteSobrante);
      }

      // Cerrar modal
      onClose();
      
    } catch (error) {
      console.error("Error al procesar corte:", error);
      showError("Error al procesar el corte. Intente nuevamente.");
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
        <h2> Cortar Perfil</h2>
        
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
 Resumen del Corte
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>🔪 Corte a Vender:</strong>
                  <div>Medida: {cortesCalculados.medidaCorte} cm</div>
                  <div>Precio: ${cortesCalculados.precioCorte.toLocaleString('es-CO')}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeCorte}%</div>
                </div>
                
                <div>
                  <strong> Corte Sobrante:</strong>
                  <div>Medida: {cortesCalculados.medidaSobrante} cm</div>
                  <div>Precio: ${cortesCalculados.precioSobrante.toLocaleString('es-CO')}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeSobrante}%</div>
                </div>
              </div>
              
              <div style={{ marginTop: '0.8rem', padding: '0.5rem', backgroundColor: '#e8f5e8', borderRadius: '0.25rem' }}>
                <strong> Total Original:</strong> ${(producto.precioUsado || producto.precio || 0).toLocaleString('es-CO')}
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
              {loading ? "Procesando..." : " Cortar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
