import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { listarClientes } from '../services/ClientesService.js';
import { listarOrdenesTabla, obtenerOrden } from '../services/OrdenesService.js';
import { getBusinessSettings } from '../services/businessSettingsService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/CrudModal.css';
import './AbonoModal.css';
import './FacturarMultiplesOrdenesModal.css';

const FacturarMultiplesOrdenesModal = ({ isOpen, onClose, ordenInicial, onSuccess }) => {
  const { showError, showSuccess } = useToast();
  
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteFactura, setClienteFactura] = useState(null); // Cliente al que se factura (puede ser diferente)
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showClienteFacturaModal, setShowClienteFacturaModal] = useState(false);
  const [ordenesFacturables, setOrdenesFacturables] = useState([]);
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState(new Set());
  const [ordenesConRetencion, setOrdenesConRetencion] = useState(new Set()); // Set de ordenIds que tienen retefuente
  const [ordenInicialCompleta, setOrdenInicialCompleta] = useState(null); // Orden inicial completa con todos los datos
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    formaPago: 'EFECTIVO',
    observaciones: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [error, setError] = useState('');
  
  // Configuración de impuestos
  const [ivaRate, setIvaRate] = useState(19);
  const [retefuenteRate, setRetefuenteRate] = useState(2.5);
  const [retefuenteThreshold, setRetefuenteThreshold] = useState(1000000);

  // Cargar configuración, clientes y orden completa al abrir
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 [useEffect principal] Modal abierto, ordenInicial:", ordenInicial);
      
      // Cargar configuración de impuestos
      getBusinessSettings().then((settings) => {
        if (settings) {
          setIvaRate(Number(settings.ivaRate) || 19);
          setRetefuenteRate(Number(settings.retefuenteRate) || 2.5);
          setRetefuenteThreshold(Number(settings.retefuenteThreshold) || 1000000);
        }
      });
      
      // Si hay orden inicial, obtener la orden completa del backend para tener todos los datos
      const cargarDatos = async () => {
        try {
          // Cargar clientes primero
          const clientesData = await listarClientes();
          const clientesArray = Array.isArray(clientesData) ? clientesData : [];
          setClientes(clientesArray);
          console.log("✅ Clientes cargados:", clientesArray.length);
          
          // Si viene una orden inicial, obtener la orden completa
          if (ordenInicial?.id) {
            console.log("🔍 [cargarDatos] Hay ordenInicial con ID:", ordenInicial.id);
            try {
              const ordenCompleta = await obtenerOrden(ordenInicial.id);
              console.log("✅ Orden completa obtenida:", ordenCompleta);
              setOrdenInicialCompleta(ordenCompleta); // IMPORTANTE: Guardar la orden completa
              
              // Usar la orden completa (tiene todos los datos del cliente)
              if (ordenCompleta?.cliente) {
                // Buscar el cliente completo en la lista cargada
                const clienteCompleto = clientesArray.find(c => c.id === ordenCompleta.cliente.id) || ordenCompleta.cliente;
                console.log("✅ Cliente seteado automáticamente:", clienteCompleto);
                setClienteSeleccionado(clienteCompleto);
                setClienteFactura(clienteCompleto);
                setClienteSearch(clienteCompleto.nombre || '');
              } else if (ordenInicial?.cliente) {
                // Fallback: usar el cliente de la orden inicial
                const clienteCompleto = clientesArray.find(c => c.id === ordenInicial.cliente.id) || ordenInicial.cliente;
                console.log("⚠️ Usando cliente de ordenInicial (fallback):", clienteCompleto);
                setClienteSeleccionado(clienteCompleto);
                setClienteFactura(clienteCompleto);
                setClienteSearch(clienteCompleto.nombre || '');
              }
            } catch (ordenErr) {
              console.warn("No se pudo obtener la orden completa, usando la inicial:", ordenErr);
              setOrdenInicialCompleta(ordenInicial); // Guardar orden inicial como fallback
              // Fallback: usar la orden inicial
              if (ordenInicial?.cliente) {
                const clienteCompleto = clientesArray.find(c => c.id === ordenInicial.cliente.id) || ordenInicial.cliente;
                setClienteSeleccionado(clienteCompleto);
                setClienteFactura(clienteCompleto);
                setClienteSearch(clienteCompleto.nombre || '');
              }
            }
          } else if (ordenInicial?.cliente) {
            // Si no hay ID pero hay cliente, usar el cliente directamente
            setOrdenInicialCompleta(ordenInicial);
            const clienteCompleto = clientesArray.find(c => c.id === ordenInicial.cliente.id) || ordenInicial.cliente;
            setClienteSeleccionado(clienteCompleto);
            setClienteFactura(clienteCompleto);
            setClienteSearch(clienteCompleto.nombre || '');
          } else {
            setOrdenInicialCompleta(null);
          }
        } catch (err) {
          console.error("Error cargando datos:", err);
          setClientes([]);
          // Fallback: usar datos de ordenInicial si están disponibles
          if (ordenInicial?.cliente) {
            setClienteSeleccionado(ordenInicial.cliente);
            setClienteFactura(ordenInicial.cliente);
            setClienteSearch(ordenInicial.cliente.nombre || '');
          }
        }
      };
      
      cargarDatos();
    }
  }, [isOpen, ordenInicial]);

  // Cargar órdenes facturables del cliente
  // Este useEffect se ejecuta cuando clienteSeleccionado cambia
  useEffect(() => {
    if (isOpen && clienteSeleccionado?.id) {
      console.log("🔍 [useEffect clienteSeleccionado] Cargando órdenes facturables para cliente:", clienteSeleccionado.id, clienteSeleccionado.nombre);
      cargarOrdenesFacturables(clienteSeleccionado.id);
    } else if (isOpen && !clienteSeleccionado) {
      // Si se abre sin cliente, limpiar órdenes
      console.log("⚠️ [useEffect clienteSeleccionado] No hay cliente seleccionado, limpiando órdenes");
      setOrdenesFacturables([]);
      setOrdenesSeleccionadas(new Set());
      setOrdenesConRetencion(new Set());
    }
  }, [isOpen, clienteSeleccionado?.id]);

  const cargarOrdenesFacturables = async (clienteId) => {
    setLoadingOrdenes(true);
    try {
      const ordenes = await listarOrdenesTabla({ clienteId: Number(clienteId) });
      
      // Filtrar órdenes facturables:
      // 1. venta: true (confirmadas)
      // 2. facturada: false (no facturadas)
      // 3. estado !== "ANULADA"
      // 4. Si es crédito: saldoPendiente === 0 (ya pagadas)
      const ordenesFacturablesFiltradas = ordenes.filter(orden => {
        const esVenta = Boolean(orden.venta === true);
        const yaFacturada = Boolean(orden.facturada || orden.numeroFactura || orden.factura);
        const estaAnulada = String(orden.estado || '').toUpperCase() === 'ANULADA';
        const esCredito = Boolean(orden.credito === true);
        const tieneSaldoPendiente = esCredito && Number(orden.creditoDetalle?.saldoPendiente || 0) > 0;
        
        return esVenta && !yaFacturada && !estaAnulada && !tieneSaldoPendiente;
      });
      
      setOrdenesFacturables(ordenesFacturablesFiltradas);
      
      // Si hay una orden inicial, preseleccionarla
      // Usar ordenInicialCompleta si está disponible, sino ordenInicial
      const ordenIdInicial = ordenInicialCompleta?.id || ordenInicial?.id;
      if (ordenIdInicial) {
        const ordenInicialEncontrada = ordenesFacturablesFiltradas.find(o => o.id === ordenIdInicial);
        if (ordenInicialEncontrada) {
          // Preseleccionar la orden inicial
          setOrdenesSeleccionadas(new Set([ordenIdInicial]));
          // Inicializar retefuente basado en tieneRetencionFuente
          // Priorizar ordenInicialCompleta, luego ordenInicialEncontrada, luego ordenInicial
          const tieneRetencion = Boolean(
            ordenInicialCompleta?.tieneRetencionFuente || 
            ordenInicialEncontrada.tieneRetencionFuente || 
            ordenInicial?.tieneRetencionFuente
          );
          if (tieneRetencion) {
            setOrdenesConRetencion(new Set([ordenIdInicial]));
          } else {
            setOrdenesConRetencion(new Set());
          }
        } else {
          // Si la orden inicial no está en las facturables, no seleccionar nada
          setOrdenesSeleccionadas(new Set());
          setOrdenesConRetencion(new Set());
        }
      } else {
        // Si no hay orden inicial, no seleccionar nada
        setOrdenesSeleccionadas(new Set());
        setOrdenesConRetencion(new Set());
      }
    } catch (err) {
      console.error("Error cargando órdenes facturables:", err);
      setError('Error cargando órdenes facturables del cliente');
      setOrdenesFacturables([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };
  
  // Re-ejecutar preselección cuando ordenInicialCompleta cambie (se carga después de las órdenes)
  useEffect(() => {
    if (isOpen && ordenInicialCompleta && ordenesFacturables.length > 0) {
      const ordenIdInicial = ordenInicialCompleta.id;
      const ordenEncontrada = ordenesFacturables.find(o => o.id === ordenIdInicial);
      console.log("🔍 [useEffect ordenInicialCompleta] ordenIdInicial:", ordenIdInicial, "ordenEncontrada:", ordenEncontrada ? "SÍ" : "NO");
      
      if (ordenEncontrada) {
        console.log("✅ Preseleccionando orden inicial desde useEffect:", ordenIdInicial);
        // Preseleccionar la orden inicial
        setOrdenesSeleccionadas(new Set([ordenIdInicial]));
        // Actualizar retefuente basado en ordenInicialCompleta
        const tieneRetencion = Boolean(ordenInicialCompleta.tieneRetencionFuente);
        console.log("🔍 [useEffect ordenInicialCompleta] tieneRetencion:", tieneRetencion);
        
        if (tieneRetencion) {
          console.log("✅ Marcando orden con retefuente:", ordenIdInicial);
          setOrdenesConRetencion(new Set([ordenIdInicial]));
        } else {
          setOrdenesConRetencion(new Set());
        }
      }
    }
  }, [isOpen, ordenInicialCompleta, ordenesFacturables]);

  const toggleOrdenSeleccionada = (ordenId) => {
    const nuevasSeleccionadas = new Set(ordenesSeleccionadas);
    if (nuevasSeleccionadas.has(ordenId)) {
      nuevasSeleccionadas.delete(ordenId);
      // También quitar de retefuente si estaba marcada
      const nuevasConRetencion = new Set(ordenesConRetencion);
      nuevasConRetencion.delete(ordenId);
      setOrdenesConRetencion(nuevasConRetencion);
    } else {
      nuevasSeleccionadas.add(ordenId);
    }
    setOrdenesSeleccionadas(nuevasSeleccionadas);
  };

  const toggleRetencionOrden = (ordenId) => {
    // Buscar la orden para verificar si supera el umbral
    const orden = ordenesFacturables.find(o => o.id === ordenId);
    if (!orden) return;
    
    // Si no supera el umbral, no permitir marcar
    if (!ordenSuperaUmbral(orden)) {
      return;
    }
    
    const nuevasConRetencion = new Set(ordenesConRetencion);
    if (nuevasConRetencion.has(ordenId)) {
      nuevasConRetencion.delete(ordenId);
    } else {
      nuevasConRetencion.add(ordenId);
    }
    setOrdenesConRetencion(nuevasConRetencion);
  };

  const toggleSeleccionarTodas = () => {
    if (ordenesSeleccionadas.size === ordenesFacturables.length) {
      setOrdenesSeleccionadas(new Set());
      setOrdenesConRetencion(new Set());
    } else {
      setOrdenesSeleccionadas(new Set(ordenesFacturables.map(o => o.id)));
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      formaPago: 'EFECTIVO',
      observaciones: ''
    });
    setClienteSearchModal("");
    setShowClienteModal(false);
    setShowClienteFacturaModal(false);
    setError('');
    // NO limpiar clienteSeleccionado, clienteFactura, clienteSearch aquí
    // porque se setean en el useEffect principal
  };

  // Limpiar todo cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Solo limpiar cuando se cierra, no cuando se abre
      setClienteSeleccionado(null);
      setClienteFactura(null);
      setClienteSearch("");
      setOrdenesFacturables([]);
      setOrdenesSeleccionadas(new Set());
      setOrdenesConRetencion(new Set());
      setOrdenInicialCompleta(null);
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = (type === 'text' && name !== 'fecha') ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  // Verificar si una orden supera el umbral de retefuente
  const ordenSuperaUmbral = (orden) => {
    const subtotal = orden.subtotal || orden.items?.reduce((sum, item) => sum + (item.totalLinea || 0), 0) || 0;
    const descuentos = Number(orden.descuentos || 0);
    const base = Math.max(0, subtotal - descuentos);
    
    // Calcular IVA
    const ivaVal = (ivaRate && ivaRate > 0) 
      ? (base * ivaRate) / (100 + ivaRate) 
      : 0;
    
    const subtotalSinIva = base - ivaVal;
    
    return subtotalSinIva >= retefuenteThreshold;
  };

  // Calcular totales para cada orden seleccionada
  const calcularTotalesOrden = (orden) => {
    const subtotal = orden.subtotal || orden.items?.reduce((sum, item) => sum + (item.totalLinea || 0), 0) || 0;
    const descuentos = Number(orden.descuentos || 0);
    const base = Math.max(0, subtotal - descuentos);
    
    // Calcular IVA
    const ivaVal = (ivaRate && ivaRate > 0) 
      ? (base * ivaRate) / (100 + ivaRate) 
      : 0;
    
    const subtotalSinIva = base - ivaVal;
    
    // Calcular retención (solo para contabilidad, NO afecta el total)
    const tieneRetencion = ordenesConRetencion.has(orden.id);
    const debeAplicarRetencion = tieneRetencion && subtotalSinIva >= retefuenteThreshold;
    const reteVal = debeAplicarRetencion 
      ? (subtotalSinIva * retefuenteRate) / 100 
      : 0;
    
    // El total NO se reduce por la retefuente, es solo un dato contable
    const total = base;
    
    return {
      subtotal,
      descuentos,
      base,
      ivaVal,
      subtotalSinIva,
      reteVal,
      total
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clienteSeleccionado) {
      setError('Debes seleccionar un cliente.');
      return;
    }

    if (ordenesSeleccionadas.size === 0) {
      setError('Debes seleccionar al menos una orden para facturar.');
      return;
    }

    if (!clienteFactura) {
      setError('Debes seleccionar un cliente para la facturación.');
      return;
    }

    try {
      setLoading(true);
      
      // Obtener las órdenes completas antes de facturar
      const ordenesCompletas = await Promise.all(
        Array.from(ordenesSeleccionadas).map(ordenId => 
          api.get(`/ordenes/${ordenId}`).then(res => res.data)
        )
      );

      // Actualizar tieneRetencionFuente en las órdenes que lo necesiten
      for (const orden of ordenesCompletas) {
        const tieneRetencion = ordenesConRetencion.has(orden.id);
        if (orden.venta && orden.tieneRetencionFuente !== tieneRetencion) {
          try {
            const ordenUpdatePayload = {
              fecha: orden.fecha,
              obra: orden.obra || "",
              descripcion: orden.descripcion || null,
              venta: orden.venta,
              credito: orden.credito,
              incluidaEntrega: orden.incluidaEntrega || false,
              tieneRetencionFuente: tieneRetencion,
              descuentos: Number(orden.descuentos || 0),
              clienteId: Number(orden.clienteId || orden.cliente?.id),
              sedeId: Number(orden.sedeId || orden.sede?.id),
              ...(orden.trabajadorId || orden.trabajador?.id ? { trabajadorId: Number(orden.trabajadorId || orden.trabajador?.id) } : {}),
              items: (Array.isArray(orden.items) ? orden.items : []).map(item => ({
                id: item.id ?? null,
                productoId: Number(item.productoId || item.producto?.id),
                descripcion: item.descripcion ?? "",
                cantidad: Number(item.cantidad ?? 1),
                precioUnitario: Number(item.precioUnitario ?? 0),
                totalLinea: Number(item.totalLinea ?? 0),
                ...(item.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: Number(item.reutilizarCorteSolicitadoId) } : {})
              }))
            };
            
            if (orden.venta) {
              await api.put(`/ordenes/venta/${orden.id}`, ordenUpdatePayload);
            } else {
              await api.put(`/ordenes/tabla/${orden.id}`, ordenUpdatePayload);
            }
          } catch (updateError) {
            console.warn(`⚠️ No se pudo actualizar tieneRetencionFuente en la orden ${orden.id}:`, updateError);
          }
        }
      }

      // Crear facturas para cada orden seleccionada
      const facturasCreadas = [];
      for (const orden of ordenesCompletas) {
        const totales = calcularTotalesOrden(orden);
        
        // Calcular el porcentaje de retefuente a enviar (solo si se aplicó la retención)
        // Si reteVal > 0, significa que se aplicó la retefuente (verificó umbral)
        // Si reteVal === 0, no se aplica (no superó el umbral o no está marcado)
        const porcentajeRetencionFuente = totales.reteVal > 0 ? retefuenteRate : 0;
        
        const facturaPayload = {
          ordenId: orden.id,
          fecha: formData.fecha,
          subtotal: totales.subtotal,
          descuentos: totales.descuentos,
          iva: ivaRate,
          retencionFuente: porcentajeRetencionFuente, // Usa el valor calculado que verifica el umbral
          formaPago: formData.formaPago,
          observaciones: formData.observaciones || `Factura generada desde orden #${orden.numero}`,
          clienteId: clienteFactura.id
        };

        try {
          const facturaResponse = await api.post('/facturas', facturaPayload);
          
          // Marcar como pagada automáticamente
          try {
            if (facturaResponse.data?.id) {
              await api.put(`/facturas/${facturaResponse.data.id}/pagar`, { 
                fechaPago: formData.fecha 
              });
            }
          } catch (pagoErr) {
            console.warn(`⚠️ No se pudo marcar como pagada la factura ${facturaResponse.data?.id}:`, pagoErr);
          }
          
          // Marcar orden como facturada
          try {
            await api.put(`/ordenes/${orden.id}/facturar`, { facturada: true });
          } catch (factErr) {
            console.warn(`⚠️ No se pudo marcar como facturada la orden ${orden.id}:`, factErr);
          }
          
          facturasCreadas.push({
            ordenNumero: orden.numero,
            facturaNumero: facturaResponse.data?.numeroFactura || facturaResponse.data?.numero || 'N/A'
          });
        } catch (factErr) {
          // Si la factura ya existe, continuar con la siguiente
          if (factErr.response?.status === 400 && /ya tiene una factura/i.test(String(factErr.response?.data?.message || ''))) {
            console.warn(`⚠️ La orden ${orden.numero} ya tiene factura`);
            continue;
          }
          throw factErr;
        }
      }

      if (facturasCreadas.length > 0) {
        showSuccess(`Se crearon ${facturasCreadas.length} factura(s) exitosamente.`);
      }
      
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al crear las facturas';
      console.error("Error al facturar órdenes:", errorMessage);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes para el modal de búsqueda
  const clientesFiltrados = clienteSearchModal.trim()
    ? clientes.filter((c) =>
        [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(clienteSearchModal.trim().toLowerCase()))
      )
    : clientes;

  const clientesFiltradosOrdenados = [...clientesFiltrados].sort((a, b) => {
    const nombreA = (a.nombre || "").toLowerCase();
    const nombreB = (b.nombre || "").toLowerCase();
    return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide" style={{ maxWidth: '95vw', width: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid #e0e0e0' }}>
          <h2 style={{ margin: 0, color: '#1e2753' }}>FACTURAR MÚLTIPLES ÓRDENES</h2>
          <button className="close-btn" onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            ✕
          </button>
        </div>

        {error && (
          <div className="modal-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Selección de Cliente */}
          {!clienteSeleccionado && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Seleccionar Cliente *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={clienteSearch}
                  readOnly
                  onClick={() => setShowClienteModal(true)}
                  placeholder="Haz clic para buscar cliente..."
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '0.0625rem solid #c2c2c3',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    backgroundColor: '#fff'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowClienteModal(true)}
                  className="btn-guardar"
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                >
                  Buscar Cliente
                </button>
              </div>
            </div>
          )}

          {/* Información del Cliente y Cliente de Facturación */}
          {clienteSeleccionado && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cliente de las Órdenes:</label>
                  <input
                    type="text"
                    value={clienteSeleccionado.nombre || ''}
                    disabled
                    style={{ width: '100%', padding: '0.5rem', backgroundColor: '#e9ecef' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cliente para Facturación:</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={clienteFactura?.nombre || ''}
                      readOnly
                      onClick={() => setShowClienteFacturaModal(true)}
                      placeholder="Haz clic para cambiar..."
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '0.0625rem solid #c2c2c3',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        backgroundColor: '#fff'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowClienteFacturaModal(true)}
                      className="btn-guardar"
                      style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fecha y Forma de Pago */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Fecha de Facturación:</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Forma de Pago:</label>
              <select
                name="formaPago"
                value={formData.formaPago}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem' }}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>
          </div>

          {/* Tabla de Órdenes */}
          {loadingOrdenes ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando órdenes...</div>
          ) : ordenesFacturables.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              {clienteSeleccionado 
                ? 'Este cliente no tiene órdenes facturables (todas están facturadas, anuladas o tienen saldo pendiente).'
                : 'Selecciona un cliente para ver sus órdenes facturables.'}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={toggleSeleccionarTodas}
                  className="btn-guardar"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  {ordenesSeleccionadas.size === ordenesFacturables.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                </button>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                  {ordenesSeleccionadas.size} de {ordenesFacturables.length} seleccionadas
                </span>
              </div>
              
              <div className="facturar-multiples-table-wrapper">
                <table className="facturar-multiples-table">
                  <thead>
                    <tr>
                      <th>Sel.</th>
                      <th>Ret.</th>
                      <th>Orden</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Subtotal</th>
                      <th>Descuentos</th>
                      <th>Retefuente</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFacturables.map((orden) => {
                      const estaSeleccionada = ordenesSeleccionadas.has(orden.id);
                      const tieneRetencion = ordenesConRetencion.has(orden.id);
                      const superaUmbral = ordenSuperaUmbral(orden);
                      const totales = estaSeleccionada ? calcularTotalesOrden(orden) : null;
                      
                      return (
                        <tr
                          key={orden.id}
                          className={estaSeleccionada ? 'selected' : ''}
                          onClick={() => toggleOrdenSeleccionada(orden.id)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={estaSeleccionada}
                              onChange={() => toggleOrdenSeleccionada(orden.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td>
                            {estaSeleccionada && (
                              <input
                                type="checkbox"
                                checked={tieneRetencion}
                                onChange={() => toggleRetencionOrden(orden.id)}
                                onClick={(e) => e.stopPropagation()}
                                disabled={!superaUmbral}
                                title={
                                  superaUmbral 
                                    ? "Marcar si esta orden tiene retención en la fuente" 
                                    : `Esta orden no supera el umbral de retefuente (${retefuenteThreshold.toLocaleString('es-CO')})`
                                }
                                style={{
                                  cursor: superaUmbral ? 'pointer' : 'not-allowed',
                                  opacity: superaUmbral ? 1 : 0.5
                                }}
                              />
                            )}
                          </td>
                          <td style={{ fontWeight: '500' }}>
                            #{orden.numero}
                          </td>
                          <td>
                            {orden.fecha ? new Date(orden.fecha).toLocaleDateString('es-CO') : '-'}
                          </td>
                          <td title={orden.cliente?.nombre || '-'}>
                            {orden.cliente?.nombre || '-'}
                          </td>
                          <td>
                            ${(orden.subtotal || 0).toLocaleString('es-CO')}
                          </td>
                          <td style={{ color: orden.descuentos > 0 ? '#dc3545' : '#666' }}>
                            {orden.descuentos > 0 ? `-${orden.descuentos.toLocaleString('es-CO')}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: totales?.reteVal > 0 ? '#1e2753' : '#666', fontWeight: totales?.reteVal > 0 ? '500' : 'normal' }}>
                            {totales && totales.reteVal > 0 
                              ? `-$${totales.reteVal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'
                            }
                          </td>
                          <td>
                            {totales ? `$${totales.total.toLocaleString('es-CO')}` : `$${(orden.total || 0).toLocaleString('es-CO')}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Observaciones:</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="3"
              style={{ width: '100%', padding: '0.5rem', resize: 'vertical' }}
              placeholder="Observaciones adicionales para las facturas..."
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-cancelar"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading || ordenesSeleccionadas.size === 0 || !clienteFactura}
            >
              {loading ? 'Facturando...' : `Facturar ${ordenesSeleccionadas.size} Orden(es)`}
            </button>
          </div>
        </form>

        {/* Modal de selección de cliente (para órdenes) */}
        {showClienteModal && (
          <div className="modal-overlay" style={{ zIndex: 100001 }}>
            <div className="modal-container" style={{ maxWidth: '900px', width: '95vw', maxHeight: '85vh' }}>
              <header className="modal-header">
                <h2>Seleccionar Cliente</h2>
                <button className="close-btn" onClick={() => {
                  setClienteSearchModal("");
                  setShowClienteModal(false);
                }}>✕</button>
              </header>
              <div style={{ padding: '1.2rem' }}>
                <input
                  type="text"
                  value={clienteSearchModal}
                  onChange={(e) => setClienteSearchModal(e.target.value)}
                  placeholder="Buscar cliente..."
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                  autoFocus
                />
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {clientesFiltradosOrdenados.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No se encontraron clientes</div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>NIT</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesFiltradosOrdenados.map((c) => (
                          <tr key={c.id}>
                            <td>{c.nombre || '-'}</td>
                            <td>{c.nit || '-'}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteSeleccionado(c);
                                  setClienteFactura(c);
                                  setClienteSearch(c.nombre || '');
                                  setClienteSearchModal("");
                                  setShowClienteModal(false);
                                }}
                                className="btn-guardar"
                                style={{ padding: '0.5rem 1rem' }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de selección de cliente (para facturación) */}
        {showClienteFacturaModal && (
          <div className="modal-overlay" style={{ zIndex: 100001 }}>
            <div className="modal-container" style={{ maxWidth: '900px', width: '95vw', maxHeight: '85vh' }}>
              <header className="modal-header">
                <h2>Seleccionar Cliente para Facturación</h2>
                <button className="close-btn" onClick={() => {
                  setClienteSearchModal("");
                  setShowClienteFacturaModal(false);
                }}>✕</button>
              </header>
              <div style={{ padding: '1.2rem' }}>
                <input
                  type="text"
                  value={clienteSearchModal}
                  onChange={(e) => setClienteSearchModal(e.target.value)}
                  placeholder="Buscar cliente..."
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                  autoFocus
                />
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {clientesFiltradosOrdenados.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No se encontraron clientes</div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>NIT</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesFiltradosOrdenados.map((c) => (
                          <tr key={c.id}>
                            <td>{c.nombre || '-'}</td>
                            <td>{c.nit || '-'}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteFactura(c);
                                  setClienteSearchModal("");
                                  setShowClienteFacturaModal(false);
                                }}
                                className="btn-guardar"
                                style={{ padding: '0.5rem 1rem' }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturarMultiplesOrdenesModal;

