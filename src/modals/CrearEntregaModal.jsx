import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
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
    montoEfectivo: '',
    montoTransferencia: '',
    montoCheque: '',
    montoDeposito: ''
  });

  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [abonosDisponibles, setAbonosDisponibles] = useState([]); // Abonos disponibles (NUEVO)
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
      montoEfectivo: '',
      montoTransferencia: '',
      montoCheque: '',
      montoDeposito: ''
    });
    setOrdenesDisponibles([]);
    setAbonosDisponibles([]);
    setError('');
    setStep(1);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Limpiar órdenes y abonos cuando se abre el modal
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      // Incrementar reloadKey para forzar recarga cuando se abre el modal
      setReloadKey(prev => prev + 1);
    } else {
      // Limpiar todo cuando se cierra el modal
      resetForm();
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Solo ejecutar cuando se abre/cierra el modal

  // Cargar órdenes disponibles cuando se seleccionan sede y fecha (solo un día)
  useEffect(() => {
    // Solo cargar si el modal está abierto y hay sede y fecha
    if (isOpen && formData.sedeId && formData.fechaEntrega) {
      cargarOrdenesDisponibles();
    } else {
      // Limpiar órdenes si no hay datos completos o el modal está cerrado
      if (!isOpen) {
        setOrdenesDisponibles([]);
        setAbonosDisponibles([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.sedeId, formData.fechaEntrega, reloadKey]); // Incluir reloadKey para forzar recarga

  const cargarOrdenesDisponibles = async () => {
    // Leer valores actuales del estado para evitar problemas de closure
    const sedeIdActual = formData.sedeId;
    const fechaActual = formData.fechaEntrega;
    
    // Validar que tengamos los datos necesarios
    if (!sedeIdActual || !fechaActual) {
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
      return;
    }
    
    try {
      setLoadingOrdenes(true);
      // Usar la misma fecha para desde y hasta (solo un día)
      const fechaUnica = fechaActual;
      const ordenes = await EntregasService.obtenerOrdenesDisponibles(
        sedeIdActual,
        fechaUnica,
        fechaUnica
      );
      
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
      
      setOrdenesDisponibles(ordenesArray);
      setAbonosDisponibles(abonosArray);
      
      // Seleccionar automáticamente todas las órdenes y abonos disponibles
      const todasLasOrdenesIds = ordenesArray.map(o => o.id);
      const todosLosAbonosIds = abonosArray.map(a => a.id);
      
      setFormData(prev => ({
        ...prev,
        ordenesIds: todasLasOrdenesIds,
        abonosIds: todosLosAbonosIds
      }));
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('Error cargando órdenes disponibles');
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
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
  const parsearMetodoPagoAbono = (metodoPagoString) => {
    if (!metodoPagoString || typeof metodoPagoString !== 'string') {
      return { montoEfectivo: 0, montoTransferencia: 0, montoCheque: 0 };
    }
    
    let montoEfectivo = 0;
    let montoTransferencia = 0;
    let montoCheque = 0;
    
    // Convertir a mayúsculas para búsqueda
    const metodoUpper = metodoPagoString.toUpperCase();
    
    // Dividir por " | " para obtener cada método (también puede ser solo "|" sin espacios)
    const partes = metodoUpper.split(/\s*\|\s*/).map(p => p.trim()).filter(p => p.length > 0);
    
    for (const parte of partes) {
      // Ignorar RETEFUENTE (es una deducción, no un método de pago)
      if (parte.includes('RETEFUENTE') || parte.includes('RETENCION')) {
        continue;
      }
      
      // Buscar EFECTIVO: monto
      // Patrón más estricto: debe tener "EFECTIVO" seguido de ":" o espacios, luego números
      const efectivoMatch = parte.match(/EFECTIVO[:\s]+([\d.,\s]+)/);
      if (efectivoMatch) {
        // Extraer el número, puede tener formato: "100.000" o "100,000" o "100 000"
        // Pero solo tomar hasta el primer carácter no numérico después de los números
        const montoStr = efectivoMatch[1].trim();
        // Remover todo excepto dígitos, pero preservar el primer punto o coma como separador de miles
        // Si tiene punto o coma, asumir que es separador de miles (formato colombiano)
        let numeroLimpio = montoStr.replace(/[^\d]/g, '');
        const monto = parseFloat(numeroLimpio) || 0;
        if (monto > 0) {
          montoEfectivo += monto;
        }
        continue;
      }
      
      // Buscar TRANSFERENCIA: monto (puede tener banco entre paréntesis)
      // Formato: "TRANSFERENCIA: 50.000 (Banco de Bogotá)" o "TRANSFERENCIA: 50.000"
      // Patrón más estricto: debe tener "TRANSFERENCIA" seguido de ":" o espacios, luego números
      const transferenciaMatch = parte.match(/TRANSFERENCIA[:\s]+([\d.,\s]+)/);
      if (transferenciaMatch) {
        const montoStr = transferenciaMatch[1].trim();
        // Remover todo excepto dígitos
        let numeroLimpio = montoStr.replace(/[^\d]/g, '');
        const monto = parseFloat(numeroLimpio) || 0;
        if (monto > 0) {
          montoTransferencia += monto;
        }
        continue;
      }
      
      // Buscar CHEQUE: monto
      const chequeMatch = parte.match(/CHEQUE[:\s]+([\d.,\s]+)/);
      if (chequeMatch) {
        const montoStr = chequeMatch[1].trim();
        let numeroLimpio = montoStr.replace(/[^\d]/g, '');
        const monto = parseFloat(numeroLimpio) || 0;
        if (monto > 0) {
          montoCheque += monto;
        }
        continue;
      }
    }
    
    return { montoEfectivo, montoTransferencia, montoCheque };
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
    
    // Monto total = órdenes a contado + abonos
    const montoTotal = montoOrdenes + montoAbonos;
    
    // Calcular desglose de montos según método de pago de las órdenes
    let montoEfectivo = 0;
    let montoTransferencia = 0;
    let montoCheque = 0;
    
    // Procesar cada orden seleccionada
    ordenesSeleccionadas.forEach(orden => {
      const parseado = parsearMetodoPagoOrden(orden.descripcion || '', orden.total || 0);
      montoEfectivo += parseado.montoEfectivo;
      montoTransferencia += parseado.montoTransferencia;
      montoCheque += parseado.montoCheque;
    });
    
    // Los abonos tienen método de pago en el campo metodoPago como string complejo
    // Formato: "EFECTIVO: 100.000 | TRANSFERENCIA: 50.000 (Banco de Bogotá) | RETEFUENTE Orden #1057: 12.500"
    abonosSeleccionados.forEach(abono => {
      const metodoPagoString = abono.metodoPago || '';
      const montoAbono = Number(abono.montoAbono) || 0;
      
      if (metodoPagoString) {
        // Parsear el string del método de pago
        const parseado = parsearMetodoPagoAbono(metodoPagoString);
        
        // Verificar que la suma de los métodos parseados no exceda el monto del abono
        const sumaParseada = parseado.montoEfectivo + parseado.montoTransferencia + parseado.montoCheque;
        
        // DEBUG: Log para identificar problemas
        if (sumaParseada !== montoAbono) {
          console.log(` [DEBUG Entrega] Abono #${abono.id}:`, {
            montoAbono,
            metodoPagoString: metodoPagoString.substring(0, 100), // Primeros 100 caracteres
            parseado,
            sumaParseada,
            diferencia: sumaParseada - montoAbono
          });
        }
        
        // Si la suma parseada es mayor al monto del abono, hay un error en el parseo
        // En ese caso, distribuir proporcionalmente
        if (sumaParseada > montoAbono * 1.01) { // Tolerancia del 1% por redondeos
          console.warn(` Abono #${abono.id}: Suma parseada (${sumaParseada}) > monto abono (${montoAbono}). Ajustando proporcionalmente.`);
          const factor = montoAbono / sumaParseada;
          parseado.montoEfectivo = parseado.montoEfectivo * factor;
          parseado.montoTransferencia = parseado.montoTransferencia * factor;
          parseado.montoCheque = parseado.montoCheque * factor;
        } else if (sumaParseada < montoAbono * 0.99) {
          // Si la suma parseada es menor, la diferencia va a efectivo por defecto
          const diferencia = montoAbono - sumaParseada;
          parseado.montoEfectivo += diferencia;
        }
        
        montoEfectivo += parseado.montoEfectivo;
        montoTransferencia += parseado.montoTransferencia;
        montoCheque += parseado.montoCheque;
      } else {
        // Si no tiene método de pago, se asume efectivo por defecto
        montoEfectivo += montoAbono;
      }
    });
    
    const desglose = {
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito: 0, // Depósito no se usa en órdenes
    };
    
    // El monto total debe ser la suma de órdenes + abonos, no la suma del desglose
    // (porque el desglose puede tener errores de parseo)
    const monto = montoTotal; // Usar el monto calculado directamente
    
    // Validar que el desglose coincida con el monto total (con tolerancia del 1%)
    const sumaDesglose = montoEfectivo + montoTransferencia + montoCheque + 0;
    
    // DEBUG: Log del cálculo final
    console.log(` [DEBUG Entrega] Cálculo de totales:`, {
      montoOrdenes,
      montoAbonos,
      montoTotal: monto,
      desglose: {
        montoEfectivo,
        montoTransferencia,
        montoCheque,
        montoDeposito: 0
      },
      sumaDesglose,
      diferencia: Math.abs(sumaDesglose - monto)
    });
    
    if (Math.abs(sumaDesglose - monto) > monto * 0.01) {
      console.warn(` Desglose no coincide con monto total. Desglose: ${sumaDesglose}, Total: ${monto}. Ajustando proporcionalmente.`);
      const factor = monto / sumaDesglose;
      montoEfectivo = montoEfectivo * factor;
      montoTransferencia = montoTransferencia * factor;
      montoCheque = montoCheque * factor;
    }
    
    return {
      monto,
      montoOrdenes: montoOrdenes,
      montoAbonos: montoAbonos,
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito: 0,
    };
  };

  const validarStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        // Validar que tenga sede, empleado y fecha de entrega (solo un día)
        return formData.sedeId && formData.empleadoId && formData.fechaEntrega;
      case 2:
        // Debe haber al menos una orden a contado o un abono seleccionado
        const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
        const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
        return ordenesIds.length > 0 || abonosIds.length > 0;
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
      // Usar la misma fecha para desde y hasta (solo un día)
      const fechaUnica = formData.fechaEntrega;
      try {
        const elegibles = await EntregasService.obtenerOrdenesDisponibles(
          formData.sedeId,
          fechaUnica,
          fechaUnica
        );
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
          setError(`Algunas órdenes ya no son elegibles para entrega: ${ordenesInvalidas.join(', ')}. Pueden estar en otra entrega, no pertenecer a esta sede, estar fuera del rango de fechas, o no estar confirmadas (venta: false). Actualiza la selección.`);
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
        console.warn('No se pudo revalidar órdenes disponibles antes de crear.', revalErr);
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
      
      if (ordenesIds.length > 0) {
        entregaData.ordenesIds = ordenesIds;
      }
      if (abonosIds.length > 0) {
        entregaData.abonosIds = abonosIds;
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
      console.error('Error creando entrega:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      
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
    <div className="crear-entrega-modal-overlay">
      <div className="crear-entrega-modal">
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
                      Solo se pueden agregar ingresos de esta fecha
                    </small>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Resumen de Ingresos (automático) */}
          {validarStep(1) && (
            <div className="form-step">
              <h3>Ingresos del Día</h3>
              
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
                      Se incluirán automáticamente todas las órdenes a contado y abonos del día seleccionado. 
                      Solo se muestran órdenes y abonos de órdenes confirmadas (venta: true).
                    </div>
                  </div>
                  
                  {/* Mensaje si no hay nada disponible */}
                  {(!Array.isArray(ordenesDisponibles) || ordenesDisponibles.length === 0) &&
                   (!Array.isArray(abonosDisponibles) || abonosDisponibles.length === 0) && (
                    <div className="no-ordenes" style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: '#666',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      No hay órdenes ni abonos disponibles para el día y sede seleccionados
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Resumen final */}
          {validarStep(1) && (ordenesDisponibles.length > 0 || abonosDisponibles.length > 0) && (
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
                <div className="desglose-row">
                  <label>Depósito</label>
                  <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                    ${totales.montoDeposito.toLocaleString()}
                  </span>
                </div>
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
              <div className="resumen-item total">
                <span><strong>Monto Total:</strong></span>
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