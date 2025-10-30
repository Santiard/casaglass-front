import React, { useState, useEffect } from 'react';
import EntregasService from '../services/EntregasService';
import './CrearEntregaModal.css';

const CrearEntregaModal = ({ isOpen, onClose, onSuccess, sedes, trabajadores }) => {
  const [formData, setFormData] = useState({
    sedeId: '',
    empleadoId: '',
    fechaEntrega: new Date().toISOString().slice(0, 10),
    fechaDesde: '',
    fechaHasta: '',
    modalidadEntrega: 'EFECTIVO',
    observaciones: '',
    numeroComprobante: '',
    ordenesIds: [],
    gastos: [],
    montoEfectivo: '',
    montoTransferencia: '',
    montoCheque: '',
    montoDeposito: ''
  });

  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
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
      gastos: [],
      montoEfectivo: '',
      montoTransferencia: '',
      montoCheque: '',
      montoDeposito: ''
    });
    setOrdenesDisponibles([]);
    setError('');
    setStep(1);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Cargar órdenes disponibles cuando se seleccionan sede y fechas
  useEffect(() => {
    if (formData.sedeId && formData.fechaDesde && formData.fechaHasta) {
      cargarOrdenesDisponibles();
    } else {
      // Limpiar órdenes si no hay datos completos
      setOrdenesDisponibles([]);
    }
  }, [formData.sedeId, formData.fechaDesde, formData.fechaHasta]);

  const cargarOrdenesDisponibles = async () => {
    try {
      setLoadingOrdenes(true);
      console.log('Cargando órdenes para:', {
        sedeId: formData.sedeId,
        fechaDesde: formData.fechaDesde,
        fechaHasta: formData.fechaHasta
      });
      
      const ordenes = await EntregasService.obtenerOrdenesDisponibles(
        formData.sedeId,
        formData.fechaDesde,
        formData.fechaHasta
      );
      
      console.log('Órdenes recibidas:', ordenes);
      
      // Extraer órdenes de la estructura de respuesta del backend
      let ordenesArray = [];
      if (ordenes && typeof ordenes === 'object') {
        // Combinar órdenes con abonos y órdenes de contado
        const ordenesConAbonos = Array.isArray(ordenes.ordenesConAbonos) ? ordenes.ordenesConAbonos : [];
        const ordenesContado = Array.isArray(ordenes.ordenesContado) ? ordenes.ordenesContado : [];
        const todasLasOrdenes = [...ordenesConAbonos, ...ordenesContado];
        
        // Normalizar los nombres de propiedades
        ordenesArray = todasLasOrdenes.map(orden => ({
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          total: orden.total,
          cliente: orden.clienteNombre || orden.cliente || 'Cliente no especificado',
          obra: orden.obra || orden.descripcion || 'Obra no especificada'
        }));
      } else if (Array.isArray(ordenes)) {
        // Si por alguna razón viene como array directamente
        ordenesArray = ordenes.map(orden => ({
          id: orden.id,
          numero: orden.numero,
          fecha: orden.fecha,
          total: orden.total,
          cliente: orden.clienteNombre || orden.cliente || 'Cliente no especificado',
          obra: orden.obra || orden.descripcion || 'Obra no especificada'
        }));
      }
      
      console.log('Órdenes procesadas (formato final):', ordenesArray);
      console.log('Cantidad de órdenes:', ordenesArray.length);
      setOrdenesDisponibles(ordenesArray);
      
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('Error cargando órdenes disponibles');
      setOrdenesDisponibles([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'ordenesIds') {
      const ordenId = parseInt(value);
      setFormData(prev => ({
        ...prev,
        ordenesIds: checked 
          ? [...prev.ordenesIds, ordenId]
          : prev.ordenesIds.filter(id => id !== ordenId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const agregarGasto = () => {
    const nuevoGasto = {
      id: Date.now(), // ID temporal
      fechaGasto: new Date().toISOString().slice(0, 10),
      monto: 0,
      concepto: '',
      descripcion: '',
      comprobante: '',
      tipo: 'OPERATIVO',
      empleadoId: formData.empleadoId,
      proveedorId: null,
      aprobado: true,
      observaciones: ''
    };

    setFormData(prev => ({
      ...prev,
      gastos: [...prev.gastos, nuevoGasto]
    }));
  };

  const actualizarGasto = (index, campo, valor) => {
    setFormData(prev => ({
      ...prev,
      gastos: prev.gastos.map((gasto, i) => 
        i === index ? { ...gasto, [campo]: valor } : gasto
      )
    }));
  };

  const eliminarGasto = (index) => {
    setFormData(prev => ({
      ...prev,
      gastos: prev.gastos.filter((_, i) => i !== index)
    }));
  };

  const calcularTotales = () => {
    // Asegurar que ordenesDisponibles sea un array
    const ordenes = Array.isArray(ordenesDisponibles) ? ordenesDisponibles : [];
    
    const ordenesSeleccionadas = ordenes.filter(orden => 
      formData.ordenesIds.includes(orden.id)
    );
    
    const montoOrdenes = ordenesSeleccionadas.reduce((sum, orden) => sum + (orden.total || 0), 0);
    const montoGastos = Array.isArray(formData.gastos) 
      ? formData.gastos.reduce((sum, gasto) => sum + (parseFloat(gasto.monto) || 0), 0)
      : 0;
    
    const desglose = {
      montoEfectivo: parseFloat(formData.montoEfectivo) || 0,
      montoTransferencia: parseFloat(formData.montoTransferencia) || 0,
      montoCheque: parseFloat(formData.montoCheque) || 0,
      montoDeposito: parseFloat(formData.montoDeposito) || 0,
    };
    const montoEntregado = Object.values(desglose).reduce((a,b)=>a+b,0);
    return {
      montoEsperado: montoOrdenes,
      montoGastos: montoGastos,
      montoEntregado,
      ...desglose
    };
  };

  const validarStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return formData.sedeId && formData.empleadoId && formData.fechaDesde && formData.fechaHasta;
      case 2:
        return formData.ordenesIds.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit llamado en step:', step);
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
        const elegiblesIds = new Set([
          ...((elegibles?.ordenesContado || []).map(o => o.id)),
          ...((elegibles?.ordenesConAbonos || []).map(o => o.id)),
        ]);
        const invalidas = (formData.ordenesIds || []).filter(id => !elegiblesIds.has(id));
        if (invalidas.length > 0) {
          setError(`Algunas órdenes ya no son elegibles para entrega: ${invalidas.join(', ')}. Actualiza la selección.`);
          setLoading(false);
          return;
        }
      } catch (revalErr) {
        console.warn('No se pudo revalidar órdenes disponibles antes de crear.', revalErr);
        // Continuar, backend validará también
      }

      const entregaData = {
        ...formData,
        ...totales,
        modalidadEntrega,
        sedeId: parseInt(formData.sedeId),
        empleadoId: parseInt(formData.empleadoId),
        gastos: formData.gastos.map(gasto => ({
          ...gasto,
          monto: Math.max(0, parseFloat(gasto.monto) || 0),
          empleadoId: parseInt(formData.empleadoId)
        }))
      };

      // Validación: suma de desgloses debe igualar montoEntregado
      const sumaDesglose = (parseFloat(entregaData.montoEfectivo)||0)
        + (parseFloat(entregaData.montoTransferencia)||0)
        + (parseFloat(entregaData.montoCheque)||0)
        + (parseFloat(entregaData.montoDeposito)||0);
      if (Math.abs(sumaDesglose - entregaData.montoEntregado) > 0.01) {
        setError('La suma de Efectivo+Transferencia+Cheque+Depósito debe igualar el Monto a Entregar');
        setLoading(false);
        return;
      }

      console.log('Enviando entrega:', entregaData);
      
      const respuesta = await EntregasService.crearEntrega(entregaData);
      console.log('Respuesta del backend:', respuesta);

      // Aviso de diferencia si aplica
      const ent = respuesta?.entrega || respuesta;
      const neto = (Number(ent?.montoEsperado)||0) - (Number(ent?.montoGastos)||0);
      const diff = neto - (Number(ent?.montoEntregado)||0);
      if (Math.abs(diff) > 0.01) {
        alert(`Aviso: La diferencia de la entrega es ${diff.toLocaleString('es-CO', {style:'currency', currency:'COP'})}.\nRevisa y ajusta los montos por método (PUT /entregas-dinero/{id}) antes de confirmar.`);
      }

      if (onSuccess) onSuccess(respuesta);
      onClose();
      
    } catch (err) {
      console.error('Error creando entrega:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error creando entrega: ${errorMessage}`);
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
                    placeholder="Opcional"
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

          {/* Step 2: Órdenes */}
          {step === 2 && (
            <div className="form-step">
              <h3>Seleccionar Órdenes</h3>
              
              {loadingOrdenes ? (
                <div className="loading-ordenes">Cargando órdenes disponibles...</div>
              ) : !Array.isArray(ordenesDisponibles) || ordenesDisponibles.length === 0 ? (
                <div className="no-ordenes">
                  No hay órdenes disponibles para el período y sede seleccionados
                </div>
              ) : (
                <div className="ordenes-list">
                  {ordenesDisponibles.map(orden => (
                    <div key={orden.id} className="orden-item">
                      <label className="orden-checkbox">
                        <input
                          type="checkbox"
                          name="ordenesIds"
                          value={orden.id}
                          checked={formData.ordenesIds.includes(orden.id)}
                          onChange={handleChange}
                        />
                        <div className="orden-info">
                          <div className="orden-header">
                            <span className="orden-numero">#{orden.numero}</span>
                            <span className="orden-fecha">{orden.fecha}</span>
                            <span className="orden-total">${orden.total?.toLocaleString()}</span>
                          </div>
                          <div className="orden-cliente">{orden.cliente}</div>
                          <div className="orden-obra">{orden.obra}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.ordenesIds.length > 0 && (
                <div className="ordenes-seleccionadas">
                  <strong>Órdenes seleccionadas: {formData.ordenesIds.length}</strong>
                  <div>Total: ${totales.montoEsperado.toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Gastos */}
          {step === 3 && (
            <div className="form-step">
              <div className="gastos-header">
                <h3>Gastos Asociados</h3>
                <button type="button" className="btn-agregar-gasto" onClick={agregarGasto}>
                  + Agregar Gasto
                </button>
              </div>
              
              {formData.gastos.length === 0 ? (
                <div className="no-gastos">No hay gastos registrados</div>
              ) : (
                <div className="gastos-list">
                  {formData.gastos.map((gasto, index) => (
                    <div key={gasto.id} className="gasto-item">
                      <div className="gasto-form">
                        <input
                          type="date"
                          value={gasto.fechaGasto}
                          onChange={(e) => actualizarGasto(index, 'fechaGasto', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Monto"
                          value={gasto.monto}
                          onChange={(e) => actualizarGasto(index, 'monto', e.target.value)}
                        />
                        <select
                          value={gasto.tipo}
                          onChange={(e) => actualizarGasto(index, 'tipo', e.target.value)}
                        >
                          <option value="OPERATIVO">Operativo</option>
                          <option value="COMBUSTIBLE">Combustible</option>
                          <option value="MANTENIMIENTO">Mantenimiento</option>
                          <option value="ALIMENTACION">Alimentación</option>
                          <option value="TRANSPORTE">Transporte</option>
                          <option value="OTRO">Otro</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Concepto"
                          value={gasto.concepto}
                          onChange={(e) => actualizarGasto(index, 'concepto', e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="btn-eliminar-gasto"
                          onClick={() => eliminarGasto(index)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Resumen final */}
              <div className="resumen-entrega">
                <h4>Resumen de Entrega</h4>
                <div className="desglose-entrega">
                  <div className="desglose-row">
                    <label>Efectivo</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoEfectivo} min="0" step="0.01"
                      onChange={(e)=>setFormData(prev=>({...prev, montoEfectivo: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Transferencia</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoTransferencia} min="0" step="0.01"
                      onChange={(e)=>setFormData(prev=>({...prev, montoTransferencia: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Cheque</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoCheque} min="0" step="0.01"
                      onChange={(e)=>setFormData(prev=>({...prev, montoCheque: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                  <div className="desglose-row">
                    <label>Depósito</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={formData.montoDeposito} min="0" step="0.01"
                      onChange={(e)=>setFormData(prev=>({...prev, montoDeposito: e.target.value.replace(/[^0-9.,-]/g,'')}))} />
                  </div>
                </div>
                <div className="resumen-item">
                  <span>Total Órdenes:</span>
                  <span>${totales.montoEsperado.toLocaleString()}</span>
                </div>
                <div className="resumen-item">
                  <span>Total Gastos:</span>
                  <span>-${totales.montoGastos.toLocaleString()}</span>
                </div>
                <div className="resumen-item total">
                  <span><strong>Monto a Entregar:</strong></span>
                  <span><strong>${totales.montoEntregado.toLocaleString()}</strong></span>
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
                  console.log('Navegando al paso:', step + 1);
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