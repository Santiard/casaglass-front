import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import './CrearEntregaModal.css';
import { useToast } from '../context/ToastContext.jsx';

const CrearEntregaModal = ({ isOpen, onClose, onSuccess, sedes, trabajadores }) => {
  const { showWarning } = useToast();
  const [formData, setFormData] = useState({
    sedeId: '',
    empleadoId: '',
    fechaEntrega: new Date().toISOString().slice(0, 10),
    fechaDesde: '',
    fechaHasta: '',
    modalidadEntrega: 'EFECTIVO',
    observaciones: '',
    numeroComprobante: '',
    ordenesIds: [], // IDs de órdenes a contado
    abonosIds: [], // IDs de abonos individuales (NUEVO)
    gastoIds: [], // IDs de gastos seleccionados
    montoEfectivo: '',
    montoTransferencia: '',
    montoCheque: '',
    montoDeposito: ''
  });

  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [abonosDisponibles, setAbonosDisponibles] = useState([]); // Abonos disponibles (NUEVO)
  const [gastosDisponibles, setGastosDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Datos básicos, 2: Órdenes, 3: Gastos

  const resetForm = () => {
    setFormData({
      sedeId: '',
      empleadoId: '',
      fechaEntrega: new Date().toISOString().slice(0, 10),
      fechaDesde: '',
      fechaHasta: '',
      modalidadEntrega: 'EFECTIVO',
      observaciones: '',
      numeroComprobante: '',
      ordenesIds: [],
      gastoIds: [],
      montoEfectivo: '',
      montoTransferencia: '',
      montoCheque: '',
      montoDeposito: ''
    });
    setOrdenesDisponibles([]);
    setAbonosDisponibles([]);
    setGastosDisponibles([]);
    setError('');
    setStep(1);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Generar número de comprobante automáticamente
      generarNumeroComprobante();
    }
  }, [isOpen]);

  const generarNumeroComprobante = async () => {
    try {
      const numeroComprobante = await EntregasService.obtenerSiguienteNumeroComprobante();
      setFormData(prev => ({
        ...prev,
        numeroComprobante: numeroComprobante
      }));
    } catch (error) {
      console.error('Error generando número de comprobante:', error);
      // En caso de error, usar un número basado en timestamp
      const fallback = `ENT-${Date.now()}`;
      setFormData(prev => ({
        ...prev,
        numeroComprobante: fallback
      }));
    }
  };

  // Cargar órdenes disponibles cuando se seleccionan sede y fechas
  useEffect(() => {
    if (formData.sedeId && formData.fechaDesde && formData.fechaHasta) {
      cargarOrdenesDisponibles();
    } else {
      // Limpiar órdenes si no hay datos completos
      setOrdenesDisponibles([]);
    }
  }, [formData.sedeId, formData.fechaDesde, formData.fechaHasta]);

  // Cargar gastos disponibles cuando se selecciona la sede
  useEffect(() => {
    if (formData.sedeId) {
      cargarGastosDisponibles();
    } else {
      setGastosDisponibles([]);
    }
  }, [formData.sedeId]);

  const cargarGastosDisponibles = async () => {
    try {
      setLoadingGastos(true);
      setError('');
      const gastos = await EntregasService.obtenerGastosDisponibles(formData.sedeId);
      setGastosDisponibles(Array.isArray(gastos) ? gastos : []);
    } catch (err) {
      console.error('Error cargando gastos disponibles:', err);
      setError('Error cargando gastos disponibles');
      setGastosDisponibles([]);
    } finally {
      setLoadingGastos(false);
    }
  };

  const cargarOrdenesDisponibles = async () => {
    try {
      setLoadingOrdenes(true);
      const ordenes = await EntregasService.obtenerOrdenesDisponibles(
        formData.sedeId,
        formData.fechaDesde,
        formData.fechaHasta
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
          venta: orden.venta !== undefined ? orden.venta : true // Asegurar que venta esté presente
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
      
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('Error cargando órdenes disponibles');
      setOrdenesDisponibles([]);
      setAbonosDisponibles([]);
    } finally {
      setLoadingOrdenes(false);
    }
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
    } else if (name === 'gastoIds') {
      const gastoId = parseInt(value);
      setFormData(prev => {
        const gastoIds = Array.isArray(prev.gastoIds) ? prev.gastoIds : [];
        return {
          ...prev,
          gastoIds: checked 
            ? [...gastoIds, gastoId]
            : gastoIds.filter(id => id !== gastoId)
        };
      });
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
    
    // Monto esperado total = órdenes a contado + abonos
    const montoEsperadoTotal = montoOrdenes + montoAbonos;
    
    // Calcular monto de gastos seleccionados
    const gastosSeleccionados = gastosDisponibles.filter(gasto => 
      formData.gastoIds.includes(gasto.id)
    );
    const montoGastos = gastosSeleccionados.reduce((sum, gasto) => sum + (parseFloat(gasto.monto) || 0), 0);
    
    const desglose = {
      montoEfectivo: parseFloat(formData.montoEfectivo) || 0,
      montoTransferencia: parseFloat(formData.montoTransferencia) || 0,
      montoCheque: parseFloat(formData.montoCheque) || 0,
      montoDeposito: parseFloat(formData.montoDeposito) || 0,
    };
    const montoEntregado = Object.values(desglose).reduce((a,b)=>a+b,0);
    
    // Monto Neto Esperado = Monto Esperado - Monto Gastos
    const montoNetoEsperado = montoEsperadoTotal - montoGastos;
    
    return {
      montoEsperado: montoEsperadoTotal,
      montoOrdenes: montoOrdenes,
      montoAbonos: montoAbonos,
      montoGastos: montoGastos,
      montoNetoEsperado: montoNetoEsperado,
      montoEntregado,
      ...desglose
    };
  };

  const validarStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return formData.sedeId && formData.empleadoId && formData.fechaDesde && formData.fechaHasta;
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

    // Validar rango de fechas
    if (formData.fechaDesde > formData.fechaHasta) {
      setError('El rango de fechas es inválido: "Desde" debe ser menor o igual que "Hasta"');
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
        const elegibles = await EntregasService.obtenerOrdenesDisponibles(
          formData.sedeId,
          formData.fechaDesde,
          formData.fechaHasta
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

      // Validar gastos seleccionados
      if (formData.gastoIds.length > 0) {
        try {
          // Recargar gastos disponibles para verificar que sigan disponibles
          const gastosDisponiblesActuales = await EntregasService.obtenerGastosDisponibles(formData.sedeId);
          const gastosDisponiblesIds = new Set(gastosDisponiblesActuales.map(g => g.id));
          const gastosInvalidos = formData.gastoIds.filter(id => !gastosDisponiblesIds.has(id));
          
          if (gastosInvalidos.length > 0) {
            setError(`Algunos gastos ya no están disponibles: ${gastosInvalidos.join(', ')}. Pueden estar asociados a otra entrega o no estar aprobados. Actualiza la selección.`);
            setLoading(false);
            return;
          }

          // Verificar que los gastos pertenezcan a la sede seleccionada
          const gastosDeOtraSede = gastosDisponiblesActuales
            .filter(g => formData.gastoIds.includes(g.id) && g.sede?.id !== parseInt(formData.sedeId))
            .map(g => g.id);
          
          if (gastosDeOtraSede.length > 0) {
            setError(`Algunos gastos no pertenecen a la sede seleccionada: ${gastosDeOtraSede.join(', ')}.`);
            setLoading(false);
            return;
          }
        } catch (gastosErr) {
          console.warn('No se pudo revalidar gastos disponibles antes de crear.', gastosErr);
          // Continuar, backend validará también
        }
      }

      // Asegurar que el número de comprobante esté generado
      let numeroComprobante = formData.numeroComprobante?.trim();
      if (!numeroComprobante) {
        numeroComprobante = await EntregasService.obtenerSiguienteNumeroComprobante();
      }

      const entregaData = {
        sedeId: parseInt(formData.sedeId),
        empleadoId: parseInt(formData.empleadoId),
        fechaEntrega: formData.fechaEntrega || new Date().toISOString().slice(0, 10),
        fechaDesde: formData.fechaDesde,
        fechaHasta: formData.fechaHasta,
        numeroComprobante: numeroComprobante
      };

      // Campos opcionales - solo agregar si tienen valor
      const ordenesIds = Array.isArray(formData.ordenesIds) ? formData.ordenesIds : [];
      const abonosIds = Array.isArray(formData.abonosIds) ? formData.abonosIds : [];
      
      if (ordenesIds.length > 0) {
        entregaData.ordenesIds = ordenesIds;
      }
      if (abonosIds.length > 0) {
        entregaData.abonosIds = abonosIds; // NUEVO
      }
      if (formData.gastoIds.length > 0) {
        entregaData.gastosIds = formData.gastoIds;
      }
      if (modalidadEntrega && modalidadEntrega !== 'EFECTIVO') {
        entregaData.modalidadEntrega = modalidadEntrega;
      }
      if (formData.observaciones?.trim()) {
        entregaData.observaciones = formData.observaciones.trim();
      }

      // Desgloses de métodos de pago (opcionales, normalmente 0 al crear)
      const montoEfectivo = parseFloat(formData.montoEfectivo) || 0;
      const montoTransferencia = parseFloat(formData.montoTransferencia) || 0;
      const montoCheque = parseFloat(formData.montoCheque) || 0;
      const montoDeposito = parseFloat(formData.montoDeposito) || 0;
      const montoEntregado = montoEfectivo + montoTransferencia + montoCheque + montoDeposito;

      // Solo incluir desgloses si hay algún valor mayor a 0
      if (montoEntregado > 0) {
        entregaData.montoEntregado = montoEntregado;
        entregaData.montoEfectivo = montoEfectivo;
        entregaData.montoTransferencia = montoTransferencia;
        entregaData.montoCheque = montoCheque;
        entregaData.montoDeposito = montoDeposito;
      }
      
      // Nota: El montoEntregado se registra cuando se confirma la entrega, no al crearla
      // Los desgloses (efectivo, transferencia, etc.) se pueden actualizar después con PUT /entregas-dinero/{id}

      const respuesta = await EntregasService.crearEntrega(entregaData);

      // Aviso de diferencia si aplica
      // Diferencia = (Monto Esperado - Monto Gastos) - Monto Entregado
      const ent = respuesta?.entrega || respuesta;
      const montoNetoEsperado = (Number(ent?.montoEsperado)||0) - (Number(ent?.montoGastos)||0);
      const diff = montoNetoEsperado - (Number(ent?.montoEntregado)||0);
      if (Math.abs(diff) > 0.01) {
        showWarning(`Aviso: La diferencia de la entrega es ${diff.toLocaleString('es-CO', {style:'currency', currency:'COP'})}.\nRevisa y ajusta los montos por método (PUT /entregas-dinero/{id}) antes de confirmar.`);
      }

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

        <div className="modal-steps">
          <div className={`step ${step === 1 ? 'active' : ''} ${validarStep(1) ? 'completed' : ''}`}>
            1. Datos Básicos
          </div>
          <div className={`step ${step === 2 ? 'active' : ''} ${validarStep(2) ? 'completed' : ''}`}>
            2. Órdenes
          </div>
          <div className={`step ${step === 3 ? 'active' : ''}`}>
            3. Gastos
          </div>
        </div>

        <form onSubmit={handleSubmit} className="crear-entrega-form">
          
          {/* Step 1: Datos Básicos */}
          {step === 1 && (
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

                <div className="form-group">
                  <label>Fecha de Entrega</label>
                  <input
                    type="date"
                    name="fechaEntrega"
                    value={formData.fechaEntrega}
                    onChange={handleChange}
                  />
                </div>

                {/* Modalidad se infiere del desglose; si hay más de un método > 0, será MIXTO */}

                <div className="form-group span-2">
                  <label>Período de Órdenes *</label>
                  <div className="date-range">
                    <input
                      type="date"
                      name="fechaDesde"
                      value={formData.fechaDesde}
                      onChange={handleChange}
                      placeholder="Desde"
                      required
                    />
                    <span>hasta</span>
                    <input
                      type="date"
                      name="fechaHasta"
                      value={formData.fechaHasta}
                      onChange={handleChange}
                      placeholder="Hasta"
                      required
                    />
                  </div>
                </div>

                <div className="form-group span-2">
                  <label>Número de Comprobante</label>
                  <input
                    type="text"
                    name="numeroComprobante"
                    value={formData.numeroComprobante}
                    onChange={handleChange}
                    placeholder="Se genera automáticamente"
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    title="Número generado automáticamente"
                  />
                </div>

                <div className="form-group span-2">
                  <label>Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Órdenes y Abonos */}
          {step === 2 && (
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
                        <strong>Total: ${totales.montoEsperado.toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Gastos */}
          {step === 3 && (
            <div className="form-step">
              <div className="gastos-header">
                <h3>Seleccionar Gastos Aprobados</h3>
                <small>Selecciona los gastos aprobados que deseas incluir en esta entrega</small>
              </div>
              
              {loadingGastos ? (
                <div className="loading-ordenes">Cargando gastos disponibles...</div>
              ) : !Array.isArray(gastosDisponibles) || gastosDisponibles.length === 0 ? (
                <div className="no-gastos">
                  No hay gastos aprobados disponibles para esta sede. Los gastos deben ser creados y aprobados primero.
                </div>
              ) : (
                <div className="ordenes-list">
                  {gastosDisponibles.map(gasto => (
                    <div key={gasto.id} className="orden-item">
                      <label className="orden-checkbox">
                        <input
                          type="checkbox"
                          name="gastoIds"
                          value={gasto.id}
                          checked={formData.gastoIds.includes(gasto.id)}
                          onChange={handleChange}
                        />
                        <div className="orden-info">
                          <div className="orden-header">
                            <span className="orden-numero">#{gasto.id}</span>
                            <span className="orden-fecha">{gasto.fechaGasto || '-'}</span>
                            <span className="orden-total">${(gasto.monto || 0).toLocaleString()}</span>
                          </div>
                          <div className="orden-cliente">{gasto.concepto || gasto.descripcion || 'Sin concepto'}</div>
                          <div className="orden-obra">
                            Tipo: {gasto.tipo || 'OPERATIVO'}
                            {gasto.sede?.nombre && <span> | Sede: {gasto.sede.nombre}</span>}
                            {gasto.empleado?.nombre && <span> | Empleado: {gasto.empleado.nombre}</span>}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.gastoIds.length > 0 && (
                <div className="ordenes-seleccionadas">
                  <strong>Gastos seleccionados: {formData.gastoIds.length}</strong>
                  <div>Total: ${totales.montoGastos.toLocaleString()}</div>
                </div>
              )}
              
              {/* Resumen final */}
              <div className="resumen-entrega">
                <h4>Resumen de Entrega</h4>
                <div className="desglose-entrega">
                  <div className="desglose-row">
                    <label>Efectivo</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoEfectivo} min="0" step="any"
                      onChange={(e)=>setFormData(prev=>({...prev, montoEfectivo: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Transferencia</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoTransferencia} min="0" step="any"
                      onChange={(e)=>setFormData(prev=>({...prev, montoTransferencia: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Cheque</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoCheque} min="0" step="any"
                      onChange={(e)=>setFormData(prev=>({...prev, montoCheque: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Depósito</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoDeposito} min="0" step="any"
                      onChange={(e)=>setFormData(prev=>({...prev, montoDeposito: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
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
                <div className="resumen-item">
                  <span>Total Órdenes + Abonos (Monto Esperado):</span>
                  <span>${totales.montoEsperado.toLocaleString()}</span>
                </div>
                <div className="resumen-item">
                  <span>Total Gastos:</span>
                  <span>-${totales.montoGastos.toLocaleString()}</span>
                </div>
                <div className="resumen-item">
                  <span>Monto Neto Esperado:</span>
                  <span>${totales.montoNetoEsperado.toLocaleString()}</span>
                </div>
                <div className="resumen-item">
                  <span>Monto Entregado:</span>
                  <span>${totales.montoEntregado.toLocaleString()}</span>
                </div>
                <div className="resumen-item total">
                  <span><strong>Diferencia:</strong></span>
                  <span><strong>${(totales.montoNetoEsperado - totales.montoEntregado).toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="modal-actions">
            {step > 1 && (
              <button 
                type="button" 
                className="btn-anterior"
                onClick={() => setStep(step - 1)}
              >
                Anterior
              </button>
            )}
            
            {step < 3 ? (
              <button 
                type="button" 
                className="btn-siguiente"
                onClick={(e) => {
                  e.preventDefault();
                  setStep(step + 1);
                }}
                disabled={!validarStep(step)}
              >
                Siguiente
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn-crear"
                disabled={loading || !validarStep(1) || !validarStep(2)}
              >
                {loading ? 'Creando...' : 'Crear Entrega'}
              </button>
            )}
            
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearEntregaModal;