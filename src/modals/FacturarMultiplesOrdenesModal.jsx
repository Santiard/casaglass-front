import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { listarClientes } from '../services/ClientesService.js';
import { listarOrdenesTabla, obtenerOrden, obtenerOrdenDetalle } from '../services/OrdenesService.js';
import { getBusinessSettings } from '../services/businessSettingsService.js';
import { useToast } from '../context/ToastContext.jsx';
import { getTodayLocalDate } from '../lib/dateUtils.js';
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
    fecha: getTodayLocalDate(),
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
      console.log(" [useEffect principal] Modal abierto, ordenInicial:", ordenInicial);
      
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
          console.log(" Clientes cargados:", clientesArray.length);
          
          // Si viene una orden inicial, obtener la orden completa
          if (ordenInicial?.id) {
            console.log(" [cargarDatos] Hay ordenInicial con ID:", ordenInicial.id);
            try {
              // Intentar primero con obtenerOrdenDetalle (más ligero y confiable)
              let ordenCompleta;
              try {
                ordenCompleta = await obtenerOrdenDetalle(ordenInicial.id);
                console.log(" Orden completa obtenida (detalle):", ordenCompleta);
              } catch (detalleErr) {
                console.warn(" No se pudo obtener detalle, intentando obtenerOrden completo:", detalleErr);
                // Fallback: usar obtenerOrden completo
                ordenCompleta = await obtenerOrden(ordenInicial.id);
                console.log(" Orden completa obtenida (completo):", ordenCompleta);
              }
              setOrdenInicialCompleta(ordenCompleta); // IMPORTANTE: Guardar la orden completa
              
              // Usar la orden completa (tiene todos los datos del cliente)
              if (ordenCompleta?.cliente) {
                // Buscar el cliente completo en la lista cargada
                const clienteCompleto = clientesArray.find(c => c.id === ordenCompleta.cliente.id) || ordenCompleta.cliente;
                console.log(" Cliente seteado automáticamente:", clienteCompleto);
                setClienteSeleccionado(clienteCompleto);
                setClienteFactura(clienteCompleto);
                setClienteSearch(clienteCompleto.nombre || '');
              } else if (ordenInicial?.cliente) {
                // Fallback: usar el cliente de la orden inicial
                const clienteCompleto = clientesArray.find(c => c.id === ordenInicial.cliente.id) || ordenInicial.cliente;
                console.log(" Usando cliente de ordenInicial (fallback):", clienteCompleto);
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
      console.log(" [useEffect clienteSeleccionado] Cargando órdenes facturables para cliente:", clienteSeleccionado.id, clienteSeleccionado.nombre);
      cargarOrdenesFacturables(clienteSeleccionado.id);
    } else if (isOpen && !clienteSeleccionado) {
      // Si se abre sin cliente, limpiar órdenes
      console.log(" [useEffect clienteSeleccionado] No hay cliente seleccionado, limpiando órdenes");
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

      // Inicializar el set de órdenes con retención en base a lo que viene del backend
      const nuevasOrdenesConRetencion = new Set(
        ordenesFacturablesFiltradas
          .filter(o => Boolean(o.tieneRetencionFuente))
          .map(o => o.id)
      );
      
      // Si hay una orden inicial, preseleccionarla
      // Usar ordenInicialCompleta si está disponible, sino ordenInicial
      const ordenIdInicial = ordenInicialCompleta?.id || ordenInicial?.id;
      if (ordenIdInicial) {
        const ordenInicialEncontrada = ordenesFacturablesFiltradas.find(o => o.id === ordenIdInicial);
        if (ordenInicialEncontrada) {
          // Preseleccionar la orden inicial
          setOrdenesSeleccionadas(new Set([ordenIdInicial]));

          // Asegurar que la orden inicial refleje correctamente su estado de retención
          const tieneRetencion = Boolean(
            ordenInicialCompleta?.tieneRetencionFuente || 
            ordenInicialEncontrada.tieneRetencionFuente || 
            ordenInicial?.tieneRetencionFuente
          );

          if (tieneRetencion) {
            nuevasOrdenesConRetencion.add(ordenIdInicial);
          } else {
            nuevasOrdenesConRetencion.delete(ordenIdInicial);
          }
        } else {
          // Si la orden inicial no está en las facturables, no seleccionar nada
          setOrdenesSeleccionadas(new Set());
        }
      } else {
        // Si no hay orden inicial, no seleccionar nada
        setOrdenesSeleccionadas(new Set());
      }

      setOrdenesConRetencion(nuevasOrdenesConRetencion);
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
      console.log(" [useEffect ordenInicialCompleta] ordenIdInicial:", ordenIdInicial, "ordenEncontrada:", ordenEncontrada ? "SÍ" : "NO");
      
      if (ordenEncontrada) {
        console.log(" Preseleccionando orden inicial desde useEffect:", ordenIdInicial);
        // Preseleccionar la orden inicial
        setOrdenesSeleccionadas(new Set([ordenIdInicial]));
        // Actualizar retefuente basado en ordenInicialCompleta
        const tieneRetencion = Boolean(ordenInicialCompleta.tieneRetencionFuente);
        console.log(" [useEffect ordenInicialCompleta] tieneRetencion:", tieneRetencion);
        
        if (tieneRetencion) {
          console.log(" Marcando orden con retefuente:", ordenIdInicial);
          setOrdenesConRetencion(new Set([ordenIdInicial]));
        } else {
          setOrdenesConRetencion(new Set());
        }
      }
    }
  }, [isOpen, ordenInicialCompleta, ordenesFacturables]);

  const toggleOrdenSeleccionada = (ordenId) => {
    const nuevasSeleccionadas = new Set(ordenesSeleccionadas);
    const nuevasConRetencion = new Set(ordenesConRetencion);

    if (nuevasSeleccionadas.has(ordenId)) {
      nuevasSeleccionadas.delete(ordenId);
      // También quitar de retefuente si estaba marcada
      nuevasConRetencion.delete(ordenId);
    } else {
      nuevasSeleccionadas.add(ordenId);
      // Si la orden tiene retefuente=true en el backend, marcar automáticamente al seleccionarla
      const orden = ordenesFacturables.find(o => o.id === ordenId);
      if (orden?.tieneRetencionFuente) {
        nuevasConRetencion.add(ordenId);
      }
    }
    setOrdenesSeleccionadas(nuevasSeleccionadas);
    setOrdenesConRetencion(nuevasConRetencion);
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
      const todasIds = ordenesFacturables.map(o => o.id);
      setOrdenesSeleccionadas(new Set(todasIds));

      // Marcar retefuente automáticamente para todas las que la tengan en el backend
      const idsConRetencion = ordenesFacturables
        .filter(o => Boolean(o.tieneRetencionFuente))
        .map(o => o.id);
      setOrdenesConRetencion(new Set(idsConRetencion));
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: getTodayLocalDate(),
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
  // Usar la misma fórmula que calcularTotalesOrden para garantizar consistencia
  const ordenSuperaUmbral = (orden) => {
    // ✅ IMPORTANTE: orden.total es el total facturado CON IVA, orden.subtotal es base SIN IVA
    // Usamos orden.total como base facturada (con IVA incluido)
    const subtotalFacturado = orden.total || orden.items?.reduce((sum, item) => sum + (item.totalLinea || 0), 0) || 0;
    const descuentos = Number(orden.descuentos || 0);
    const baseConIva = Math.max(0, subtotalFacturado - descuentos);
    
    // Calcular subtotal sin IVA usando la fórmula EXACTA: dividir por (1 + IVA)
    const ivaRateDecimal = (ivaRate && ivaRate > 0) ? ivaRate / 100 : 0;
    const divisorIva = 1 + ivaRateDecimal; // 1.19 para IVA del 19%
    const subtotalSinIva = baseConIva / divisorIva;
    
    return subtotalSinIva >= retefuenteThreshold;
  };

  // Calcular totales para cada orden seleccionada
  // IMPORTANTE: Usar EXACTAMENTE la misma fórmula que el backend para garantizar precisión contable
  const calcularTotalesOrden = (orden) => {
    // ✅ IMPORTANTE: orden.total es el total facturado CON IVA, orden.subtotal es base SIN IVA
    // Usamos orden.total como base facturada (con IVA incluido)
    const subtotalFacturado = orden.total || orden.items?.reduce((sum, item) => sum + (item.totalLinea || 0), 0) || 0;
    const descuentos = Number(orden.descuentos || 0);
    
    // Base con IVA = subtotal facturado - descuentos
    const baseConIva = Math.max(0, subtotalFacturado - descuentos);
    
    // Calcular subtotal sin IVA usando la fórmula EXACTA del backend: dividir por (1 + IVA)
    // Ejemplo: si IVA es 19%, dividir por 1.19
    const ivaRateDecimal = (ivaRate && ivaRate > 0) ? ivaRate / 100 : 0;
    const divisorIva = 1 + ivaRateDecimal; // 1.19 para IVA del 19%
    const subtotalSinIva = baseConIva / divisorIva;
    const subtotalSinIvaRedondeado = Math.round(subtotalSinIva * 100) / 100; // Redondear a 2 decimales
    
    // Calcular IVA como diferencia (igual que el backend)
    const ivaVal = baseConIva - subtotalSinIvaRedondeado;
    const ivaValRedondeado = Math.round(ivaVal * 100) / 100; // Redondear a 2 decimales
    
    // Calcular retención usando la fórmula EXACTA del backend
    const tieneRetencion = ordenesConRetencion.has(orden.id);
    const debeAplicarRetencion = tieneRetencion && subtotalSinIvaRedondeado >= (retefuenteThreshold || 0);
    
    // Validar que retefuenteRate esté disponible y sea válido
    const rateValido = retefuenteRate && retefuenteRate > 0 && retefuenteRate <= 100;
    const retefuenteRateDecimal = (rateValido && retefuenteRate) ? retefuenteRate / 100 : 0;
    
    // Retención = subtotal sin IVA × porcentaje de retefuente (igual que el backend)
    const reteVal = (debeAplicarRetencion && rateValido)
      ? subtotalSinIvaRedondeado * retefuenteRateDecimal
      : 0;
    const reteValRedondeado = Math.round(reteVal * 100) / 100; // Redondear a 2 decimales
    
    // Total facturado = base con IVA (NO se resta la retención del total)
    const total = baseConIva;
    
    return {
      subtotal: subtotalSinIvaRedondeado, // Base SIN IVA CALCULADA (no usar orden.subtotal que puede estar incorrecto)
      descuentos,
      base: baseConIva,
      ivaVal: ivaValRedondeado,
      subtotalSinIva: subtotalSinIvaRedondeado,
      reteVal: reteValRedondeado,
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
            
            // Verificar si el detalle tiene sedeId, si no, obtener del endpoint completo
            const tieneSedeIdEnDetalle = ordenDetalle.sedeId || ordenDetalle.sede?.id;
            
            let ordenCompleta = ordenDetalle;
            
            // Si no tiene sedeId en el detalle, obtener del endpoint completo
            if (!tieneSedeIdEnDetalle) {
              console.log(` [FacturarMultiples] Orden ${ordenId} no tiene sedeId en detalle, obteniendo del endpoint completo...`);
              try {
                const res = await api.get(`/ordenes/${ordenId}`);
                ordenCompleta = res.data;
                console.log(` [FacturarMultiples] Orden ${ordenId} obtenida del endpoint completo, sedeId:`, ordenCompleta.sedeId || ordenCompleta.sede?.id);
              } catch (fullErr) {
                console.warn(` [FacturarMultiples] No se pudo obtener orden completa para ${ordenId}, usando detalle:`, fullErr);
                // Continuar con ordenDetalle aunque no tenga sedeId
              }
            }
            
            // Combinar datos: usar orden completa como base y complementar con datos de ordenesFacturables
            // IMPORTANTE: Obtener sedeId de todas las fuentes posibles
            const sedeIdCombinado = ordenCompleta.sedeId || ordenCompleta.sede?.id || 
                                   (ordenEnLista ? (ordenEnLista.sedeId || ordenEnLista.sede?.id) : null);
            
            return {
              ...ordenCompleta,
              // Campos adicionales de ordenesFacturables (si existen)
              ...(ordenEnLista ? {
                venta: ordenEnLista.venta,
                credito: ordenEnLista.credito,
                estado: ordenEnLista.estado,
                facturada: ordenEnLista.facturada,
                numeroFactura: ordenEnLista.numeroFactura,
                factura: ordenEnLista.factura,
                incluidaEntrega: ordenEnLista.incluidaEntrega,
                sedeId: sedeIdCombinado || ordenCompleta.sedeId || ordenCompleta.sede?.id, // Priorizar combinado, luego ordenCompleta
                trabajadorId: ordenCompleta.trabajadorId || ordenCompleta.trabajador?.id || 
                             ordenEnLista.trabajadorId || ordenEnLista.trabajador?.id,
                creditoDetalle: ordenEnLista.creditoDetalle,
                // Asegurar que clienteId esté disponible
                clienteId: ordenCompleta.cliente?.id || ordenCompleta.clienteId || 
                          ordenEnLista?.clienteId || ordenEnLista?.cliente?.id
              } : {
                // Si no hay ordenEnLista, asegurar que sedeId esté disponible desde ordenCompleta
                sedeId: sedeIdCombinado || ordenCompleta.sedeId || ordenCompleta.sede?.id
              })
            };
          } catch (detalleErr) {
            console.warn(` No se pudo obtener detalle de orden ${ordenId}, intentando endpoint completo:`, detalleErr);
            // Fallback: usar el endpoint completo solo si /detalle falla
            try {
              const res = await api.get(`/ordenes/${ordenId}`);
              return res.data;
            } catch (fullErr) {
              // Si ambos fallan, usar la orden de la lista (tiene menos datos pero es mejor que nada)
              if (ordenEnLista) {
                console.warn(` Usando orden de la lista para ${ordenId} (sin items completos)`);
                return ordenEnLista;
              }
              throw new Error(`No se pudo obtener la orden ${ordenId}`);
            }
          }
        })
      );

      // Actualizar IVA, tieneRetencionFuente y retencionFuente en las órdenes que lo necesiten
      console.log(` [FacturarMultiples] Iniciando actualización de órdenes. Total: ${ordenesCompletas.length}`);
      console.log(` [FacturarMultiples] Órdenes con retención marcada:`, Array.from(ordenesConRetencion));
      
      for (const orden of ordenesCompletas) {
        const tieneRetencion = ordenesConRetencion.has(orden.id);
        console.log(` [FacturarMultiples] Procesando orden ${orden.numero} (ID: ${orden.id}):`, {
          tieneRetencion,
          ordenTieneRetencionFuente: orden.tieneRetencionFuente,
          ordenRetencionFuente: orden.retencionFuente,
          ordenVenta: orden.venta
        });
        
        // Calcular totales para verificar si necesitamos actualizar
        const totales = calcularTotalesOrden(orden);
        
        // Normalizar tieneRetencionFuente de la orden (puede ser undefined, null, false)
        const ordenTieneRetencionFuente = Boolean(orden.tieneRetencionFuente);
        
        // Verificar si la orden necesita actualización:
        // 1. Si no tiene IVA calculado (o es 0) pero debería tenerlo
        // 2. Si tieneRetencionFuente cambió (comparar booleanos normalizados)
        // 3. Si tiene retención marcada pero no tiene el valor calculado
        const necesitaActualizarIva = (!orden.iva || orden.iva === 0) && totales.ivaVal > 0;
        const necesitaActualizarRetencion = ordenTieneRetencionFuente !== tieneRetencion;
        const necesitaActualizarValorRetencion = tieneRetencion && (!orden.retencionFuente || orden.retencionFuente === 0) && totales.reteVal > 0;
        
        // CRÍTICO: Si se marcó retención (tieneRetencion = true), SIEMPRE actualizar
        // incluso si la orden no tenía el campo inicialmente
        const debeActualizarPorRetencion = tieneRetencion && (necesitaActualizarRetencion || necesitaActualizarValorRetencion);
        
        // IMPORTANTE: Actualizar SIEMPRE si hay cambios, no solo si orden.venta es true
        // Las órdenes facturables siempre son ventas, pero verificamos por seguridad
        if (orden.venta && (necesitaActualizarIva || debeActualizarPorRetencion)) {
          // Validar que tengamos sedeId antes de intentar actualizar
          // Intentar obtener sedeId de múltiples fuentes posibles
          const sedeId = Number(
            orden.sedeId || 
            orden.sede?.id || 
            (orden.sede && typeof orden.sede === 'object' && orden.sede.id) ||
            null
          );
          
          if (!sedeId || sedeId === 0 || isNaN(sedeId)) {
            // Log detallado de todas las propiedades de la orden para debug
            console.error(` [FacturarMultiples] ERROR: Orden ${orden.numero} (ID: ${orden.id}) no tiene sedeId válido.`, {
              orden: {
                id: orden.id,
                numero: orden.numero,
                sedeId: orden.sedeId,
                sede: orden.sede,
                venta: orden.venta,
                // Mostrar todas las propiedades de la orden para debug
                todasLasPropiedades: Object.keys(orden),
                sedeId_directo: orden.sedeId,
                sedeId_de_sede: orden.sede?.id,
                sede_completo: orden.sede
              },
              necesitaActualizarIva,
              debeActualizarPorRetencion,
              tieneRetencion,
              // Mostrar también qué valores se intentaron obtener
              intentosSedeId: {
                'orden.sedeId': orden.sedeId,
                'orden.sede?.id': orden.sede?.id,
                'orden.sede && orden.sede.id': (orden.sede && orden.sede.id)
              }
            });
            // NO continuar con la actualización, pero permitir que se cree la factura
            // El backend debería poder manejar esto, pero es mejor tener el sedeId
            console.warn(` [FacturarMultiples] La orden ${orden.numero} no tiene sede asignada. La factura se creará pero la orden no se actualizará con los valores de retención.`);
            // Continuar con la facturación aunque no se pueda actualizar la orden
            // El backend calculará los valores correctamente al crear la factura
            continue;
          }
          
          console.log(` [FacturarMultiples] Orden ${orden.numero} tiene sedeId válido: ${sedeId}`);
          
          try {
            const valorRetencionFuente = tieneRetencion ? totales.reteVal : 0;
            
            const ordenUpdatePayload = {
              fecha: orden.fecha,
              obra: orden.obra || "",
              descripcion: orden.descripcion || null,
              venta: orden.venta,
              credito: orden.credito,
              incluidaEntrega: orden.incluidaEntrega || false,
              tieneRetencionFuente: tieneRetencion,
              retencionFuente: valorRetencionFuente, // Enviar el valor calculado con la fórmula exacta
              iva: totales.ivaVal, // Actualizar IVA si no estaba calculado
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
            
            console.log(` [FacturarMultiples] Actualizando orden ${orden.numero} con:`, {
              tieneRetencionFuente: tieneRetencion,
              retencionFuente: valorRetencionFuente,
              iva: totales.ivaVal,
              subtotal: totales.subtotal,
              ordenTieneRetencionFuenteAntes: orden.tieneRetencionFuente,
              ordenRetencionFuenteAntes: orden.retencionFuente,
              necesitaActualizarRetencion,
              necesitaActualizarValorRetencion
            });
            
            const endpoint = orden.venta ? `/ordenes/venta/${orden.id}` : `/ordenes/tabla/${orden.id}`;
            console.log(` [FacturarMultiples] Enviando PUT a ${endpoint} con payload:`, ordenUpdatePayload);
            
            const response = await api.put(endpoint, ordenUpdatePayload);
            console.log(` [FacturarMultiples] Orden ${orden.numero} actualizada exitosamente:`, response.data);
            
            // Actualizar el objeto orden local con los nuevos valores para que el backend los use al crear la factura
            orden.iva = totales.ivaVal;
            orden.retencionFuente = valorRetencionFuente;
            orden.tieneRetencionFuente = tieneRetencion;
            orden.subtotal = totales.subtotal;
          } catch (updateError) {
            console.error(` [FacturarMultiples] ERROR al actualizar la orden ${orden.id}:`, {
              error: updateError,
              response: updateError?.response?.data,
              status: updateError?.response?.status,
              payload: ordenUpdatePayload
            });
            // Continuar con la facturación aunque falle la actualización de la orden
            // El backend debería calcular los valores correctamente al crear la factura
          }
        } else {
          // Log para debug: por qué no se está actualizando
          console.log(` [FacturarMultiples] Orden ${orden.numero} NO necesita actualización:`, {
            venta: orden.venta,
            tieneRetencion,
            ordenTieneRetencionFuente: orden.tieneRetencionFuente,
            ordenRetencionFuente: orden.retencionFuente,
            necesitaActualizarIva,
            necesitaActualizarRetencion,
            necesitaActualizarValorRetencion
          });
        }
      }

      // Crear facturas para cada orden seleccionada
      const facturasCreadas = [];
      const ordenesConError = [];
      
      for (const orden of ordenesCompletas) {
        // Validar que la orden tenga todos los datos necesarios
        if (!orden || !orden.id) {
          console.error(` Orden inválida (sin ID):`, orden);
          ordenesConError.push({ orden: orden?.numero || 'N/A', error: 'Orden sin ID válido' });
          continue;
        }
        
        // Verificar nuevamente que la orden no esté ya facturada (doble verificación)
        if (orden.facturada || orden.numeroFactura || orden.factura) {
          console.warn(` La orden ${orden.numero} ya está facturada, saltando...`);
          continue;
        }
        
        // Validar que el cliente de factura tenga ID
        if (!clienteFactura || !clienteFactura.id) {
          console.error(` Cliente de factura inválido:`, clienteFactura);
          ordenesConError.push({ orden: orden.numero, error: 'Cliente de factura inválido' });
          continue;
        }
        
        // Usar calcularTotalesOrden que ya tiene la fórmula EXACTA del backend
        const totales = calcularTotalesOrden(orden);
        
        // Los valores ya están calculados correctamente en calcularTotalesOrden
        // usando la misma fórmula que el backend (dividir por 1.19 para obtener subtotal sin IVA)
        const tieneRetencion = ordenesConRetencion.has(orden.id);
        
        // Validar que retefuenteRate esté disponible y sea válido antes de usarlo
        const rateValido = retefuenteRate && retefuenteRate > 0 && retefuenteRate <= 100;
        
        // Usar los valores ya calculados por calcularTotalesOrden (que usa la fórmula exacta del backend)
        const valorIvaRedondeado = totales.ivaVal;
        const valorRetencionRedondeado = tieneRetencion ? totales.reteVal : 0;
        
        // Log de depuración usando los valores ya calculados en totales
        console.log(`[FacturarMultiples] Orden ${orden.numero} - Impuestos:`, {
          tieneRetencion,
          subtotalFacturado: totales.subtotal,
          baseConIva: totales.base,
          subtotalSinIva: totales.subtotalSinIva,
          valorIva: valorIvaRedondeado,
          valorRetencionFuente: valorRetencionRedondeado,
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
          console.error(` Payload inválido para orden ${orden.numero}:`, facturaPayload);
          ordenesConError.push({ orden: orden.numero, error: 'Payload inválido (faltan campos requeridos)' });
          continue;
        }
        
        // Validar que retencionFuente no sea negativo o inválido
        if (facturaPayload.retencionFuente < 0 || isNaN(facturaPayload.retencionFuente)) {
          console.error(` retencionFuente inválido para orden ${orden.numero}:`, facturaPayload.retencionFuente);
          facturaPayload.retencionFuente = 0;
        }
        
        // Log del payload para debugging
        console.log(` [FacturarMultiples] Enviando factura para orden ${orden.numero}:`, facturaPayload);

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
            console.warn(` No se pudo marcar como pagada la factura ${facturaResponse.data?.id}:`, pagoErr);
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
            console.error(` Error 500 al facturar orden ${orden.numero}:`, errorMsg);
            ordenesConError.push({ 
              orden: orden.numero, 
              error: `Error del servidor: ${errorMsg}` 
            });
            continue;
          }
          
          // Para otros errores, registrar y continuar
          console.error(` Error al facturar orden ${orden.numero}:`, factErr);
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
                      <th>IVA</th>
                      <th>Retefuente</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesFacturables.map((orden) => {
                      const estaSeleccionada = ordenesSeleccionadas.has(orden.id);
                      const tieneRetencion = ordenesConRetencion.has(orden.id);
                      const superaUmbral = ordenSuperaUmbral(orden);
                      
                      // Calcular valores en tiempo real si la orden está seleccionada y tiene retención marcada
                      // Esto permite ver el valor calculado cuando se marca manualmente la checkbox
                      const totalesCalculados = estaSeleccionada && tieneRetencion ? calcularTotalesOrden(orden) : null;
                      
                      // Usar valor calculado si la orden está seleccionada y tiene retención marcada,
                      // sino usar el valor del backend
                      const valorRetencion = totalesCalculados 
                        ? totalesCalculados.reteVal 
                        : (orden.retencionFuente || 0);
                      
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
                          <td style={{ textAlign: 'right', color: '#1e2753', fontWeight: '500' }}>
                            {typeof orden.iva === 'number'
                              ? `$${Number(orden.iva).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: valorRetencion > 0 ? '#1e2753' : '#666', fontWeight: valorRetencion > 0 ? '500' : 'normal' }}>
                            {valorRetencion > 0
                              ? `-$${Number(valorRetencion).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td>
                            {`$${Number(orden.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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

