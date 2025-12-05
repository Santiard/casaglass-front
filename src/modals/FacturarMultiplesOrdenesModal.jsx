import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { listarClientes } from '../services/ClientesService.js';
import { listarOrdenesTabla, obtenerOrden, obtenerOrdenDetalle } from '../services/OrdenesService.js';
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
              // Intentar primero con obtenerOrdenDetalle (más ligero y confiable)
              let ordenCompleta;
              try {
                ordenCompleta = await obtenerOrdenDetalle(ordenInicial.id);
                console.log("✅ Orden completa obtenida (detalle):", ordenCompleta);
              } catch (detalleErr) {
                console.warn("⚠️ No se pudo obtener detalle, intentando obtenerOrden completo:", detalleErr);
                // Fallback: usar obtenerOrden completo
                ordenCompleta = await obtenerOrden(ordenInicial.id);
                console.log("✅ Orden completa obtenida (completo):", ordenCompleta);
              }
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
    
    // Calcular IVA: monto * porcentaje (ej: 19% = 0.19)
    const ivaRateDecimal = (ivaRate && ivaRate > 0) ? ivaRate / 100 : 0;
    const ivaVal = base * ivaRateDecimal;
    
    const subtotalSinIva = base - ivaVal;
    
    // Calcular retención
    const tieneRetencion = ordenesConRetencion.has(orden.id);
    const debeAplicarRetencion = tieneRetencion && subtotalSinIva >= (retefuenteThreshold || 0);
    
    // Validar que retefuenteRate esté disponible y sea válido
    const rateValido = retefuenteRate && retefuenteRate > 0 && retefuenteRate <= 100;
    const retefuenteRateDecimal = (rateValido && retefuenteRate) ? retefuenteRate / 100 : 0;
    const reteVal = (debeAplicarRetencion && rateValido)
      ? subtotalSinIva * retefuenteRateDecimal
      : 0;
    
    // Total final de la factura: base (con IVA incluido) - retención (según contabilidad)
    // El total a pagar debe mostrarse con la retención ya restada
    const total = base - reteVal;
    
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
      // Estrategia: Usar /detalle para obtener estructura completa (cliente, items)
      // y combinar con datos de ordenesFacturables (venta, credito, estado, facturada, etc.)
      const ordenesCompletas = await Promise.all(
        Array.from(ordenesSeleccionadas).map(async (ordenId) => {
          // Buscar la orden en ordenesFacturables (tiene campos como venta, credito, estado, facturada)
          const ordenEnLista = ordenesFacturables.find(o => o.id === ordenId);
          
          try {
            // Intentar primero con el endpoint de detalle (más ligero y sin relaciones circulares)
            const ordenDetalle = await obtenerOrdenDetalle(ordenId);
            
            // Combinar datos: usar detalle como base y complementar con datos de ordenesFacturables
            return {
              ...ordenDetalle,
              // Campos adicionales de ordenesFacturables (si existen)
              ...(ordenEnLista ? {
                venta: ordenEnLista.venta,
                credito: ordenEnLista.credito,
                estado: ordenEnLista.estado,
                facturada: ordenEnLista.facturada,
                numeroFactura: ordenEnLista.numeroFactura,
                factura: ordenEnLista.factura,
                incluidaEntrega: ordenEnLista.incluidaEntrega,
                sedeId: ordenEnLista.sedeId || ordenEnLista.sede?.id,
                trabajadorId: ordenEnLista.trabajadorId || ordenEnLista.trabajador?.id,
                creditoDetalle: ordenEnLista.creditoDetalle,
                // Asegurar que clienteId esté disponible
                clienteId: ordenDetalle.cliente?.id || ordenEnLista?.clienteId || ordenEnLista?.cliente?.id
              } : {})
            };
          } catch (detalleErr) {
            console.warn(`⚠️ No se pudo obtener detalle de orden ${ordenId}, intentando endpoint completo:`, detalleErr);
            // Fallback: usar el endpoint completo solo si /detalle falla
            try {
              const res = await api.get(`/ordenes/${ordenId}`);
              return res.data;
            } catch (fullErr) {
              // Si ambos fallan, usar la orden de la lista (tiene menos datos pero es mejor que nada)
              if (ordenEnLista) {
                console.warn(`⚠️ Usando orden de la lista para ${ordenId} (sin items completos)`);
                return ordenEnLista;
              }
              throw new Error(`No se pudo obtener la orden ${ordenId}`);
            }
          }
        })
      );

      // Actualizar tieneRetencionFuente en las órdenes que lo necesiten
      for (const orden of ordenesCompletas) {
        const tieneRetencion = ordenesConRetencion.has(orden.id);
        if (orden.venta && orden.tieneRetencionFuente !== tieneRetencion) {
          // Validar que tengamos sedeId antes de intentar actualizar
          const sedeId = Number(orden.sedeId || orden.sede?.id);
          if (!sedeId) {
            console.warn(`⚠️ Orden ${orden.numero} no tiene sedeId, saltando actualización de tieneRetencionFuente`);
            continue;
          }
          
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
              sedeId: sedeId,
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
      const ordenesConError = [];
      
      for (const orden of ordenesCompletas) {
        // Validar que la orden tenga todos los datos necesarios
        if (!orden || !orden.id) {
          console.error(`❌ Orden inválida (sin ID):`, orden);
          ordenesConError.push({ orden: orden?.numero || 'N/A', error: 'Orden sin ID válido' });
          continue;
        }
        
        // Verificar nuevamente que la orden no esté ya facturada (doble verificación)
        if (orden.facturada || orden.numeroFactura || orden.factura) {
          console.warn(`⚠️ La orden ${orden.numero} ya está facturada, saltando...`);
          continue;
        }
        
        // Validar que el cliente de factura tenga ID
        if (!clienteFactura || !clienteFactura.id) {
          console.error(`❌ Cliente de factura inválido:`, clienteFactura);
          ordenesConError.push({ orden: orden.numero, error: 'Cliente de factura inválido' });
          continue;
        }
        
        const totales = calcularTotalesOrden(orden);
        
        // Calcular el valor monetario de retención (el backend espera el valor calculado, NO el porcentaje)
        // Base imponible = subtotal - descuentos
        const baseImponible = Number(totales.subtotal || 0) - Number(totales.descuentos || 0);
        const tieneRetencion = ordenesConRetencion.has(orden.id);
        
        // Validar que retefuenteRate esté disponible y sea válido antes de usarlo
        const rateValido = retefuenteRate && retefuenteRate > 0 && retefuenteRate <= 100;
        
        // Calcular IVA: monto * porcentaje (ej: 19% = 0.19, 1.25% = 0.0125)
        const porcentajeIva = Number(ivaRate || 0);
        const porcentajeIvaDecimal = porcentajeIva / 100; // Convertir 19 a 0.19
        const valorIva = (porcentajeIva && porcentajeIva > 0)
          ? baseImponible * porcentajeIvaDecimal
          : 0;
        const valorIvaRedondeado = Math.round(valorIva * 100) / 100; // Redondear a 2 decimales
        
        // Calcular subtotal sin IVA (base imponible para retención)
        const subtotalSinIva = baseImponible - valorIvaRedondeado;
        
        // Calcular retención como valor monetario sobre el subtotal sin IVA
        const porcentajeRetencion = (tieneRetencion && totales.reteVal > 0 && rateValido) 
          ? Number(retefuenteRate) 
          : 0;
        const porcentajeRetencionDecimal = porcentajeRetencion / 100; // Convertir 1.25 a 0.0125
        const valorRetencionFuente = (tieneRetencion && porcentajeRetencion > 0)
          ? subtotalSinIva * porcentajeRetencionDecimal
          : 0;
        const valorRetencionRedondeado = Math.round(valorRetencionFuente * 100) / 100; // Redondear a 2 decimales
        
        // Log de depuración
        console.log(`[FacturarMultiples] Orden ${orden.numero} - Impuestos:`, {
          tieneRetencion,
          baseImponible,
          porcentajeIva,
          valorIva: valorIvaRedondeado,
          subtotalSinIva,
          porcentajeRetencion,
          valorRetencionFuente: valorRetencionRedondeado,
          totalCalculado: baseImponible - valorRetencionRedondeado,
          retefuenteRate,
          rateValido,
          retefuenteThreshold
        });
        
        // Validar que retefuenteRate esté definido si se necesita
        if (tieneRetencion && totales.reteVal > 0 && !rateValido) {
          console.error(`[FacturarMultiples] retefuenteRate no está definido o es inválido para orden ${orden.numero}:`, retefuenteRate);
          ordenesConError.push({ orden: orden.numero, error: `retefuenteRate inválido: ${retefuenteRate}` });
          continue;
        }
        
        const facturaPayload = {
          ordenId: Number(orden.id),
          fecha: formData.fecha,
          subtotal: Number(totales.subtotal || 0),
          descuentos: Number(totales.descuentos || 0),
          iva: valorIvaRedondeado, // Valor calculado en dinero, NO porcentaje
          retencionFuente: Math.max(0, valorRetencionRedondeado), // Valor calculado en dinero, NO porcentaje
          formaPago: formData.formaPago || 'EFECTIVO',
          observaciones: formData.observaciones || `Factura generada desde orden #${orden.numero}`,
          clienteId: Number(clienteFactura.id)
          // No enviar total: el backend lo calcula automáticamente
        };
        
        // Validar que todos los campos requeridos estén presentes
        if (!facturaPayload.ordenId || !facturaPayload.clienteId || !facturaPayload.fecha) {
          console.error(`❌ Payload inválido para orden ${orden.numero}:`, facturaPayload);
          ordenesConError.push({ orden: orden.numero, error: 'Payload inválido (faltan campos requeridos)' });
          continue;
        }
        
        // Validar que retencionFuente no sea negativo o inválido
        if (facturaPayload.retencionFuente < 0 || isNaN(facturaPayload.retencionFuente)) {
          console.error(`❌ retencionFuente inválido para orden ${orden.numero}:`, facturaPayload.retencionFuente);
          facturaPayload.retencionFuente = 0;
        }
        
        // Log del payload para debugging
        console.log(`📤 [FacturarMultiples] Enviando factura para orden ${orden.numero}:`, facturaPayload);

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
          
          // NOTA: El backend automáticamente marca la orden como facturada al crear la factura
          // No es necesario hacer una llamada adicional para marcarla como facturada
          
          facturasCreadas.push({
            ordenNumero: orden.numero,
            facturaNumero: facturaResponse.data?.numeroFactura || facturaResponse.data?.numero || 'N/A'
          });
        } catch (factErr) {
          // Si la factura ya existe (400), obtener la factura existente y continuar
          if (factErr.response?.status === 400) {
            const errorMsg = String(factErr.response?.data?.error || factErr.response?.data?.message || '');
            if (/ya tiene una factura/i.test(errorMsg)) {
              // La orden ya tiene factura, intentar marcar como pagada la factura existente
              try {
                const facturaId = factErr.response?.data?.facturaId;
                if (facturaId) {
                  await api.put(`/facturas/${facturaId}/pagar`, { 
                    fechaPago: formData.fecha 
                  });
                }
              } catch (pagoErr) {
                // Silenciar error si no se puede marcar como pagada (no es crítico)
              }
              // No agregar a errores, simplemente continuar
              continue;
            }
          }
          
          // Si es un error 500, registrar pero continuar con las demás
          if (factErr.response?.status === 500) {
            const errorMsg = String(factErr.response?.data?.error || factErr.response?.data?.message || '');
            console.error(`❌ Error 500 al facturar orden ${orden.numero}:`, errorMsg);
            ordenesConError.push({ 
              orden: orden.numero, 
              error: `Error del servidor: ${errorMsg}` 
            });
            continue;
          }
          
          // Para otros errores, registrar y continuar
          console.error(`❌ Error al facturar orden ${orden.numero}:`, factErr);
          ordenesConError.push({ 
            orden: orden.numero, 
            error: factErr.response?.data?.error || factErr.response?.data?.message || 'Error desconocido' 
          });
        }
      }

      // Mostrar resultados
      if (facturasCreadas.length > 0) {
        let mensaje = `Se crearon ${facturasCreadas.length} factura(s) exitosamente.`;
        if (ordenesConError.length > 0) {
          mensaje += ` ${ordenesConError.length} orden(es) tuvieron errores.`;
        }
        showSuccess(mensaje);
      } else if (ordenesConError.length > 0) {
        showError(`No se pudo crear ninguna factura. ${ordenesConError.length} orden(es) tuvieron errores.`);
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

