import React, { useState, useMemo, useEffect } from "react";
import "../styles/CrudModal.css";
import { listarCortesInventarioCompleto } from "../services/InventarioService";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext.jsx";

export default function CortarModal({ 
  isOpen, 
  onClose, 
  producto, 
  onCortar 
}) {
  const { showError } = useToast();
  const { sedeId: sedeIdUsuario, isAdmin } = useAuth();
  const [medidaCorte, setMedidaCorte] = useState("");
  const [loading, setLoading] = useState(false);
  const [cortesDisponibles, setCortesDisponibles] = useState([]);
  const [corteSeleccionadoId, setCorteSeleccionadoId] = useState("");
  // corteBase será el objeto completo del corte seleccionado (si existe)
  const corteBase = useMemo(() => {
    return cortesDisponibles.find(c => String(c.id) === String(corteSeleccionadoId)) || null;
  }, [corteSeleccionadoId, cortesDisponibles]);
  // Cargar cortes existentes del producto al abrir el modal
  useEffect(() => {
    async function cargarCortes() {
      if (!isOpen || !producto) return;
      try {
        // Filtrar por producto actual
        // Para vendedores, solicitar cortes filtrados a la sede del usuario
        const cortes = await listarCortesInventarioCompleto({}, isAdmin, sedeIdUsuario);
        const productoCodigo = (producto.codigo || "").toString().trim();
        const productoCategoriaRaw = producto.categoria?.nombre || producto.categoria || "";
        const productoCategoria = (typeof productoCategoriaRaw === 'string' ? productoCategoriaRaw : productoCategoriaRaw.toString()).toLowerCase().trim();
        const productoColor = (producto.color || "").toString().toLowerCase().trim();
        // Filtrar cortes que coincidan con el producto
        const cortesFiltrados = (cortes || []).filter((c) => {
          const codigo = (c.codigo || "").toString().trim();
          const categoriaRaw = c.categoria?.nombre || c.categoria || "";
          const categoria = (typeof categoriaRaw === 'string' ? categoriaRaw : categoriaRaw.toString()).toLowerCase().trim();
          const color = (c.color || "").toString().toLowerCase().trim();
          // Determinar cantidad/stock disponible (admitir varios nombres de campo)
          const cantidadDisponible = Number(c.cantidadTotal ?? c.cantidadInsula ?? c.cantidadCentro ?? c.cantidadPatios ?? c.stock ?? c.cantidad ?? c.cant ?? c.cantidadDisponible ?? 0);
          // Ignorar cortes sin stock
          if (cantidadDisponible <= 0) return false;
          return codigo === productoCodigo && categoria === productoCategoria && color === productoColor;
        });
        setCortesDisponibles(cortesFiltrados);
      } catch (err) {
        setCortesDisponibles([]);
      }
    }
    cargarCortes();
  }, [isOpen, producto]);

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

  // Calcular medidas y precios usando useMemo para evitar recálculos innecesarios
  const cortesCalculados = useMemo(() => {
    if (!producto) return null;
    if (!medidaCorte || isNaN(medidaCorte) || medidaCorte <= 0) return null;
    // Usar el largo real del corte base si está seleccionado, sino el producto
    const largoBase = corteBase ? Number(corteBase.largoCm || corteBase.largo || producto.largoCm || producto.largo || 600) : Number(producto.largoCm || producto.largo || 600);
    const medida = Number(medidaCorte);
    const medidaSobrante = largoBase - medida;
    if (medidaSobrante < 0) return null;

    // Nueva fórmula de cálculo considerando pérdida de material
    // Se asume que de 6 metros totales, solo 5.2 metros son vendibles (0.8m de desperdicio)
    const precioOriginal = producto.precioUsado || producto.precio || 0;
    const metrosUtiles = 5.2; // Metros útiles considerados (de 6m totales)
    const precioPorMetro = precioOriginal / metrosUtiles; // Precio por metro útil
    
    // Convertir medidas de cm a metros
    const medidaEnMetros = medida / 100;
    const medidaSobranteEnMetros = medidaSobrante / 100;
    
    // Calcular precios según la nueva fórmula y redondear al múltiplo de 100 más cercano hacia arriba
    const precioCorteBase = precioPorMetro * medidaEnMetros;
    const precioSobranteBase = precioPorMetro * medidaSobranteEnMetros;
    
    // Redondear al múltiplo de 100 más cercano hacia arriba
    // Ejemplo: 45.678 → 45.700, 35.030 → 35.100
    const precioCorte = Math.ceil(precioCorteBase / 100) * 100;
    const precioSobrante = Math.ceil(precioSobranteBase / 100) * 100;
    
    // Calcular porcentajes solo para mostrar (informativos)
    const porcentajeCorte = medida / largoBase;
    const porcentajeSobrante = medidaSobrante / largoBase;

    return {
      medidaCorte: medida,
      medidaSobrante,
      precioCorte,
      precioSobrante,
      porcentajeCorte: (porcentajeCorte * 100).toFixed(1),
      porcentajeSobrante: (porcentajeSobrante * 100).toFixed(1),
      largoBase
    };
  }, [producto, medidaCorte, corteBase]);

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
      // Los precios ya vienen redondeados al múltiplo de 100 más cercano desde cortesCalculados
      const precioCorteRedondeado = cortesCalculados.precioCorte || 0;
      const precioSobranteRedondeado = cortesCalculados.precioSobrante || 0;

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

      // Si se seleccionó un corte existente como base, indicar al backend que debe partir ese corte
      if (corteBase && corteBase.id) {
        corteSobrante = {
          ...corteSobrante,
          corteBaseId: corteBase.id,
          corteBaseMedidaOriginal: Number(corteBase.largoCm || corteBase.largo || 0),
          cortarDesdeCorteExistente: true
        };
      }

      // Verificar si ya existen cortes para reutilizar
      // NOTA: El backend ahora usa el código base del producto (sin sufijo de medida)
      // Se busca por: código base + largoCm + categoría + color
      try {
        // Usar el mismo endpoint que la tabla para garantizar formato consistente
        const existentes = await listarCortesInventarioCompleto({}, isAdmin, sedeIdUsuario);
        
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
          // Corte solicitado existente encontrado - Reutilizando
        } else {
          // Corte solicitado nuevo - El backend creará uno nuevo
        }

        // Buscar corte SOBRANTE (el que queda en inventario)
        const coincidenteSobrante = buscarCoincidencia(largoSobrante);
        if (coincidenteSobrante?.id) {
          // Marcar para reutilizar corte sobrante existente
          corteSobrante = {
            ...corteSobrante,
            reutilizarCorteId: coincidenteSobrante.id,
          };
          // Corte sobrante existente encontrado - Reutilizando
        } else {
          // Corte sobrante nuevo - El backend creará uno nuevo
        }
      } catch (lookupErr) {
        // No se pudo verificar cortes existentes
      }

      // Llamar a la función de corte
      if (onCortar) {
        await onCortar(corteParaVender, corteSobrante);
      }

      // Cerrar modal
      onClose();
      
    } catch (error) {
      // Error al procesar corte
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
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2> Cortar Perfil</h2>
        <form onSubmit={handleSubmit} className="form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Columna 1: Input y cálculo */}
            <div>
              <label htmlFor="medidaCorteInput">Medida a cortar (cms):</label>
              <input
                id="medidaCorteInput"
                type="number"
                placeholder="cms"
                value={medidaCorte}
                onChange={e => {
                  setMedidaCorte(e.target.value);
                }}
                min="1"
                max={corteBase ? Number(corteBase.largoCm || corteBase.largo || 600) : 600}
                step="1"
                required
                style={{ width: '100%', marginBottom: '1rem' }}
              />
              {corteBase && (
                <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#444' }}>
                  Usando corte viejo de {Number(corteBase.largoCm || corteBase.largo || 0)} cm como base
                </div>
              )}
              {cortesCalculados && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e9ecef',
                  marginTop: '0.5rem'
                }}>
                  <strong>Valor del corte:</strong>
                  <div>Medida: {cortesCalculados.medidaCorte} cm</div>
                  <div>Precio: ${cortesCalculados.precioCorte.toLocaleString('es-CO', {minimumFractionDigits: 0})}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeCorte}%</div>
                  <hr style={{ margin: '0.5rem 0' }} />
                  <strong>Sobrante:</strong>
                  <div>Medida: {cortesCalculados.medidaSobrante} cm</div>
                  <div>Precio: ${cortesCalculados.precioSobrante.toLocaleString('es-CO', {minimumFractionDigits: 0})}</div>
                  <div>Porcentaje: {cortesCalculados.porcentajeSobrante}%</div>
                  <div style={{ marginTop: '0.8rem', padding: '0.5rem', backgroundColor: '#e8f5e8', borderRadius: '0.25rem' }}>
                    <strong> Total Original:</strong> ${(producto.precioUsado || producto.precio || 0).toLocaleString('es-CO')}
                  </div>
                </div>
              )}
            </div>
            {/* Columna 2: Tabla de cortes existentes */}
            <div>
              <strong>Cortes existentes en inventario</strong>
              <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f1f1' }}>
                      <th style={{ padding: '0.4rem', border: '1px solid #e0e0e0' }}>Medida (cm)</th>
                      <th style={{ padding: '0.4rem', border: '1px solid #e0e0e0' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cortesDisponibles.length === 0 ? (
                      <tr><td colSpan={2} style={{ textAlign: 'center', padding: '1rem' }}>No hay cortes disponibles</td></tr>
                    ) : (
                      cortesDisponibles.map(corte => (
                        <tr key={corte.id}>
                          <td style={{ padding: '0.4rem', border: '1px solid #e0e0e0' }}>{corte.largoCm || corte.largo}</td>
                          <td style={{ padding: '0.4rem', border: '1px solid #e0e0e0' }}>
                            <button
                              type="button"
                              style={{ padding: '0.2rem 0.7rem', fontSize: '0.95rem', background: corteSeleccionadoId === corte.id ? '#007bff' : '#e0e0e0', color: corteSeleccionadoId === corte.id ? '#fff' : '#333', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                              onClick={() => {
                                setCorteSeleccionadoId(corte.id);
                                // No llenar automáticamente la medida: el usuario debe ingresar la medida a extraer
                                setMedidaCorte("");
                              }}
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="modal-buttons" style={{ marginTop: '2rem' }}>
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
