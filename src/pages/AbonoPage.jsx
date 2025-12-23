import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { listarClientes } from '../services/ClientesService.js';
import { listarCreditosPendientes } from '../services/AbonosService.js';
import { actualizarRetencionFuente } from '../services/OrdenesService.js';
import { getBusinessSettings } from '../services/businessSettingsService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/CrudModal.css';
import '../styles/Creditos.css';

const AbonoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  
  // Obtener clienteId o creditoId de los query params si vienen de CreditosPage
  const searchParams = new URLSearchParams(location.search);
  const clienteIdParam = searchParams.get('clienteId');
  const creditoIdParam = searchParams.get('creditoId');

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [ordenesCredito, setOrdenesCredito] = useState([]);
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState(new Set());
  const [ordenesConRetencion, setOrdenesConRetencion] = useState(new Set()); // Órdenes a las que se aplica retención
  const [updatingRetencion, setUpdatingRetencion] = useState(new Set()); // Órdenes con actualización de retención en curso
  const [distribucion, setDistribucion] = useState([]);
  
  // Función para obtener la fecha local en formato YYYY-MM-DD
  const obtenerFechaLocal = () => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const [formData, setFormData] = useState({
    fecha: obtenerFechaLocal(),
    factura: ''
  });
  
  const [metodosPago, setMetodosPago] = useState([]);
  const [observacionesAdicionales, setObservacionesAdicionales] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [error, setError] = useState('');
  
  // Configuración de retención
  const [retefuenteRate, setRetefuenteRate] = useState(2.5);
  const [retefuenteThreshold, setRetefuenteThreshold] = useState(1000000);

  const bancos = [
    "BANCOLOMBIA",
    "DAVIVIENDA",
    "BANCO DE BOGOTA",
    "NEQUI",
    "DAVIPLATA"
  ];

  // Métodos de pago disponibles (RETEFUENTE se calcula automáticamente, no se agrega manualmente)
  const tiposMetodoPago = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "CHEQUE", label: "Cheque" }
  ];

  // Cargar configuración de retención al montar
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const settings = await getBusinessSettings();
        if (settings) {
          setRetefuenteRate(Number(settings.retefuenteRate) || 2.5);
          setRetefuenteThreshold(Number(settings.retefuenteThreshold) || 1000000);
        }
      } catch (err) {
        console.error("Error cargando configuración:", err);
      }
    };
    cargarConfiguracion();
  }, []);

  // Cargar clientes al montar
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const clientesData = await listarClientes();
        setClientes(clientesData);
        
        // Si viene un clienteId en los params, preseleccionarlo
        if (clienteIdParam) {
          const cliente = clientesData.find(c => c.id === Number(clienteIdParam));
          if (cliente) {
            setClienteSeleccionado(cliente);
            setClienteSearch(cliente.nombre);
          }
        }
      } catch (err) {
        console.error("Error cargando clientes:", err);
      }
    };
    cargarClientes();
  }, [clienteIdParam]);

  // Función para obtener el siguiente número de abono
  const obtenerSiguienteNumeroAbono = async () => {
    try {
      // Formato: ABO-YYYYMMDD-HHMMSS (año, mes, día, hora, minutos, segundos)
      // Esto garantiza un número único por segundo
      const hoy = new Date();
      const año = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      const hora = String(hoy.getHours()).padStart(2, '0');
      const minutos = String(hoy.getMinutes()).padStart(2, '0');
      const segundos = String(hoy.getSeconds()).padStart(2, '0');
      
      return `ABO-${año}${mes}${dia}-${hora}${minutos}${segundos}`;
    } catch (error) {
      console.error('Error obteniendo siguiente número de abono:', error);
      // Fallback: usar timestamp completo
      const hoy = new Date();
      const año = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      return `ABO-${año}${mes}${dia}-${Date.now().toString().slice(-6)}`;
    }
  };

  // Cargar órdenes a crédito del cliente seleccionado y generar número de abono
  useEffect(() => {
    if (clienteSeleccionado?.id) {
      cargarOrdenesCredito(clienteSeleccionado.id);
      // Generar número de abono automáticamente
      obtenerSiguienteNumeroAbono().then(numero => {
        setFormData(prev => ({ ...prev, factura: numero }));
      });
    } else {
      setOrdenesCredito([]);
      setOrdenesSeleccionadas(new Set());
      setDistribucion([]);
      // Limpiar número de abono cuando no hay cliente
      setFormData(prev => ({ ...prev, factura: '' }));
    }
  }, [clienteSeleccionado]);

  const cargarOrdenesCredito = async (clienteId) => {
    setLoadingOrdenes(true);
    try {
      // 🆕 USAR EL NUEVO ENDPOINT ESPECIALIZADO /creditos/cliente/{id}/pendientes
      const creditosPendientes = await listarCreditosPendientes(clienteId);
      
      // LOG COMPLETO: Ver TODOS los datos que trae el backend
      console.log('Créditos pendientes recibidos:', creditosPendientes.length);
      console.log('📦 DATOS COMPLETOS del backend:', JSON.stringify(creditosPendientes, null, 2));
      
      // Log específico de retención
      console.log('Créditos con tieneRetencionFuente:', 
        creditosPendientes.filter(c => c.tieneRetencionFuente)
          .map(c => ({ 
            ordenId: c.ordenId, 
            ordenNumero: c.ordenNumero,
            total: c.total,
            subtotal: c.subtotal,
            iva: c.iva,
            tieneRetencionFuente: c.tieneRetencionFuente, 
            retencionFuente: c.retencionFuente,
            saldoPendiente: c.saldoPendiente,
            totalCredito: c.totalCredito
          }))
      );
      
      // El backend YA filtra por saldo > 0 y estado ABIERTO
      // No necesitamos filtrar manualmente en frontend
      
      // Mapear de CreditoPendienteDTO a formato esperado por el componente
      const ordenesConSaldo = creditosPendientes.map(credito => ({
        // Datos de la orden
        id: credito.ordenId,
        numero: credito.ordenNumero,
        fecha: credito.ordenFecha,
        obra: credito.ordenObra,
        
        // Montos
        total: credito.total,
        subtotal: credito.subtotal,
        iva: credito.iva,
        descuentos: credito.descuentos,
        
        // Retención de fuente
        tieneRetencionFuente: credito.tieneRetencionFuente,
        retencionFuente: credito.retencionFuente,
        
        // Crédito (mantener compatibilidad)
        credito: true,
        venta: true,
        creditoDetalle: {
          id: credito.creditoId,
          creditoId: credito.creditoId, // Agregar creditoId también para compatibilidad
          saldoPendiente: credito.saldoPendiente,
          totalCredito: credito.totalCredito,
          totalAbonado: credito.totalAbonado,
          estado: credito.estado
        },
        
        // Sede
        sede: credito.sede,
        sedeId: credito.sede?.id,
        
        // Cliente
        cliente: credito.cliente,
        clienteId: credito.cliente?.id
      }));
      
      setOrdenesCredito(ordenesConSaldo);
      setOrdenesSeleccionadas(new Set());
      
      // Inicializar órdenes con retención basándose en tieneRetencionFuente del backend
      const ordenesConRetencionInicial = new Set();
      ordenesConSaldo.forEach(orden => {
        if (orden.tieneRetencionFuente === true) {
          ordenesConRetencionInicial.add(orden.id);
        }
      });
      setOrdenesConRetencion(ordenesConRetencionInicial);
      
      console.log(`Inicializadas ${ordenesConRetencionInicial.size} órdenes con retención`);
      
      setDistribucion([]);
    } catch (err) {
      console.error("Error cargando créditos pendientes:", err);
      setError('Error cargando créditos pendientes del cliente');
      setOrdenesCredito([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  // Calcular el total desde los métodos de pago (excluyendo RETEFUENTE manual, ya que se calcula automáticamente)
  const totalMetodosPago = metodosPago
    .filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0)
    .reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
  
  // Calcular total de retenciones automáticas
  const totalRetenciones = distribucion.reduce((sum, d) => sum + (d.montoRetencion || 0), 0);

  // Calcular distribución automática cuando cambia el total de métodos de pago, las órdenes seleccionadas o las órdenes con retención
  useEffect(() => {
    if (totalMetodosPago > 0 && ordenesSeleccionadas.size > 0) {
      calcularDistribucion();
    } else {
      setDistribucion([]);
    }
  }, [totalMetodosPago, ordenesSeleccionadas, ordenesConRetencion, ordenesCredito, metodosPago, retefuenteRate, retefuenteThreshold]);

  const calcularDistribucion = () => {
    if (totalMetodosPago <= 0) {
      setDistribucion([]);
      return;
    }
    
    // Separar métodos de pago normales de la retención
    const metodosNormales = metodosPago.filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0);
    const montoTotalSinRetencion = metodosNormales.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);

    const ordenesSeleccionadasArray = Array.from(ordenesSeleccionadas)
      .map(ordenId => ordenesCredito.find(o => o.id === ordenId))
      .filter(Boolean)
      .sort((a, b) => {
        const fechaA = new Date(a.fecha || 0);
        const fechaB = new Date(b.fecha || 0);
        return fechaA - fechaB;
      });

    const nuevaDistribucion = [];
    let montoDisponible = montoTotalSinRetencion;

    for (const orden of ordenesSeleccionadasArray) {
      const saldoPendiente = orden.creditoDetalle?.saldoPendiente || 0;
      
      let montoAbono = 0;
      let saldoRestante = saldoPendiente;
      
      if (montoDisponible > 0) {
        if (montoDisponible >= saldoPendiente) {
          montoAbono = saldoPendiente;
          saldoRestante = 0;
          montoDisponible -= saldoPendiente;
        } else {
          montoAbono = montoDisponible;
          saldoRestante = saldoPendiente - montoDisponible;
          montoDisponible = 0;
        }
      }
      
      // Calcular retención sobre el SUBTOTAL SIN IVA de la orden (no sobre el abono parcial)
      // Solo si la orden está marcada para retención Y el subtotal sin IVA >= umbral
      let montoRetencion = 0;
      const tieneRetencion = ordenesConRetencion.has(orden.id);
      const totalOrden = orden.total || 0;
      
      if (tieneRetencion && totalOrden > 0) {
        // Calcular subtotal sin IVA (el total incluye IVA, así que dividimos por 1.19)
        const subtotalSinIva = totalOrden / 1.19;
        
        // Verificar si el subtotal sin IVA supera el umbral
        if (subtotalSinIva >= retefuenteThreshold) {
          // Calcular retención sobre el subtotal sin IVA
          montoRetencion = subtotalSinIva * (retefuenteRate / 100);
          montoRetencion = Math.round(montoRetencion * 100) / 100; // Redondear a 2 decimales
        }
      }
      
      nuevaDistribucion.push({
        ordenId: orden.id,
        ordenNumero: orden.numero,
        ordenFecha: orden.fecha,
        saldoPendiente: saldoPendiente,
        montoAbono: montoAbono,
        saldoRestante: saldoRestante,
        montoRetencion: montoRetencion,
        tieneRetencion: tieneRetencion
      });
    }

    setDistribucion(nuevaDistribucion);
  };

  const toggleOrdenSeleccionada = (ordenId) => {
    const nuevasSeleccionadas = new Set(ordenesSeleccionadas);
    if (nuevasSeleccionadas.has(ordenId)) {
      nuevasSeleccionadas.delete(ordenId);
      // Si se deselecciona la orden, también quitar la retención
      const nuevasConRetencion = new Set(ordenesConRetencion);
      nuevasConRetencion.delete(ordenId);
      setOrdenesConRetencion(nuevasConRetencion);
    } else {
      nuevasSeleccionadas.add(ordenId);
      // Al seleccionar una orden, si tiene tieneRetencionFuente = true, marcarla automáticamente
      const orden = ordenesCredito.find(o => o.id === ordenId);
      if (orden && orden.tieneRetencionFuente === true) {
        const nuevasConRetencion = new Set(ordenesConRetencion);
        nuevasConRetencion.add(ordenId);
        setOrdenesConRetencion(nuevasConRetencion);
      }
    }
    setOrdenesSeleccionadas(nuevasSeleccionadas);
  };

  const toggleSeleccionarTodas = () => {
    if (ordenesSeleccionadas.size === ordenesCredito.length) {
      setOrdenesSeleccionadas(new Set());
    } else {
      setOrdenesSeleccionadas(new Set(ordenesCredito.map(o => o.id)));
    }
  };

  const toggleRetencionOrden = async (ordenId) => {
    // Prevenir llamadas duplicadas mientras hay una petición en curso
    if (updatingRetencion.has(ordenId)) {
      console.log('⏳ Ya hay una actualización en curso para esta orden');
      return;
    }

    const orden = ordenesCredito.find(o => o.id === ordenId);
    if (!orden) {
      console.error("No se encontró la orden para actualizar:", ordenId);
      return;
    }

    // Marcar como en actualización
    setUpdatingRetencion(prev => new Set(prev).add(ordenId));

    const nuevasConRetencion = new Set(ordenesConRetencion);
    const nuevoValorRetencion = !nuevasConRetencion.has(ordenId);
    
    if (nuevoValorRetencion) {
      nuevasConRetencion.add(ordenId);
    } else {
      nuevasConRetencion.delete(ordenId);
    }
    setOrdenesConRetencion(nuevasConRetencion);

    // Calcular retención y IVA si se está marcando como con retención
    let retencionFuenteCalculada = 0;
    let ivaCalculado = orden.iva || 0;
    const totalOrden = orden.total || 0;
    
    if (nuevoValorRetencion && totalOrden > 0) {
      // Calcular subtotal sin IVA (el total incluye IVA, así que dividimos por 1.19)
      const subtotalSinIva = totalOrden / 1.19;
      const subtotalSinIvaRedondeado = Math.round(subtotalSinIva * 100) / 100;
      
      // Calcular IVA si no está calculado
      if (!orden.iva || orden.iva === 0) {
        const ivaVal = totalOrden - subtotalSinIvaRedondeado;
        ivaCalculado = Math.round(ivaVal * 100) / 100;
      }
      
      // Verificar si el subtotal sin IVA supera el umbral
      if (subtotalSinIvaRedondeado >= retefuenteThreshold) {
        // Calcular retención sobre el subtotal sin IVA
        retencionFuenteCalculada = subtotalSinIvaRedondeado * (retefuenteRate / 100);
        retencionFuenteCalculada = Math.round(retencionFuenteCalculada * 100) / 100; // Redondear a 2 decimales
      } else {
        // Si no supera el umbral, no aplicar retención aunque se marque la checkbox
        showError(`La orden #${orden.numero} no supera el umbral mínimo de $${retefuenteThreshold.toLocaleString('es-CO')} para aplicar retención.`);
        // Revertir el cambio local
        const revertidasConRetencion = new Set(ordenesConRetencion);
        revertidasConRetencion.delete(ordenId);
        setOrdenesConRetencion(revertidasConRetencion);
        return;
      }
    }

    // 🆕 USAR EL NUEVO ENDPOINT ESPECIALIZADO
    try {
      console.log('Actualizando retención con nuevo endpoint:', {
        ordenId,
        tieneRetencionFuente: nuevoValorRetencion,
        retencionFuente: nuevoValorRetencion ? retencionFuenteCalculada : 0,
        iva: ivaCalculado
      });

      // Llamar al endpoint especializado /ordenes/{id}/retencion-fuente
      const response = await actualizarRetencionFuente(ordenId, {
        tieneRetencionFuente: nuevoValorRetencion,
        retencionFuente: nuevoValorRetencion ? retencionFuenteCalculada : 0,
        iva: ivaCalculado
      });
      
      console.log('✅ Respuesta del backend:', response);
      
      // El backend retorna { mensaje: "...", orden: {...} }
      const ordenActualizada = response.orden;
      
      // Actualizar solo esta orden en el estado local con los datos del backend
      setOrdenesCredito(prevOrdenes => 
        prevOrdenes.map(o => 
          o.id === ordenId 
            ? { 
                ...o, 
                // Actualizar campos de retención
                tieneRetencionFuente: ordenActualizada.tieneRetencionFuente,
                retencionFuente: ordenActualizada.retencionFuente,
                iva: ordenActualizada.iva,
                subtotal: ordenActualizada.subtotal,
                total: ordenActualizada.total,
                // ✅ CRÍTICO: PRESERVAR creditoDetalle pero ACTUALIZAR saldoPendiente
                creditoDetalle: o.creditoDetalle ? {
                  ...o.creditoDetalle,
                  // Recalcular saldoPendiente: si tiene retención, restarla del total a pagar
                  saldoPendiente: ordenActualizada.tieneRetencionFuente
                    ? (o.creditoDetalle.totalCredito || ordenActualizada.total) - (ordenActualizada.retencionFuente || 0) - (o.creditoDetalle.totalAbonado || 0)
                    : (o.creditoDetalle.totalCredito || ordenActualizada.total) - (o.creditoDetalle.totalAbonado || 0)
                } : o.creditoDetalle
              }
            : o
        )
      );
      
      // Mostrar mensaje de éxito del backend
      showSuccess(response.mensaje || 'Retención actualizada exitosamente');
      
    } catch (error) {
      console.error("❌ Error actualizando retención de fuente:", error);
      
      // Revertir el cambio local si falla la actualización
      const revertidasConRetencion = new Set(ordenesConRetencion);
      if (nuevoValorRetencion) {
        revertidasConRetencion.delete(ordenId);
      } else {
        revertidasConRetencion.add(ordenId);
      }
      setOrdenesConRetencion(revertidasConRetencion);
      
      // Manejo de errores específico
      if (error.response?.data?.tipo === 'VALIDACION') {
        showError(error.response.data.error);
      } else if (error.response?.data?.error) {
        showError(error.response.data.error);
      } else {
        showError(`No se pudo actualizar la retención de fuente en la orden #${orden.numero}. Intenta nuevamente.`);
      }
    } finally {
      // Siempre limpiar el estado de actualización en curso
      setUpdatingRetencion(prev => {
        const next = new Set(prev);
        next.delete(ordenId);
        return next;
      });
    }
  };

  const construirDescripcion = (metodos, observaciones, distribucionConRetencion) => {
    if (!metodos || metodos.length === 0) return observaciones || "";
    
    // Filtrar solo métodos normales (sin RETEFUENTE manual)
    const metodosNormales = metodos.filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0);
    
    const partes = metodosNormales.map(m => {
      if (m.tipo === "TRANSFERENCIA" && m.banco) {
        return `${m.tipo}: ${m.monto.toLocaleString('es-CO')} (${m.banco})`;
      }
      return `${m.tipo}: ${m.monto.toLocaleString('es-CO')}`;
    });
    
    // IMPORTANTE: Solo agregar retención cuando el abono COMPLETA el pago de la orden
    // La retención se calcula UNA VEZ sobre el total de la orden, no sobre cada abono parcial
    // Por lo tanto, solo se muestra cuando saldoRestante = 0 (orden completamente pagada)
    if (distribucionConRetencion && distribucionConRetencion.length > 0) {
      const retencionesPorOrden = distribucionConRetencion
        .filter(d => d.montoRetencion > 0 && d.saldoRestante === 0) // Solo cuando se completa el pago
        .map(d => `RETEFUENTE Orden #${d.ordenNumero}: ${d.montoRetencion.toLocaleString('es-CO')}`);
      
      if (retencionesPorOrden.length > 0) {
        partes.push(...retencionesPorOrden);
      }
    }
    
    let descripcionCompleta = partes.join(" | ");
    
    if (observaciones) {
      descripcionCompleta += `\n${observaciones}`;
    }
    
    return descripcionCompleta;
  };

  const agregarMetodoPago = () => {
    setMetodosPago([...metodosPago, { tipo: "", monto: 0, banco: "" }]);
  };

  const eliminarMetodoPago = (index) => {
    setMetodosPago(metodosPago.filter((_, i) => i !== index));
  };

  const actualizarMetodoPago = (index, campo, valor) => {
    const nuevosMetodos = [...metodosPago];
    nuevosMetodos[index] = { ...nuevosMetodos[index], [campo]: valor };
    
    if (campo === "tipo" && valor !== "TRANSFERENCIA") {
      nuevosMetodos[index].banco = "";
    }
    
    setMetodosPago(nuevosMetodos);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = (type === 'text' && name !== 'fecha') ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const montoTotal = totalMetodosPago;
    const hoy = obtenerFechaLocal();
    
    if (montoTotal <= 0) {
      setError('Debes agregar al menos un método de pago con monto mayor a 0.');
      return;
    }
    
    if (formData.fecha > hoy) {
      setError('La fecha no puede ser futura.');
      return;
    }
    
    if (!clienteSeleccionado) {
      setError('Debes seleccionar un cliente.');
      return;
    }
    
    if (ordenesSeleccionadas.size === 0) {
      setError('Debes seleccionar al menos una orden para abonar.');
      return;
    }
    
    const distribucionValida = distribucion.filter(d => d.montoAbono > 0);
    if (distribucionValida.length === 0) {
      setError('No hay órdenes con monto de abono válido. Verifica la distribución.');
      return;
    }
    
    if (metodosPago.length === 0) {
      setError('Debes agregar al menos un método de pago.');
      return;
    }

    // Filtrar solo métodos normales (sin RETEFUENTE manual)
    const metodosValidos = metodosPago.filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0);
    if (metodosValidos.length === 0) {
      setError('Debes completar al menos un método de pago con tipo y monto válidos.');
      return;
    }

    const transferenciasInvalidas = metodosPago.filter(
      m => m.tipo === "TRANSFERENCIA" && (!m.banco || m.monto <= 0)
    );
    if (transferenciasInvalidas.length > 0) {
      setError('Las transferencias deben tener banco y monto válidos.');
      return;
    }

    // Ya no necesitamos validar que coincidan porque el monto total se calcula desde los métodos

    // Validar que haya un número de abono
    let numeroAbono = formData.factura?.trim();
    if (!numeroAbono) {
      // Si no hay número, generarlo automáticamente
      numeroAbono = await obtenerSiguienteNumeroAbono();
      setFormData(prev => ({ ...prev, factura: numeroAbono }));
    }

    try {
      setLoading(true);
      
      // 🆕 CALCULAR MONTOS POR MÉTODO DE PAGO (campos numéricos)
      let montoEfectivoTotal = 0;
      let montoTransferenciaTotal = 0;
      let montoChequeTotal = 0;
      
      metodosValidos.forEach(metodo => {
        const monto = parseFloat(metodo.monto) || 0;
        if (metodo.tipo === "EFECTIVO") {
          montoEfectivoTotal += monto;
        } else if (metodo.tipo === "TRANSFERENCIA") {
          montoTransferenciaTotal += monto;
        } else if (metodo.tipo === "CHEQUE") {
          montoChequeTotal += monto;
        }
      });
      
      // Construir descripción para cada abono individualmente
      // IMPORTANTE: La retención solo se muestra cuando el abono completa el pago de la orden
      // porque la retención se calcula UNA VEZ sobre el total, no sobre cada abono parcial
      const abonosACrear = distribucionValida.map(dist => {
        const orden = ordenesCredito.find(o => o.id === dist.ordenId);
        const creditoId = orden?.creditoDetalle?.creditoId;
        
        if (!creditoId) {
          console.warn(`No se encontró creditoId para la orden ${dist.ordenId}`);
          return null;
        }
        
        // Construir descripción solo para este abono específico
        // Solo incluir retención si este abono completa el pago (saldoRestante = 0)
        const distribucionParaEsteAbono = dist.saldoRestante === 0 ? [dist] : [{ ...dist, montoRetencion: 0 }];
        const metodoPagoString = construirDescripcion(metodosValidos, observacionesAdicionales, distribucionParaEsteAbono);
        
        // 🆕 CALCULAR RETENCIÓN PROPORCIONAL
        let montoRetencionAbono = 0;
        if (orden.tieneRetencionFuente && dist.saldoRestante === 0) {
          // Si este abono completa la orden, incluir la retención total
          montoRetencionAbono = orden.retencionFuente || 0;
        }
        
        // 🆕 CALCULAR MONTOS PROPORCIONALES de cada método de pago
        const proporcion = dist.montoAbono / totalMetodosPago;
        const montoEfectivoAbono = montoEfectivoTotal * proporcion;
        const montoTransferenciaAbono = montoTransferenciaTotal * proporcion;
        const montoChequeAbono = montoChequeTotal * proporcion;
        
        return {
          creditoId: creditoId,
          total: dist.montoAbono,
          fecha: formData.fecha,
          metodoPago: metodoPagoString,
          factura: numeroAbono, // Siempre enviar un valor válido
          // 🆕 CAMPOS NUMÉRICOS
          montoEfectivo: Math.round(montoEfectivoAbono * 100) / 100,
          montoTransferencia: Math.round(montoTransferenciaAbono * 100) / 100,
          montoCheque: Math.round(montoChequeAbono * 100) / 100,
          montoRetencion: Math.round(montoRetencionAbono * 100) / 100
        };
      }).filter(abono => abono !== null && abono.creditoId);

      if (abonosACrear.length === 0) {
        setError('No se pudo determinar el crédito para alguna de las órdenes seleccionadas.');
        return;
      }

      // Crear todos los abonos
      await Promise.all(
        abonosACrear.map(abonoData => 
          api.post(`/creditos/${abonoData.creditoId}/abonos`, abonoData)
        )
      );
      
      // Redirigir a la página de créditos después de crear los abonos
      // Agregar parámetro para indicar que se deben recargar los datos
      navigate('/creditos?reload=true');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al crear los abonos';
      console.error("Error al registrar abonos:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalDistribuido = distribucion.reduce((sum, d) => sum + d.montoAbono, 0);
  const montoRestante = totalMetodosPago - totalDistribuido;

  // Calcular total deuda (suma de TODAS las órdenes del cliente con saldo pendiente, no solo las seleccionadas)
  const totalDeudaCliente = ordenesCredito.reduce((sum, orden) => {
    return sum + (orden.creditoDetalle?.saldoPendiente || 0);
  }, 0);

  // Calcular total deuda de las órdenes seleccionadas (para la distribución)
  const totalDeudaSeleccionadas = Array.from(ordenesSeleccionadas)
    .map(ordenId => ordenesCredito.find(o => o.id === ordenId))
    .filter(Boolean)
    .reduce((sum, orden) => sum + (orden.creditoDetalle?.saldoPendiente || 0), 0);

  // Calcular saldo después del abono (deuda total del cliente menos lo abonado)
  const saldoDespuesAbono = totalDeudaCliente - totalDistribuido;

  return (
    <div style={{ 
      padding: '0', 
      height: '100vh',
      overflowY: 'auto',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        width: '100%',
        backgroundColor: '#fff',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '100%'
      }}>
        {error && (
          <div className="modal-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Selección de Cliente con Búsqueda */}
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
                  placeholder="Haz clic para buscar cliente por nombre o NIT..."
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
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '0.5rem 1rem'
                  }}
                >
                  Buscar Cliente
                </button>
              </div>
            </div>
          )}

          {/* Información del Cliente - Formato Compacto */}
          {clienteSeleccionado && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '0.75rem 1rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              border: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ color: '#1e2753', fontSize: '0.9rem' }}>CLIENTE:</strong>
                  <span style={{ fontSize: '0.9rem' }}>{clienteSeleccionado.nombre || '-'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>|</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <strong>NIT:</strong> {clienteSeleccionado.nit || '-'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>|</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <strong>DIR:</strong> {clienteSeleccionado.direccion || '-'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>|</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <strong>TEL:</strong> {clienteSeleccionado.telefono || '-'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>|</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <strong>CIUDAD:</strong> {clienteSeleccionado.ciudad || '-'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClienteModal(true)}
                className="btn-guardar"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Cambiar Cliente
              </button>
            </div>
          )}

          {/* Layout de 3 Columnas: Métodos de Pago (Izq) | Tabla Órdenes (Centro) | Resumen (Der) */}
          {clienteSeleccionado && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '180px 1fr 280px', 
              gap: '1rem', 
              minHeight: '450px'
            }}>
              {/* COLUMNA IZQUIERDA: Botones de Métodos de Pago */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e2753' }}>Métodos de Pago</div>
                {tiposMetodoPago.map((tipo) => {
                  // Para TRANSFERENCIA, permitir múltiples (siempre habilitado)
                  // Para otros métodos, solo permitir uno de cada tipo
                  const esTransferencia = tipo.value === 'TRANSFERENCIA';
                  const existe = !esTransferencia ? metodosPago.find(m => m.tipo === tipo.value) : null;
                  const tieneTransferencias = esTransferencia ? metodosPago.filter(m => m.tipo === 'TRANSFERENCIA').length > 0 : false;
                  
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => {
                        if (esTransferencia || !existe) {
                          setMetodosPago([...metodosPago, { tipo: tipo.value, monto: 0, banco: "" }]);
                        }
                      }}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: (existe || (esTransferencia && tieneTransferencias)) ? '#1e2753' : '#fff',
                        border: '2px solid #1e2753',
                        borderRadius: '8px',
                        cursor: (esTransferencia || !existe) ? 'pointer' : 'default',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        color: (existe || (esTransferencia && tieneTransferencias)) ? '#fff' : '#1e2753',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        opacity: (existe || (esTransferencia && tieneTransferencias)) ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (esTransferencia || !existe) {
                          e.target.style.backgroundColor = '#1e2753';
                          e.target.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (esTransferencia || !existe) {
                          e.target.style.backgroundColor = '#fff';
                          e.target.style.color = '#1e2753';
                        }
                      }}
                      disabled={!esTransferencia && existe}
                    >
                      {tipo.label} {(existe || (esTransferencia && tieneTransferencias)) && '✓'}
                    </button>
                  );
                })}
                
                {/* Información de Retefuente */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  borderLeft: '4px solid #856404'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.75rem', 
                    color: '#856404',
                    fontSize: '0.9rem'
                  }}>
                    Retefuente
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#856404'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500' }}>Porcentaje:</span>
                      <strong style={{ fontSize: '1rem' }}>{retefuenteRate.toFixed(2)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500' }}>Umbral mínimo:</span>
                      <strong style={{ fontSize: '0.9rem' }}>${retefuenteThreshold.toLocaleString('es-CO')}</strong>
                    </div>
                    <div style={{ 
                      marginTop: '0.5rem', 
                      paddingTop: '0.5rem', 
                      borderTop: '1px solid #ffc107',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      color: '#856404'
                    }}>
                      Selecciona la orden para aplicar
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA CENTRAL: Tabla de Órdenes */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ fontWeight: '600', color: '#1e2753' }}>Órdenes a Crédito</div>
                  {ordenesCredito.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSeleccionarTodas}
                      className="btn-cancelar"
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      {ordenesSeleccionadas.size === ordenesCredito.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                    </button>
                  )}
                </div>

                {loadingOrdenes ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                    Cargando órdenes...
                  </div>
                ) : ordenesCredito.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    fontStyle: 'italic',
                    padding: '2rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    Este cliente no tiene órdenes a crédito (ventas confirmadas) con saldo pendiente.
                    <br />
                    <small style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem', display: 'block' }}>
                      Nota: Las cotizaciones no permiten abonos. Deben confirmarse como venta primero.
                    </small>
                  </div>
                ) : (
                  <div style={{ 
                    flex: 1,
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    height: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      overflowY: 'auto', 
                      overflowX: 'auto', 
                      flex: 1,
                      height: '100%'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '800px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#1e2753', color: '#fff' }}>
                        <tr>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>
                            <input
                              type="checkbox"
                              checked={ordenesSeleccionadas.size === ordenesCredito.length && ordenesCredito.length > 0}
                              onChange={toggleSeleccionarTodas}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              title="Seleccionar todas las órdenes"
                            />
                          </th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>FECHA</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ORDEN</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>FACTURA</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>VALOR</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SALDO</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>ABONO</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff', fontSize: '0.75rem' }}>RETENCIÓN</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>VALOR RETENCIÓN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenesCredito.map((orden) => {
                          const dist = distribucion.find(d => d.ordenId === orden.id);
                          const valorOrden = orden.total || 0;
                          const saldoPendiente = orden.creditoDetalle?.saldoPendiente || 0;
                          const montoAbono = dist?.montoAbono || 0;
                          const montoRetencion = dist?.montoRetencion || 0;
                          const estaSeleccionada = ordenesSeleccionadas.has(orden.id);
                          const totalOrden = orden.total || 0;
                          // Calcular subtotal sin IVA para verificar umbral
                          const subtotalSinIva = totalOrden > 0 ? totalOrden / 1.19 : 0;
                          const puedeAplicarRetencion = estaSeleccionada && totalOrden > 0 && subtotalSinIva >= retefuenteThreshold;
                          // El checkbox debe mostrar si la orden tiene retención
                          // Si está seleccionada, usar el estado de ordenesConRetencion (que se inicializa desde tieneRetencionFuente)
                          // Si no está seleccionada, mostrar directamente el valor de tieneRetencionFuente de la orden
                          const tieneRetencion = estaSeleccionada 
                            ? ordenesConRetencion.has(orden.id)
                            : (orden.tieneRetencionFuente === true);
                          
                          // 💰 MOSTRAR RETENCIÓN: Si la orden ya tiene retencionFuente del backend, mostrarlo
                          // Esto es independiente de si está seleccionada o no
                          const valorRetencionOrden = orden.retencionFuente || 0;
                          
                          return (
                            <tr
                              key={orden.id}
                              style={{
                                backgroundColor: estaSeleccionada ? '#e7f3ff' : (ordenesCredito.indexOf(orden) % 2 === 0 ? '#fff' : '#f9f9f9'),
                                cursor: 'pointer'
                              }}
                              onClick={() => toggleOrdenSeleccionada(orden.id)}
                            >
                              <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                <input
                                  type="checkbox"
                                  checked={estaSeleccionada}
                                  onChange={() => toggleOrdenSeleccionada(orden.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', borderRight: '1px solid #e0e0e0' }}>
                                {new Date(orden.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                {orden.numero}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                                {formData.factura || '-'}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #e0e0e0' }}>
                                ${valorOrden.toLocaleString('es-CO')}
                              </td>
                              <td style={{ 
                                padding: '0.5rem', 
                                textAlign: 'right', 
                                borderRight: '1px solid #e0e0e0',
                                color: saldoPendiente > 0 ? '#dc3545' : '#28a745',
                                fontWeight: '500'
                              }}>
                                ${saldoPendiente.toLocaleString('es-CO')}
                              </td>
                              <td style={{ 
                                padding: '0.5rem', 
                                textAlign: 'right',
                                borderRight: '1px solid #e0e0e0',
                                color: montoAbono > 0 ? '#28a745' : '#666',
                                fontWeight: montoAbono > 0 ? 'bold' : 'normal'
                              }}>
                                ${montoAbono.toLocaleString('es-CO')}
                              </td>
                              <td style={{ 
                                padding: '0.5rem', 
                                textAlign: 'center',
                                borderRight: '1px solid #e0e0e0'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={tieneRetencion}
                                  disabled={!puedeAplicarRetencion}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (puedeAplicarRetencion) {
                                      toggleRetencionOrden(orden.id);
                                    }
                                  }}
                                  style={{ 
                                    width: '18px', 
                                    height: '18px', 
                                    cursor: puedeAplicarRetencion ? 'pointer' : 'not-allowed',
                                    opacity: puedeAplicarRetencion ? 1 : 0.5
                                  }}
                                  title={puedeAplicarRetencion 
                                    ? "Aplicar retención a esta orden" 
                                    : `Para aplicar retención: la orden debe estar seleccionada y el total de la orden debe ser >= $${retefuenteThreshold.toLocaleString('es-CO')}`}
                                />
                              </td>
                              <td style={{ 
                                padding: '0.5rem', 
                                textAlign: 'right',
                                borderRight: '1px solid #e0e0e0',
                                color: valorRetencionOrden > 0 ? '#856404' : '#999',
                                fontWeight: valorRetencionOrden > 0 ? 'bold' : 'normal',
                                backgroundColor: valorRetencionOrden > 0 ? '#fff3cd' : 'transparent'
                              }}>
                                {valorRetencionOrden > 0 ? `$${valorRetencionOrden.toLocaleString('es-CO')}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', position: 'sticky', bottom: 0, zIndex: 3 }}>
                        <tr>
                          <td colSpan="4" style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            TOTAL DEUDA:
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            ${ordenesCredito.reduce((sum, orden) => sum + (orden.total || 0), 0).toLocaleString('es-CO')}
                          </td>
                          <td style={{ 
                            padding: '0.5rem', 
                            textAlign: 'right', 
                            borderTop: '2px solid #1e2753', 
                            color: saldoDespuesAbono > 0 ? '#dc3545' : '#28a745'
                          }}>
                            ${saldoDespuesAbono.toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#28a745' }}>
                            ${totalDistribuido.toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', borderTop: '2px solid #1e2753' }}>
                            -
                          </td>
                          <td style={{ 
                            padding: '0.5rem', 
                            textAlign: 'right', 
                            borderTop: '2px solid #1e2753',
                            color: totalRetenciones > 0 ? '#856404' : '#999',
                            backgroundColor: totalRetenciones > 0 ? '#fff3cd' : 'transparent'
                          }}>
                            {totalRetenciones > 0 ? `$${totalRetenciones.toLocaleString('es-CO')}` : '-'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    </div>
                  </div>
                )}

                {/* Resumen del Total Calculado */}
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: totalMetodosPago > 0 ? '#e7f3ff' : '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                    Total del Abono:
                  </label>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1e2753' }}>
                    ${totalMetodosPago.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* COLUMNA DERECHA: Tabla de Métodos de Pago y Resumen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Tabla de Métodos de Pago */}
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e2753' }}>Medios de Pago</div>
                  <div style={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#fff'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#1e2753', color: '#fff' }}>
                        <tr>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>MEDIO DE PAGO</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>VALOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metodosPago.filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0).length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                              Agregue métodos de pago
                            </td>
                          </tr>
                        ) : (
                          <>
                            {metodosPago.filter(m => m.tipo && m.tipo !== "RETEFUENTE" && m.monto > 0).map((metodo, index) => {
                              const tipoLabel = tiposMetodoPago.find(t => t.value === metodo.tipo)?.label || metodo.tipo;
                              const bancoInfo = metodo.tipo === "TRANSFERENCIA" && metodo.banco ? ` (${metodo.banco})` : '';
                              return (
                                <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                  <td style={{ padding: '0.5rem' }}>
                                    {tipoLabel}{bancoInfo}
                                  </td>
                                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>
                                    ${(metodo.monto || 0).toLocaleString('es-CO')}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Mostrar retenciones calculadas automáticamente */}
                            {distribucion.filter(d => d.montoRetencion > 0).length > 0 && (
                              <>
                                {distribucion.filter(d => d.montoRetencion > 0).map((dist, index) => (
                                  <tr key={`rete-${index}`} style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff3cd' }}>
                                    <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                                      Retefuente (Orden #{dist.ordenNumero})
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500', color: '#856404' }}>
                                      ${dist.montoRetencion.toLocaleString('es-CO')}
                                    </td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </tbody>
                      <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #1e2753' }}>
                        <tr>
                          <td style={{ padding: '0.5rem' }}>TOTAL PAGOS:</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#1e2753' }}>
                            ${totalMetodosPago.toLocaleString('es-CO')}
                          </td>
                        </tr>
                        {totalRetenciones > 0 && (
                          <tr style={{ backgroundColor: '#fff3cd' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#856404' }}>TOTAL RETENCIONES:</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#856404', fontWeight: 'bold' }}>
                              ${totalRetenciones.toLocaleString('es-CO')}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Resumen de Saldo */}
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#1e2753' }}>Resumen</div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total Deuda:</span>
                      <strong style={{ color: '#dc3545' }}>${totalDeudaCliente.toLocaleString('es-CO')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total Abonado:</span>
                      <strong style={{ color: '#28a745' }}>${totalDistribuido.toLocaleString('es-CO')}</strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      paddingTop: '0.5rem',
                      borderTop: '2px solid #1e2753',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ fontWeight: '600' }}>SALDO RESTANTE:</span>
                      <strong style={{ 
                        color: saldoDespuesAbono > 0 ? '#dc3545' : '#28a745',
                        fontSize: '1.1rem'
                      }}>
                        ${saldoDespuesAbono.toLocaleString('es-CO')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Lista de Métodos de Pago para Editar */}
                {metodosPago.length > 0 && (
                  <div style={{ 
                    padding: '0.75rem',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    maxHeight: '250px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#1e2753' }}>
                      Editar Métodos de Pago
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {metodosPago.map((metodo, index) => (
                        <div key={index} style={{ 
                          padding: '0.5rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          backgroundColor: '#fff'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ fontWeight: '500', color: '#1e2753', fontSize: '0.85rem' }}>
                              {tiposMetodoPago.find(t => t.value === metodo.tipo)?.label || metodo.tipo}
                            </div>
                            {metodo.tipo === "TRANSFERENCIA" && (
                              <select
                                value={metodo.banco}
                                onChange={(e) => actualizarMetodoPago(index, 'banco', e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', border: '1px solid #c2c2c3', borderRadius: '4px' }}
                              >
                                <option value="">Seleccione banco...</option>
                                {bancos.map((bancoItem) => (
                                  <option key={bancoItem} value={bancoItem}>{bancoItem}</option>
                                ))}
                              </select>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="number"
                                value={metodo.monto || ""}
                                onChange={(e) => {
                                  const valor = parseFloat(e.target.value) || 0;
                                  actualizarMetodoPago(index, 'monto', valor);
                                }}
                                placeholder={metodo.tipo === "RETEFUENTE" ? "Monto de retención" : "Monto"}
                                min="0"
                                step="0.01"
                                style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', border: '1px solid #c2c2c3', borderRadius: '4px' }}
                              />
                              <button
                                type="button"
                                onClick={() => eliminarMetodoPago(index)}
                                style={{
                                  padding: '0.4rem 0.6rem',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Eliminar método"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Campos adicionales y botones - Compacto */}
          {clienteSeleccionado && (
            <div style={{ 
              marginTop: '1rem', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e0e0e0'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  style={{ fontSize: '0.9rem', padding: '0.4rem', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Número de Abono
                </label>
                <input
                  type="text"
                  name="factura"
                  value={formData.factura}
                  onChange={handleChange}
                  placeholder="Se generará automáticamente"
                  maxLength={50}
                  style={{ fontSize: '0.9rem', padding: '0.4rem', width: '100%' }}
                  title="Se genera automáticamente, pero puedes editarlo si es necesario"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                  Observaciones Adicionales (Opcional)
                </label>
                <textarea
                  value={observacionesAdicionales}
                  onChange={(e) => setObservacionesAdicionales(e.target.value)}
                  placeholder="Agregar notas adicionales..."
                  rows="2"
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    fontSize: '0.9rem',
                    padding: '0.4rem'
                  }}
                />
              </div>
            </div>
          )}

          <div className="modal-buttons" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn-cancelar" onClick={() => navigate('/creditos')} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar" disabled={loading || !clienteSeleccionado}>
              {loading ? 'Guardando...' : 'REGISTRAR'}
            </button>
          </div>
        </form>

        {/* Modal de Búsqueda de Cliente */}
        {showClienteModal && (
          <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal-container" style={{ maxWidth: '900px', width: '90vw', maxHeight: '85vh' }}>
              <h2 style={{ marginBottom: '1rem' }}>Buscar Cliente</h2>
              
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                style={{
                  width: '100%',
                  marginBottom: '1rem'
                }}
                autoFocus
              />

              <div style={{
                maxHeight: '60vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                position: 'relative'
              }}>
                {(() => {
                  const searchTerm = clienteSearchModal.trim().toLowerCase();
                  const clientesFiltrados = searchTerm
                    ? clientes.filter(c => {
                        const nombre = (c.nombre || '').toLowerCase();
                        const nit = (c.nit || '').toLowerCase();
                        const correo = (c.correo || '').toLowerCase();
                        const ciudad = (c.ciudad || '').toLowerCase();
                        const direccion = (c.direccion || '').toLowerCase();
                        return nombre.includes(searchTerm) ||
                               nit.includes(searchTerm) ||
                               correo.includes(searchTerm) ||
                               ciudad.includes(searchTerm) ||
                               direccion.includes(searchTerm);
                      })
                    : clientes;

                  const sorted = [...clientesFiltrados].sort((a, b) => {
                    const nombreA = (a.nombre || '').toLowerCase();
                    const nombreB = (b.nombre || '').toLowerCase();
                    return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                  });

                  if (sorted.length === 0) {
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                        No se encontraron clientes
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>Nombre</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>NIT</th>
                          <th style={{ padding: '0.7575rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>Ciudad</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td title={c.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {c.nombre || '-'}
                            </td>
                            <td title={c.nit || '-'}>
                              {c.nit || '-'}
                            </td>
                            <td title={c.ciudad || '-'}>
                              {c.ciudad || '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setClienteSeleccionado(c);
                                  setClienteSearch(c.nombre);
                                  setClienteSearchModal("");
                                  setShowClienteModal(false);
                                }}
                                className="btn-guardar"
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  fontSize: '0.85rem'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setClienteSearchModal("");
                    setShowClienteModal(false);
                  }}
                  className="btn-cancelar"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AbonoPage;

