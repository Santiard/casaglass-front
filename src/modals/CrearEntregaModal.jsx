import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import './CrearEntregaModal.css';
import { useToast } from '../context/ToastContext.jsx';

const CrearEntregaModal = ({ isOpen, onClose, onSuccess, sedes, trabajadores, sedeIdUsuario, userId }) => {
  const { showWarning } = useToast();
  const [formData, setFormData] = useState({
    sedeId: '',
    empleadoId: '',
    fechaEntrega: new Date().toISOString().slice(0, 10), // Fecha única para la entrega (solo un día)
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
      fechaEntrega: new Date().toISOString().slice(0, 10),
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Solo ejecutar cuando se abre el modal

  // Cargar órdenes disponibles cuando se seleccionan sede y fecha (solo un día)
  useEffect(() => {
    if (formData.sedeId && formData.fechaEntrega) {
      cargarOrdenesDisponibles();
    } else {
      // Limpiar órdenes si no hay datos completos
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
    }
  }, [formData.sedeId, formData.fechaEntrega]);

  const cargarOrdenesDisponibles = async () => {
    try {
      setLoadingOrdenes(true);
      // Usar la misma fecha para desde y hasta (solo un día)
      const fechaUnica = formData.fechaEntrega;
      const ordenes = await EntregasService.obtenerOrdenesDisponibles(
        formData.sedeId,
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
        
        // Abonos disponibles (NUEVO - reemplaza ordenesConAbonos)
        // FILTRAR solo abonos de órdenes con ventaOrden: true (confirmadas/pagadas)
        const abonosDisponibles = Array.isArray(ordenes.abonosDisponibles) 
          ? ordenes.abonosDisponibles.filter(abono => abono.ventaOrden === true) 
          : [];
        abonosArray = abonosDisponibles.map(abono => ({
          id: abono.id, // ID del abono
          ordenId: abono.ordenId,
          numeroOrden: abono.numeroOrden,
          fechaAbono: abono.fechaAbono,
          montoAbono: abono.montoAbono || abono.monto || 0,
          montoOrden: abono.montoOrden || 0, // Monto total de la orden
          clienteNombre: abono.clienteNombre || 'Cliente no especificado',
          clienteNit: abono.clienteNit || null,
          metodoPago: abono.metodoPago || null,
          yaEntregado: abono.yaEntregado || false
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'ordenesIds') {
      const ordenId = parseInt(value);
      setFormData(prev => {
        const ordenesIds = Array.isArray(prev.ordenesIds) ? prev.ordenesIds : [];
        return {
          ...prev,
          ordenesIds: checked 
            ? [...ordenesIds, ordenId]
            : ordenesIds.filter(id => id !== ordenId)
        };
      });
    } else if (name === 'abonosIds') {
      const abonoId = parseInt(value);
      setFormData(prev => {
        const abonosIds = Array.isArray(prev.abonosIds) ? prev.abonosIds : [];
        return {
          ...prev,
          abonosIds: checked 
            ? [...abonosIds, abonoId]
            : abonosIds.filter(id => id !== abonoId)
        };
      });
    } else if (name === 'fechaEntrega') {
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
    
    // Los abonos pueden tener método de pago en el campo metodoPago
    // Si no tienen método de pago específico, se asumen como efectivo por defecto
    abonosSeleccionados.forEach(abono => {
      const metodoPagoAbono = (abono.metodoPago || '').toUpperCase();
      const montoAbono = Number(abono.montoAbono) || 0;
      
      if (metodoPagoAbono === 'EFECTIVO') {
        montoEfectivo += montoAbono;
      } else if (metodoPagoAbono === 'TRANSFERENCIA') {
        montoTransferencia += montoAbono;
      } else if (metodoPagoAbono === 'CHEQUE') {
        montoCheque += montoAbono;
      } else {
        // Por defecto, si no tiene método de pago, se asume efectivo
        montoEfectivo += montoAbono;
      }
    });
    
    const desglose = {
      montoEfectivo,
      montoTransferencia,
      montoCheque,
      montoDeposito: 0, // Depósito no se usa en órdenes
    };
    const monto = Object.values(desglose).reduce((a,b)=>a+b,0);
    
    return {
      monto,
      montoOrdenes: montoOrdenes,
      montoAbonos: montoAbonos,
      ...desglose
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
        const ordenesContadoIds = new Set(ordenesContadoValidas.map(o => o.id));
        const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
        const ordenesInvalidas = ordenesIds.filter(id => !ordenesContadoIds.has(id));
        if (ordenesInvalidas.length > 0) {
          setError(`Algunas órdenes ya no son elegibles para entrega: ${ordenesInvalidas.join(', ')}. Pueden estar en otra entrega, no pertenecer a esta sede, estar fuera del rango de fechas, o no estar confirmadas (venta: false). Actualiza la selección.`);
          setLoading(false);
          return;
        }
        
        // Validar abonos disponibles (NUEVO) - FILTRAR solo abonos de órdenes con ventaOrden: true
        const abonosDisponiblesValidos = (elegibles?.abonosDisponibles || []).filter(a => a.ventaOrden === true);
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

      // fechaUnica ya está declarada arriba (línea 306), reutilizarla
      const entregaData = {
        sedeId: parseInt(formData.sedeId),
        empleadoId: parseInt(formData.empleadoId),
        fechaEntrega: formData.fechaEntrega || new Date().toISOString().slice(0, 10),
        fechaDesde: fechaUnica, // Misma fecha (solo un día)
        fechaHasta: fechaUnica // Misma fecha (solo un día)
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
              <h3>Seleccionar Órdenes y Abonos</h3>
              
              {loadingOrdenes ? (
                <div className="loading-ordenes">Cargando órdenes y abonos disponibles...</div>
              ) : (
                <>
                  {/* Órdenes a Contado */}
                  {Array.isArray(ordenesDisponibles) && ordenesDisponibles.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ marginBottom: '15px', color: 'var(--color-dark-blue)' }}>Órdenes a Contado</h4>
                      <div style={{ 
                        marginBottom: '10px', 
                        padding: '8px 12px', 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        color: '#1976d2'
                      }}>
                        ℹ️ Solo se muestran órdenes confirmadas (venta: true). Las órdenes pendientes de pago no aparecen aquí.
                      </div>
                      <div className="ordenes-list">
                        {ordenesDisponibles.map(orden => (
                          <div key={orden.id} className="orden-item">
                            <label className="orden-checkbox">
                              <input
                                type="checkbox"
                                name="ordenesIds"
                                value={orden.id}
                                checked={(Array.isArray(formData.ordenesIds) ? formData.ordenesIds : []).includes(orden.id)}
                                onChange={handleChange}
                              />
                              <div className="orden-info">
                                <div className="orden-header">
                                  <span className="orden-numero">#{orden.numero}</span>
                                  <span className="orden-fecha">{orden.fecha}</span>
                                  <span className="orden-total">${orden.total?.toLocaleString()}</span>
                                </div>
                                <div className="orden-cliente">
                                  {orden.clienteNombre || 'Cliente no especificado'}
                                  {orden.clienteNit && <span> - NIT: {orden.clienteNit}</span>}
                                </div>
                                <div className="orden-obra">{orden.obra || 'Obra no especificada'}</div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Abonos Disponibles (NUEVO) */}
                  {Array.isArray(abonosDisponibles) && abonosDisponibles.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ marginBottom: '15px', color: 'var(--color-dark-blue)' }}>Abonos Disponibles (Órdenes a Crédito)</h4>
                      <div style={{ 
                        marginBottom: '10px', 
                        padding: '8px 12px', 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        color: '#1976d2'
                      }}>
                        ℹ️ Solo se muestran abonos de órdenes confirmadas (venta: true). Los abonos de órdenes pendientes de pago no aparecen aquí.
                      </div>
                      <div className="ordenes-list">
                        {abonosDisponibles.map(abono => (
                          <div key={abono.id} className="orden-item">
                            <label className="orden-checkbox">
                              <input
                                type="checkbox"
                                name="abonosIds"
                                value={abono.id}
                                checked={(Array.isArray(formData.abonosIds) ? formData.abonosIds : []).includes(abono.id)}
                                onChange={handleChange}
                              />
                              <div className="orden-info">
                                <div className="orden-header">
                                  <span className="orden-numero">Orden #{abono.numeroOrden}</span>
                                  <span className="orden-fecha">{abono.fechaAbono}</span>
                                  <span className="orden-total">${abono.montoAbono?.toLocaleString()}</span>
                                </div>
                                <div className="orden-cliente">
                                  {abono.clienteNombre || 'Cliente no especificado'}
                                  {abono.clienteNit && <span> - NIT: {abono.clienteNit}</span>}
                                </div>
                                <div className="orden-obra">
                                  Abono de ${abono.montoAbono?.toLocaleString()} 
                                  {abono.montoOrden > 0 && (
                                    <span> (Orden total: ${abono.montoOrden?.toLocaleString()})</span>
                                  )}
                                  {abono.metodoPago && <span> - Método: {abono.metodoPago}</span>}
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje si no hay nada disponible */}
                  {(!Array.isArray(ordenesDisponibles) || ordenesDisponibles.length === 0) &&
                   (!Array.isArray(abonosDisponibles) || abonosDisponibles.length === 0) && (
                    <div className="no-ordenes">
                      No hay órdenes ni abonos disponibles para el período y sede seleccionados
                    </div>
                  )}
                  
                  {/* Resumen de selección */}
                  {(() => {
                    const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
                    const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
                    return ordenesIds.length > 0 || abonosIds.length > 0;
                  })() && (
                    <div className="ordenes-seleccionadas">
                      <strong>
                        {(() => {
                          const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
                          const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
                          return (
                            <>
                              {ordenesIds.length > 0 && `Órdenes: ${ordenesIds.length}`}
                              {ordenesIds.length > 0 && abonosIds.length > 0 && ' | '}
                              {abonosIds.length > 0 && `Abonos: ${abonosIds.length}`}
                            </>
                          );
                        })()}
                      </strong>
                      <div>
                        {totales.montoOrdenes > 0 && <span>Órdenes: ${totales.montoOrdenes.toLocaleString()} | </span>}
                        {totales.montoAbonos > 0 && <span>Abonos: ${totales.montoAbonos.toLocaleString()} | </span>}
                        <strong>Total: ${totales.monto.toLocaleString()}</strong>
                      </div>
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