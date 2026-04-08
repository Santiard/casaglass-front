import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import ReembolsosVentaService from '../services/ReembolsosVentaService';
import './CrearEntregaModal.css';
import { useToast } from '../context/ToastContext.jsx';

const CrearEntregaModal = ({ isOpen, onClose, onSuccess, sedes, trabajadores, sedeIdUsuario, userId }) => {
  const { showWarning } = useToast();
  
  // Función para obtener la fecha local en formato YYYY-MM-DD
  const obtenerFechaLocal = () => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  
  const [formData, setFormData] = useState({
    sedeId: '',
    empleadoId: '',
    fechaEntrega: obtenerFechaLocal(), // Fecha única para la entrega (solo un día)
    modalidadEntrega: 'EFECTIVO',
    ordenesIds: [], // IDs de órdenes a contado (se seleccionan automáticamente)
    abonosIds: [], // IDs de abonos individuales (se seleccionan automáticamente)
    reembolsosIds: [], // IDs de reembolsos (egresos - se restan del total)
    montoEfectivo: '',
    montoTransferencia: '',
    montoCheque: '',
    montoDeposito: ''
  });

  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [abonosDisponibles, setAbonosDisponibles] = useState([]); // Abonos disponibles (NUEVO)
  const [reembolsosDisponibles, setReembolsosDisponibles] = useState([]); // Reembolsos del día (EGRESOS)
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Datos básicos, 2: Órdenes (gastos eliminados)
  const [reloadKey, setReloadKey] = useState(0); // Key para forzar recarga cuando se abre el modal

  const resetForm = () => {
    // Preseleccionar sede del usuario logueado si está disponible
    const sedeInicial = sedeIdUsuario ? String(sedeIdUsuario) : '';
    
    // Preseleccionar empleado (trabajador) del usuario logueado si está disponible
    // Buscar el trabajador que coincida con el ID del usuario
    const trabajadorEncontrado = userId && Array.isArray(trabajadores) 
      ? trabajadores.find(t => t.id === userId)
      : null;
    const empleadoInicial = trabajadorEncontrado ? String(trabajadorEncontrado.id) : '';
    
    setFormData({
      sedeId: sedeInicial,
      empleadoId: empleadoInicial,
      fechaEntrega: obtenerFechaLocal(),
      modalidadEntrega: 'EFECTIVO',
      ordenesIds: [],
      abonosIds: [],
      reembolsosIds: [],
      montoEfectivo: '',
      montoTransferencia: '',
      montoCheque: '',
      montoDeposito: ''
    });
    setOrdenesDisponibles([]);
    setAbonosDisponibles([]);
    setReembolsosDisponibles([]);
    setError('');
    setStep(1);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Limpiar órdenes y abonos cuando se abre el modal
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      setReembolsosDisponibles([]);
      // Incrementar reloadKey para forzar recarga cuando se abre el modal
      setReloadKey(prev => prev + 1);
    } else {
      // Limpiar todo cuando se cierra el modal
      resetForm();
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      setReembolsosDisponibles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Solo ejecutar cuando se abre/cierra el modal

  // Cargar pendientes cuando se selecciona sede.
  // El backend resuelve el rango automáticamente desde la última entrega.
  useEffect(() => {
    // Solo cargar si el modal está abierto y hay sede
    if (isOpen && formData.sedeId) {
      cargarOrdenesDisponibles();
    } else {
      // Limpiar órdenes si no hay datos completos o el modal está cerrado
      if (!isOpen) {
        setOrdenesDisponibles([]);
        setAbonosDisponibles([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.sedeId, reloadKey]); // Incluir reloadKey para forzar recarga

  const cargarOrdenesDisponibles = async () => {
    // Leer valores actuales del estado para evitar problemas de closure
    const sedeIdActual = formData.sedeId;
    const fechaActual = formData.fechaEntrega;
    
    // Validar que tengamos los datos necesarios
    if (!sedeIdActual || !fechaActual) {
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      setReembolsosDisponibles([]);
      return;
    }
    
    try {
      setLoadingOrdenes(true);
      // Fecha usada para filtrar reembolsos del listado visual.
      const fechaUnica = fechaActual;
      
      // Cargar órdenes, abonos y reembolsos en paralelo
      const [ordenes, reembolsos] = await Promise.all([
        EntregasService.obtenerOrdenesDisponibles(sedeIdActual),
        ReembolsosVentaService.listarReembolsos({
          fecha: fechaUnica,
          sedeId: sedeIdActual,
          procesado: true,
          estado: 'PROCESADO'
        })
      ]);
      
      // Extraer órdenes y abonos de la estructura de respuesta del backend
      let ordenesArray = [];
      let abonosArray = [];
      
      if (ordenes && typeof ordenes === 'object') {
        // Órdenes a contado - FILTRAR solo las que tienen venta: true (confirmadas/pagadas)
        const ordenesContado = Array.isArray(ordenes.ordenesContado) 
          ? ordenes.ordenesContado.filter(orden => orden.venta === true) 
          : [];
        ordenesArray = ordenesContado.map(orden => ({
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          total: orden.total,
          clienteNombre: orden.clienteNombre || 'Cliente no especificado',
          clienteNit: orden.clienteNit || null,
          obra: orden.obra || 'Obra no especificada',
          sedeNombre: orden.sedeNombre || null,
          trabajadorNombre: orden.trabajadorNombre || null,
          esContado: true,
          estado: orden.estado || 'ACTIVA',
          venta: orden.venta !== undefined ? orden.venta : true, // Asegurar que venta esté presente
          descripcion: orden.descripcion || '' // Incluir descripción para parsear método de pago
        }));
        
        // Abonos disponibles - Los abonos ya vienen filtrados del backend
        // El backend filtra por: orden ACTIVA, ventaOrden: true, no yaEntregado
        // NOTA: Ya NO se filtra por estado del crédito, así que abonos de créditos cerrados también aparecen
        const abonosDisponibles = Array.isArray(ordenes.abonosDisponibles) 
          ? ordenes.abonosDisponibles.filter(abono => !abono.yaEntregado) 
          : [];
        abonosArray = abonosDisponibles.map(abono => ({
          id: abono.id, // ID del abono (no de la orden)
          ordenId: abono.ordenId, // ID de la orden
          numeroOrden: abono.numeroOrden,
          fechaOrden: abono.fechaOrden, // Fecha de la orden
          fechaAbono: abono.fechaAbono, // Fecha del abono
          montoAbono: abono.montoAbono || 0, // Monto del abono individual
          montoOrden: abono.montoOrden || 0, // Monto total de la orden
          clienteNombre: abono.clienteNombre || 'Cliente no especificado',
          clienteNit: abono.clienteNit || null,
          metodoPago: abono.metodoPago || null, // Puede ser largo (hasta 3000 caracteres)
          factura: abono.factura || null, // Número de factura/recibo
          obra: abono.obra || null,
          sedeNombre: abono.sedeNombre || null,
          trabajadorNombre: abono.trabajadorNombre || null,
          yaEntregado: abono.yaEntregado || false,
          estadoOrden: abono.estadoOrden || 'ACTIVA',
          ventaOrden: abono.ventaOrden !== undefined ? abono.ventaOrden : true
        }));
      } else if (Array.isArray(ordenes)) {
        // Si por alguna razón viene como array directamente (fallback)
        // FILTRAR solo las que tienen venta: true
        ordenesArray = ordenes
          .filter(orden => orden.venta === true)
          .map(orden => ({
            id: orden.id,
            numero: orden.numero,
            fecha: orden.fecha,
            total: orden.total,
            clienteNombre: orden.clienteNombre || 'Cliente no especificado',
            clienteNit: orden.clienteNit || null,
            obra: orden.obra || 'Obra no especificada',
            sedeNombre: orden.sedeNombre || null,
            trabajadorNombre: orden.trabajadorNombre || null,
            esContado: orden.esContado !== undefined ? orden.esContado : true,
            estado: orden.estado || 'ACTIVA',
            venta: orden.venta !== undefined ? orden.venta : true
          }));
      }
      
      // Procesar reembolsos - Solo EFECTIVO y TRANSFERENCIA (los que afectan caja)
      // 🔥 FILTRO ADICIONAL POR FECHA: Solo incluir reembolsos del día seleccionado
      const reembolsosArray = Array.isArray(reembolsos) 
        ? reembolsos
            .filter(r => {
              // Validar que sea EFECTIVO o TRANSFERENCIA
              if (r.formaReembolso !== 'EFECTIVO' && r.formaReembolso !== 'TRANSFERENCIA') {
                return false;
              }
              
              // 🆕 VALIDAR FECHA: Solo incluir reembolsos del día seleccionado
              const fechaReembolso = r.fecha ? r.fecha.split('T')[0] : null;
              const fechaSeleccionada = fechaUnica;
              
              if (fechaReembolso !== fechaSeleccionada) {
                return false;
              }
              
              return true;
            })
            .map(reembolso => ({
              id: reembolso.id,
              fecha: reembolso.fecha,
              ordenOriginalId: reembolso.ordenOriginal?.id,
              numeroOrden: reembolso.ordenOriginal?.numero || '-',
              clienteNombre: reembolso.cliente?.nombre || 'Cliente no especificado',
              totalReembolso: reembolso.totalReembolso || 0,
              formaReembolso: reembolso.formaReembolso,
              motivo: reembolso.motivo || '',
              estado: reembolso.estado,
              procesado: reembolso.procesado
            }))
        : [];
      
      setOrdenesDisponibles(ordenesArray);
      setAbonosDisponibles(abonosArray);
      setReembolsosDisponibles(reembolsosArray);
      
      // Seleccionar automáticamente todas las órdenes, abonos y reembolsos disponibles
      const todasLasOrdenesIds = ordenesArray.map(o => o.id);
      const todosLosAbonosIds = abonosArray.map(a => a.id);
      const todosLosReembolsosIds = reembolsosArray.map(r => r.id);
      
      setFormData(prev => ({
        ...prev,
        ordenesIds: todasLasOrdenesIds,
        abonosIds: todosLosAbonosIds,
        reembolsosIds: todosLosReembolsosIds
      }));
    } catch (err) {
      setError('Error cargando órdenes disponibles');
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      setReembolsosDisponibles([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  // Función para parsear el método de pago desde la descripción de la orden
  const parsearMetodoPagoOrden = (descripcion, total) => {
    if (!descripcion || !total) {
      return { montoEfectivo: total || 0, montoTransferencia: 0, montoCheque: 0 };
    }
    
    let montoEfectivo = 0;
    let montoTransferencia = 0;
    let montoCheque = 0;
    
    const descUpper = descripcion.toUpperCase();
    
    // Buscar TRANSFERENCIA con bancos
    const transferenciaMatch = descUpper.match(/TRANSFERENCIA[:\s]+([\d.,]+)/);
    if (transferenciaMatch) {
      const montoTransf = parseFloat(transferenciaMatch[1].replace(/[,.]/g, '')) || 0;
      montoTransferencia += montoTransf;
    }
    
    // Buscar múltiples transferencias (TRANSFERENCIA: BANCO1: monto1, BANCO2: monto2)
    const transferenciasMultiples = descUpper.matchAll(/TRANSFERENCIA[:\s]+([A-Z\s]+):\s*([\d.,]+)/g);
    for (const match of transferenciasMultiples) {
      const monto = parseFloat(match[2].replace(/[,.]/g, '')) || 0;
      montoTransferencia += monto;
    }
    
    // Buscar EFECTIVO
    const efectivoMatch = descUpper.match(/EFECTIVO[:\s]+([\d.,]+)/);
    if (efectivoMatch) {
      const montoEfec = parseFloat(efectivoMatch[1].replace(/[,.]/g, '')) || 0;
      montoEfectivo += montoEfec;
    }
    
    // Buscar CHEQUE
    const chequeMatch = descUpper.match(/CHEQUE[:\s]+([\d.,]+)/);
    if (chequeMatch) {
      const montoChq = parseFloat(chequeMatch[1].replace(/[,.]/g, '')) || 0;
      montoCheque += montoChq;
    }
    
    // Si no se encontró ningún método específico, asumir que todo es efectivo
    if (montoEfectivo === 0 && montoTransferencia === 0 && montoCheque === 0) {
      montoEfectivo = total || 0;
    }
    
    return { montoEfectivo, montoTransferencia, montoCheque };
  };

  // Función para parsear el método de pago de un abono (formato: "EFECTIVO: 100.000 | TRANSFERENCIA: 50.000 (Banco de Bogotá) | RETEFUENTE Orden #1057: 12.500")
  // Función auxiliar para parsear números en formato colombiano
  const parsearNumeroColombiano = (numeroStr) => {
    if (!numeroStr) return 0;
    // Formato colombiano: 1.234.567,89 (puntos para miles, coma para decimales)
    // Convertir a formato JavaScript: 1234567.89
    let limpio = numeroStr.trim();
    // Remover puntos (separadores de miles)
    limpio = limpio.replace(/\./g, '');
    // Reemplazar coma por punto (separador decimal)
    limpio = limpio.replace(/,/g, '.');
    // Remover espacios
    limpio = limpio.replace(/\s/g, '');
    return parseFloat(limpio) || 0;
  };

  const parsearMetodoPagoAbono = (metodoPagoString) => {
    if (!metodoPagoString || typeof metodoPagoString !== 'string') {
      return { montoEfectivo: 0, montoTransferencia: 0, montoCheque: 0, montoRetencion: 0 };
    }
    
    let montoEfectivo = 0;
    let montoTransferencia = 0;
    let montoCheque = 0;
    let montoRetencion = 0;
    
    // Convertir a mayúsculas para búsqueda
    const metodoUpper = metodoPagoString.toUpperCase();
    
    // Dividir por " | " para obtener cada método (también puede ser solo "|" sin espacios)
    const partes = metodoUpper.split(/\s*\|\s*/).map(p => p.trim()).filter(p => p.length > 0);
    
    for (const parte of partes) {
      // Buscar RETEFUENTE (retención de fuente)
      // Formato: "RETEFUENTE Orden #1102: 54.831,93"
      const retencionMatch = parte.match(/RETEFUENTE[:\s]+.*?[:\s]+([\d.,\s]+)/);
      if (retencionMatch) {
        const montoStr = retencionMatch[1];
        const monto = parsearNumeroColombiano(montoStr);
        if (monto > 0) {
          montoRetencion += monto;
        }
        continue;
      }
      
      // Buscar EFECTIVO: monto
      const efectivoMatch = parte.match(/EFECTIVO[:\s]+([\d.,\s]+)/);
      if (efectivoMatch) {
        const montoStr = efectivoMatch[1];
        const monto = parsearNumeroColombiano(montoStr);
        if (monto > 0) {
          montoEfectivo += monto;
        }
        continue;
      }
      
      // Buscar TRANSFERENCIA: monto (puede tener banco entre paréntesis)
      // Formato: "TRANSFERENCIA: 50.000 (Banco de Bogotá)" o "TRANSFERENCIA: 50.000"
      const transferenciaMatch = parte.match(/TRANSFERENCIA[:\s]+([\d.,\s]+)/);
      if (transferenciaMatch) {
        const montoStr = transferenciaMatch[1];
        const monto = parsearNumeroColombiano(montoStr);
        if (monto > 0) {
          montoTransferencia += monto;
        }
        continue;
      }
      
      // Buscar CHEQUE: monto
      const chequeMatch = parte.match(/CHEQUE[:\s]+([\d.,\s]+)/);
      if (chequeMatch) {
        const montoStr = chequeMatch[1];
        const monto = parsearNumeroColombiano(montoStr);
        if (monto > 0) {
          montoCheque += monto;
        }
        continue;
      }
    }
    
    return { montoEfectivo, montoTransferencia, montoCheque, montoRetencion };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Los checkboxes de órdenes y abonos ya no existen, se seleccionan automáticamente
    if (name === 'fechaEntrega') {
      // Cuando cambia la fecha de entrega, actualizar el formData
      setFormData(prev => ({
        ...prev,
        fechaEntrega: value
      }));
    } else {
      // Campos de texto se convierten a mayúsculas (excepto checkboxes)
      const processedValue = type === 'checkbox' ? checked : (type === 'text' ? value.toUpperCase() : value);
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };


  const calcularTotales = () => {
    // Asegurar que sean arrays
    const ordenes = Array.isArray(ordenesDisponibles) ? ordenesDisponibles : [];
    const abonos = Array.isArray(abonosDisponibles) ? abonosDisponibles : [];
    const reembolsos = Array.isArray(reembolsosDisponibles) ? reembolsosDisponibles : [];
    
    // Calcular monto de órdenes a contado seleccionadas
    const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
    const ordenesSeleccionadas = ordenes.filter(orden => 
      ordenesIds.includes(orden.id)
    );
    const montoOrdenes = ordenesSeleccionadas.reduce((sum, orden) => sum + (orden.total || 0), 0);
    
    // Calcular monto de abonos seleccionados (NUEVO)
    const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
    const abonosSeleccionados = abonos.filter(abono => 
      abonosIds.includes(abono.id)
    );
    const montoAbonos = abonosSeleccionados.reduce((sum, abono) => sum + (Number(abono.montoAbono) || 0), 0);
    
    // Calcular monto de reembolsos seleccionados (EGRESOS)
    const reembolsosIds = Array.isArray(formData.reembolsosIds) ? formData.reembolsosIds : [];
    const reembolsosSeleccionados = reembolsos.filter(reembolso => 
      reembolsosIds.includes(reembolso.id)
    );
    const montoReembolsos = reembolsosSeleccionados.reduce((sum, reembolso) => sum + (Number(reembolso.totalReembolso) || 0), 0);
    
    // Monto total = (órdenes a contado + abonos) - reembolsos
    const montoTotal = montoOrdenes + montoAbonos - montoReembolsos;
    
    // Calcular desglose de montos según método de pago de las órdenes
    let montoEfectivo = 0;
    let montoTransferencia = 0;
    let montoCheque = 0;
    let montoRetencion = 0; // Agregar acumulador para retención
    
    // Procesar cada orden seleccionada
    ordenesSeleccionadas.forEach(orden => {
      // 🆕 PRIORIZAR CAMPOS NUMÉRICOS del backend
      const tieneMontos = (orden.montoEfectivo || 0) > 0 || (orden.montoTransferencia || 0) > 0 || (orden.montoCheque || 0) > 0;
      
      let montosOrden = {};
      if (tieneMontos) {
        // Usar campos numéricos del backend
        montosOrden = {
          montoEfectivo: Number(orden.montoEfectivo) || 0,
          montoTransferencia: Number(orden.montoTransferencia) || 0,
          montoCheque: Number(orden.montoCheque) || 0
        };
      } else {
        // Fallback: parsear descripción (registros antiguos)
        montosOrden = parsearMetodoPagoOrden(orden.descripcion || '', orden.total || 0);
      }
      
      montoEfectivo += montosOrden.montoEfectivo;
      montoTransferencia += montosOrden.montoTransferencia;
      montoCheque += montosOrden.montoCheque;
    });

    // Los abonos tienen método de pago en el campo metodoPago como string complejo
    // Formato: "EFECTIVO: 100.000 | TRANSFERENCIA: 50.000 (Banco de Bogotá) | RETEFUENTE Orden #1057: 12.500"
    abonosSeleccionados.forEach((abono, idx) => {
      const montoAbono = Number(abono.montoAbono) || 0;
      
      // 🆕 PRIORIZAR CAMPOS NUMÉRICOS del backend
      const tieneMontos = (abono.montoEfectivo || 0) > 0 || (abono.montoTransferencia || 0) > 0 || (abono.montoCheque || 0) > 0;

      let montosAbono = {};
      if (tieneMontos) {
        montosAbono = {
          montoEfectivo: Number(abono.montoEfectivo) || 0,
          montoTransferencia: Number(abono.montoTransferencia) || 0,
          montoCheque: Number(abono.montoCheque) || 0,
          montoRetencion: Number(abono.montoRetencion) || 0
        };
      } else {
        // Fallback: parsear metodoPago string (registros antiguos)
        const metodoPagoString = abono.metodoPago || '';
        montosAbono = parsearMetodoPagoAbono(metodoPagoString);
        
        // 🚨 VALIDACIÓN: Detectar datos corruptos en metodoPago
        const sumaMetodosParsed = montosAbono.montoEfectivo + montosAbono.montoTransferencia + montosAbono.montoCheque;
        const diferenciaTolerada = 0.02; // 2% tolerancia por redondeos
        const montoMinimo = montoAbono * (1 - diferenciaTolerada);
        const montoMaximo = montoAbono * (1 + diferenciaTolerada);
        
        if (sumaMetodosParsed > montoMaximo) {
          // ⚠️ ADVERTENCIA: Usar solo el monto del abono, distribuir proporcionalmente
          montosAbono = {
            montoEfectivo: 0,
            montoTransferencia: montoAbono, // Asignar todo a transferencia por defecto
            montoCheque: 0,
            montoRetencion: montosAbono.montoRetencion || 0 // Mantener retención si existe
          };
        }
      }
      
      montoEfectivo += montosAbono.montoEfectivo;
      montoTransferencia += montosAbono.montoTransferencia;
      montoCheque += montosAbono.montoCheque;
      montoRetencion += montosAbono.montoRetencion; // Acumular retención
    });
    
    // Procesar reembolsos (EGRESOS)
    reembolsosSeleccionados.forEach(reembolso => {
      const montoReembolso = Number(reembolso.totalReembolso) || 0;
      
      // Restar según forma de reembolso
      if (reembolso.formaReembolso === 'EFECTIVO') {
        montoEfectivo -= montoReembolso;
      } else if (reembolso.formaReembolso === 'TRANSFERENCIA') {
        montoTransferencia -= montoReembolso;
      }
    });
    
    const desglose = {
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito: 0, // Depósito no se usa en órdenes
      montoRetencion, // Agregar retención al desglose
    };
    
    // El monto total debe ser la suma de órdenes + abonos, no la suma del desglose
    // (porque el desglose puede tener errores de parseo)
    const monto = montoTotal; // Usar el monto calculado directamente
    
    // Validar que el desglose coincida con el monto total (con tolerancia del 1%)
    const sumaDesglose = montoEfectivo + montoTransferencia + montoCheque + 0;
    
    if (Math.abs(sumaDesglose - monto) > monto * 0.01) {
      const factor = monto / sumaDesglose;
      montoEfectivo = montoEfectivo * factor;
      montoTransferencia = montoTransferencia * factor;
      montoCheque = montoCheque * factor;
    }
    
    return {
      monto,
      montoOrdenes: montoOrdenes,
      montoAbonos: montoAbonos,
      montoReembolsos: montoReembolsos,
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito: 0,
      montoRetencion, // Agregar retención al return
    };
  };

  const validarStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        // Validar que tenga sede, empleado y fecha de entrega (solo un día)
        return formData.sedeId && formData.empleadoId && formData.fechaEntrega;
      case 2:
        // Debe haber al menos una orden a contado, un abono o un reembolso seleccionado
        const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
        const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
        const reembolsosIds = Array.isArray(formData.reembolsosIds) ? formData.reembolsosIds : [];
        return ordenesIds.length > 0 || abonosIds.length > 0 || reembolsosIds.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validarStep(1) || !validarStep(2)) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar que la fecha de entrega esté presente
    if (!formData.fechaEntrega) {
      setError('Debe seleccionar una fecha de entrega');
      return;
    }

    try {
      setLoading(true);
      
      const totales = calcularTotales();
      
      // Inferir modalidadEntrega a partir del desglose
      const metodos = [
        { key: 'EFECTIVO', val: parseFloat(formData.montoEfectivo) || 0 },
        { key: 'TRANSFERENCIA', val: parseFloat(formData.montoTransferencia) || 0 },
        { key: 'CHEQUE', val: parseFloat(formData.montoCheque) || 0 },
        { key: 'DEPOSITO', val: parseFloat(formData.montoDeposito) || 0 },
      ];
      const metodosUsados = metodos.filter(m => m.val > 0).map(m => m.key);
      const modalidadEntrega = metodosUsados.length === 1 ? metodosUsados[0] : 'MIXTO';

      // Revalidar órdenes disponibles para concurrencia/eligibilidad
      try {
        const elegibles = await EntregasService.obtenerOrdenesDisponibles(formData.sedeId);
        // Validar órdenes a contado - FILTRAR solo las que tienen venta: true
        const ordenesContadoValidas = (elegibles?.ordenesContado || []).filter(o => o.venta === true);
        
        // Validación adicional: Verificar que todas las órdenes pertenezcan a la sede seleccionada
        const sedeIdNum = parseInt(formData.sedeId);
        const ordenesDeOtraSede = ordenesContadoValidas.filter(o => {
          const ordenSedeId = o.sedeId || o.sede?.id;
          return ordenSedeId && parseInt(ordenSedeId) !== sedeIdNum;
        });
        
        if (ordenesDeOtraSede.length > 0) {
          setError(`Error: Algunas órdenes no pertenecen a la sede seleccionada. Las órdenes deben ser de la misma sede que la entrega.`);
          setLoading(false);
          return;
        }
        
        const ordenesContadoIds = new Set(ordenesContadoValidas.map(o => o.id));
        const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
        const ordenesInvalidas = ordenesIds.filter(id => !ordenesContadoIds.has(id));
        if (ordenesInvalidas.length > 0) {
          setError(`Algunas órdenes ya no son elegibles para entrega: ${ordenesInvalidas.join(', ')}. Pueden estar en otra entrega, no pertenecer a esta sede, estar fuera del rango aplicado, o no estar confirmadas (venta: false). Actualiza la selección.`);
          setLoading(false);
          return;
        }
        
        // Validar abonos disponibles (NUEVO) - Solo filtrar los que no están ya entregados
        const abonosDisponiblesValidos = (elegibles?.abonosDisponibles || []).filter(a => !a.yaEntregado);
        
        // Validación adicional: Verificar que todos los abonos pertenezcan a órdenes de la sede seleccionada
        const abonosDeOtraSede = abonosDisponiblesValidos.filter(a => {
          const abonoSedeId = a.sedeId || a.sede?.id || a.sedeNombre; // Puede venir como ID o nombre
          // Si viene como nombre, necesitaríamos comparar con el nombre de la sede, pero por ahora validamos por ID
          if (abonoSedeId && typeof abonoSedeId === 'number') {
            return parseInt(abonoSedeId) !== sedeIdNum;
          }
          // Si no tiene sedeId, asumimos que el backend ya lo filtró correctamente
          return false;
        });
        
        if (abonosDeOtraSede.length > 0) {
          setError(`Error: Algunos abonos no pertenecen a la sede seleccionada. Los abonos deben ser de órdenes de la misma sede que la entrega.`);
          setLoading(false);
          return;
        }
        
        const abonosDisponiblesIds = new Set(abonosDisponiblesValidos.map(a => a.id));
        const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
        const abonosInvalidos = abonosIds.filter(id => !abonosDisponiblesIds.has(id));
        if (abonosInvalidos.length > 0) {
          setError(`Algunos abonos ya no están disponibles: ${abonosInvalidos.join(', ')}. Pueden estar incluidos en otra entrega o la orden no está confirmada (venta: false). Actualiza la selección.`);
          setLoading(false);
          return;
        }
      } catch (revalErr) {
        // Continuar, backend validará también
      }

      // Gastos eliminados - ya no se validan ni se envían

      const entregaData = {
        sedeId: parseInt(formData.sedeId),
        empleadoId: parseInt(formData.empleadoId),
        fechaEntrega: formData.fechaEntrega || obtenerFechaLocal()
      };
      
      // Campos opcionales - solo agregar si tienen valor
      const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
      const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
      const reembolsosIds = Array.isArray(formData.reembolsosIds) ? formData.reembolsosIds : [];
      
      if (ordenesIds.length > 0) {
        entregaData.ordenesIds = ordenesIds;
      }
      if (abonosIds.length > 0) {
        entregaData.abonosIds = abonosIds;
      }
      if (reembolsosIds.length > 0) {
        entregaData.reembolsosIds = reembolsosIds;
      }
      // Gastos eliminados - ya no se envían
      if (modalidadEntrega && modalidadEntrega !== 'EFECTIVO') {
        entregaData.modalidadEntrega = modalidadEntrega;
      }

      // Desgloses de métodos de pago
      // Obtener montos calculados automáticamente de las órdenes
      const totalesCalculados = calcularTotales();
      const montoEfectivo = totalesCalculados.montoEfectivo || 0;
      const montoTransferencia = totalesCalculados.montoTransferencia || 0;
      const montoCheque = totalesCalculados.montoCheque || 0;
      const montoDeposito = totalesCalculados.montoDeposito || 0;
      
      // Calcular monto total desde el desglose
      const monto = montoEfectivo + montoTransferencia + montoCheque + montoDeposito;

      // Incluir desgloses y monto
      if (monto > 0) {
        entregaData.monto = monto;
        entregaData.montoEfectivo = montoEfectivo;
        entregaData.montoTransferencia = montoTransferencia;
        entregaData.montoCheque = montoCheque;
        entregaData.montoDeposito = montoDeposito;
      }

      const respuesta = await EntregasService.crearEntrega(entregaData);

      if (onSuccess) onSuccess(respuesta);
      onClose();
      
    } catch (err) {
      // Extraer mensaje de error del backend
      let errorMessage = 'Error desconocido al crear la entrega';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Intentar diferentes estructuras de respuesta del backend
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.mensaje) {
          errorMessage = errorData.mensaje;
        }
        
        // Mensajes específicos del backend según la lógica de validación:
        // - "La orden ya está incluida en otra entrega"
        // - "No se puede agregar una orden a crédito completamente saldada..."
        // - "La orden a crédito no tiene abonos en el período especificado..."
        // - "Para órdenes a crédito, la entrega debe tener fechas definidas"
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totales = calcularTotales();

  return (
    <div className="crear-entrega-modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="crear-entrega-modal" style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>Nueva Entrega de Dinero</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Steps ocultos - el proceso es automático */}

        <form onSubmit={handleSubmit} className="crear-entrega-form">
          
          {/* Datos Básicos */}
          {(
            <div className="form-step">
              <h3>Información General</h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Sede *</label>
                  <select
                    name="sedeId"
                    value={formData.sedeId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map(sede => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Empleado Responsable *</label>
                  <select
                    name="empleadoId"
                    value={formData.empleadoId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar empleado</option>
                    {trabajadores.map(trabajador => (
                      <option key={trabajador.id} value={trabajador.id}>
                        {trabajador.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group span-2">
                  <label>Fecha de Entrega *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="date"
                      name="fechaEntrega"
                      value={formData.fechaEntrega}
                      onChange={handleChange}
                      required
                      style={{ flex: 1 }}
                    />
                    <small style={{ color: '#666', fontSize: '0.85em' }}>
                      Esta fecha se guarda en la entrega; los pendientes se calculan automáticamente desde la última entrega.
                    </small>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Resumen de Ingresos (automático) */}
          {validarStep(1) && (
            <div className="form-step">
              <h3>Ingresos Pendientes del Rango Automático</h3>
              
              {loadingOrdenes ? (
                <div className="loading-ordenes">Cargando órdenes y abonos disponibles...</div>
              ) : (
                <>
                  {/* Contadores de Órdenes y Abonos */}
                  <div style={{ 
                    marginBottom: '30px', 
                    padding: '20px', 
                    backgroundColor: '#f8f9ff', 
                    borderRadius: '8px',
                    border: '1px solid #e6e8f0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '2rem', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      {/* Contador de Órdenes */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '1.5rem',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '2px solid #1f2a5c',
                        minWidth: '180px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ 
                          fontSize: '3rem', 
                          fontWeight: 'bold', 
                          color: '#1f2a5c',
                          marginBottom: '0.5rem',
                          lineHeight: '1'
                        }}>
                          {Array.isArray(ordenesDisponibles) ? ordenesDisponibles.length : 0}
                        </div>
                        <div style={{ 
                          fontSize: '1rem', 
                          color: '#666',
                          textAlign: 'center',
                          fontWeight: '500'
                        }}>
                          {Array.isArray(ordenesDisponibles) && ordenesDisponibles.length === 1 
                            ? 'Orden a Contado' 
                            : 'Órdenes a Contado'}
                        </div>
                      </div>

                      {/* Contador de Abonos */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '1.5rem',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '2px solid #1f2a5c',
                        minWidth: '180px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ 
                          fontSize: '3rem', 
                          fontWeight: 'bold', 
                          color: '#1f2a5c',
                          marginBottom: '0.5rem',
                          lineHeight: '1'
                        }}>
                          {Array.isArray(abonosDisponibles) ? abonosDisponibles.length : 0}
                        </div>
                        <div style={{ 
                          fontSize: '1rem', 
                          color: '#666',
                          textAlign: 'center',
                          fontWeight: '500'
                        }}>
                          {Array.isArray(abonosDisponibles) && abonosDisponibles.length === 1 
                            ? 'Abono' 
                            : 'Abonos'}
                        </div>
                      </div>

                      {/* Contador de Reembolsos (EGRESOS) */}
                      {Array.isArray(reembolsosDisponibles) && reembolsosDisponibles.length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '1.5rem',
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '2px solid #d32f2f',
                          minWidth: '180px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ 
                            fontSize: '3rem', 
                            fontWeight: 'bold', 
                            color: '#d32f2f',
                            marginBottom: '0.5rem',
                            lineHeight: '1'
                          }}>
                            {reembolsosDisponibles.length}
                          </div>
                          <div style={{ 
                            fontSize: '1rem', 
                            color: '#d32f2f',
                            textAlign: 'center',
                            fontWeight: '500'
                          }}>
                            {reembolsosDisponibles.length === 1 
                              ? 'Reembolso (Egreso)' 
                              : 'Reembolsos (Egresos)'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Información adicional */}
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '12px', 
                      backgroundColor: '#e3f2fd', 
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      color: '#1976d2',
                      textAlign: 'center'
                    }}>
                      Se incluirán automáticamente todas las órdenes a contado y abonos del rango automático, más los reembolsos (egresos) del día seleccionado. 
                      Solo se muestran órdenes y abonos de órdenes confirmadas (venta: true).
                      {Array.isArray(reembolsosDisponibles) && reembolsosDisponibles.length > 0 && (
                        <div style={{ marginTop: '8px', color: '#d32f2f', fontWeight: '500' }}>
                          ⚠️ Los reembolsos se restarán del total a entregar.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Mensaje si no hay nada disponible */}
                  {(!Array.isArray(ordenesDisponibles) || ordenesDisponibles.length === 0) &&
                   (!Array.isArray(abonosDisponibles) || abonosDisponibles.length === 0) &&
                   (!Array.isArray(reembolsosDisponibles) || reembolsosDisponibles.length === 0) && (
                    <div className="no-ordenes" style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: '#666',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      No hay órdenes, abonos ni reembolsos disponibles para el día y sede seleccionados
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Resumen final */}
          {validarStep(1) && (ordenesDisponibles.length > 0 || abonosDisponibles.length > 0 || reembolsosDisponibles.length > 0) && (
            <div className="resumen-entrega" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <h4>Resumen de Entrega</h4>
              <div className="desglose-entrega">
                <div className="desglose-row">
                  <label>Efectivo</label>
                  <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                    ${totales.montoEfectivo.toLocaleString()}
                  </span>
                </div>
                <div className="desglose-row">
                  <label>Transferencia</label>
                  <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                    ${totales.montoTransferencia.toLocaleString()}
                  </span>
                </div>
                <div className="desglose-row">
                  <label>Cheque</label>
                  <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                    ${totales.montoCheque.toLocaleString()}
                  </span>
                </div>
                {totales.montoRetencion > 0 && (
                  <div className="desglose-row">
                    <label>Retención de Fuente</label>
                    <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                      ${totales.montoRetencion.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="resumen-item">
                <span>Total Órdenes a Contado:</span>
                <span>${totales.montoOrdenes.toLocaleString()}</span>
              </div>
              {totales.montoAbonos > 0 && (
                <div className="resumen-item">
                  <span>Total Abonos:</span>
                  <span>${totales.montoAbonos.toLocaleString()}</span>
                </div>
              )}
              {totales.montoReembolsos > 0 && (
                <div className="resumen-item" style={{ color: '#d32f2f' }}>
                  <span>Total Reembolsos (Egresos):</span>
                  <span>-${totales.montoReembolsos.toLocaleString()}</span>
                </div>
              )}
              <div className="resumen-item total">
                <span><strong>Monto Neto:</strong></span>
                <span><strong>${totales.monto.toLocaleString()}</strong></span>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-guardar"
              disabled={loading || !validarStep(1) || !validarStep(2)}
            >
              {loading ? 'Creando...' : 'Crear Entrega'}
            </button>
            <button 
              type="button" 
              className="btn-cancelar"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearEntregaModal;