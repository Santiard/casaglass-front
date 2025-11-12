import React, { useState, useMemo } from "react";
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
        nombre: `${producto.nombre} - Corte ${cortesCalculados.medidaCorte}cm`,
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

      // Verificar si ya existen cortes con el mismo prefijo de código, largo, categoría y color
      // Buscar tanto el SOLICITADO (el que se vende) como el SOBRANTE
      try {
        console.log("🔍 Buscando cortes existentes para reutilizar (solicitado y sobrante)...");
        // Usar el mismo endpoint que la tabla para garantizar formato consistente
        const existentes = await listarCortesInventarioCompleto({}, true, null);
        console.log(`📊 Total de cortes encontrados en sistema: ${existentes?.length || 0}`);
        console.log("📋 Primeros 3 cortes encontrados (muestra):", existentes?.slice(0, 3).map(c => ({
          id: c.id,
          codigo: c.codigo,
          largoCm: c.largoCm,
          categoria: c.categoria?.nombre || c.categoria,
          color: c.color
        })));
        
        const productoCodigo = (producto.codigo || "").toString();
        // El producto puede tener categoria como objeto {nombre: "PERFIL"} o como string "PERFIL"
        const productoCategoriaRaw = producto.categoria?.nombre || producto.categoria || "";
        const productoCategoria = (typeof productoCategoriaRaw === 'string' ? productoCategoriaRaw : productoCategoriaRaw.toString()).toLowerCase();
        const productoColor = (producto.color || "").toString().toLowerCase();
        const largoSolicitado = Number(cortesCalculados.medidaCorte);
        const largoSobrante = Number(cortesCalculados.medidaSobrante);
        
        console.log("🎯 Criterios de búsqueda:");
        console.log(`   - Prefijo código producto: "${productoCodigo}"`);
        console.log(`   - Largo solicitado: ${largoSolicitado} cm (el que se vende)`);
        console.log(`   - Largo sobrante: ${largoSobrante} cm (el que queda en inventario)`);
        console.log(`   - Categoría: "${productoCategoria}"`);
        console.log(`   - Color: "${productoColor}"`);

        // Función auxiliar para buscar coincidencias
        const buscarCoincidencia = (largoObjetivo, tipoCorte) => {
          return (existentes || []).find((c) => {
            const codigo = (c.codigo || "").toString();
            const categoriaRaw = c.categoria?.nombre || c.categoria || "";
            const categoria = (typeof categoriaRaw === 'string' ? categoriaRaw : categoriaRaw.toString()).toLowerCase();
            const color = (c.color || "").toString().toLowerCase();
            const largo = Number(c.largoCm || c.largo || 0);
            
            const coincideCodigo = codigo.startsWith(productoCodigo);
            const coincideLargo = largo === largoObjetivo;
            const coincideCategoria = categoria === productoCategoria;
            const coincideColor = color === productoColor;
            
            return coincideCodigo && coincideLargo && coincideCategoria && coincideColor;
          });
        };

        // Buscar corte SOLICITADO (el que se vende)
        const coincidenteSolicitado = buscarCoincidencia(largoSolicitado, "solicitado");
        if (coincidenteSolicitado?.id) {
          console.log("✅ Coincidencia SOLICITADO encontrada - Corte ID:", coincidenteSolicitado.id, "Código:", coincidenteSolicitado.codigo, "Largo:", coincidenteSolicitado.largoCm || coincidenteSolicitado.largo, "cm");
          // Guardar el ID para que el backend lo reutilice, incremente stock a 1 y luego lo descuente al vender
          corteParaVender.reutilizarCorteSolicitadoId = coincidenteSolicitado.id;
          console.log("🔄 El corte solicitado será reutilizado - stock se incrementará a 1 y luego se descontará al vender");
        } else {
          console.log("❌ No se encontró corte SOLICITADO existente. Se creará uno nuevo con stock 0.");
        }

        // Buscar corte SOBRANTE (el que queda en inventario)
        const coincidenteSobrante = buscarCoincidencia(largoSobrante, "sobrante");
        if (coincidenteSobrante?.id) {
          console.log("✅ Coincidencia SOBRANTE encontrada - Corte ID:", coincidenteSobrante.id, "Código:", coincidenteSobrante.codigo, "Largo:", coincidenteSobrante.largoCm || coincidenteSobrante.largo, "cm");
          // Marcar para reutilizar corte sobrante existente
          corteSobrante = {
            ...corteSobrante,
            reutilizarCorteId: coincidenteSobrante.id,
          };
          console.log("♻️ El corte sobrante será reutilizado - stock se incrementará");
        } else {
          console.log("❌ No se encontró corte SOBRANTE existente. Se creará uno nuevo.");
        }
      } catch (lookupErr) {
        console.warn("⚠️ No se pudo verificar cortes existentes:", lookupErr);
      }

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
