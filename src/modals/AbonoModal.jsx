import React, { useState, useEffect } from 'react';
import { listarBancos } from '../services/BancosService.js';
import { api } from '../lib/api.js';
import { listarClientes } from '../services/ClientesService.js';
import { listarOrdenesCredito, actualizarOrden } from '../services/OrdenesService.js';
import { getBusinessSettings } from '../services/businessSettingsService.js';
import { listarSedes } from '../services/SedesService.js';
import { getTodayLocalDate } from '../lib/dateUtils.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/CrudModal.css';
import './AbonoModal.css';

const AbonoModal = ({ isOpen, onClose, credito, onSuccess }) => {
  const { sedeId: sedeIdUsuario } = useAuth();
  
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearch, setClienteSearch] = useState(""); // Búsqueda de cliente
  const [clienteSearchModal, setClienteSearchModal] = useState(""); // Búsqueda dentro del modal
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [ordenesCredito, setOrdenesCredito] = useState([]);
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState(new Set());
  const [distribucion, setDistribucion] = useState([]); // [{ ordenId, montoAbono, saldoRestante }]
  const [retenSettings, setReteSettings] = useState({ ivaRate: 19, retefuenteRate: 2.5, retefuenteThreshold: 1000000 });
  const [retenLoading, setReteLoading] = useState(false);
  const [retenError, setReteError] = useState("");
  const [sedes, setSedes] = useState([]);
  // Cargar settings de negocio (IVA, retefuente, umbral) al abrir modal
  useEffect(() => {
    if (isOpen) {
      setReteLoading(true);
      getBusinessSettings().then(setReteSettings).catch(() => {}).finally(() => setReteLoading(false));
    }
  }, [isOpen]);

  // Cargar sedes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      listarSedes().then(sedesData => {
        setSedes(sedesData || []);
      }).catch(() => {
        setSedes([]);
      });
    }
  }, [isOpen]);
  // Helper para calcular retención e IVA
  const calcularRetencionYIva = (orden) => {
    const { ivaRate, retefuenteRate, retefuenteThreshold } = retenSettings;
    const total = orden.total || 0;
    // Calcular IVA si no está
    const iva = orden.iva !== undefined ? orden.iva : Math.round(total * (ivaRate / (100 + ivaRate)));
    // Subtotal sin IVA
    const subtotal = total - iva;
    // Calcular retención si supera umbral
    let retencionFuente = 0;
    let tieneRetencionFuente = false;
    if (subtotal >= retefuenteThreshold) {
      retencionFuente = Math.round(subtotal * (retefuenteRate / 100));
      tieneRetencionFuente = true;
    }
    return { iva, subtotal, retencionFuente, tieneRetencionFuente };
  };
  // Handler para marcar/desmarcar retención en una orden
  const handleToggleRetencion = async (orden) => {
    setReteError("");
    if (!orden) return;
    const { iva, subtotal, retencionFuente, tieneRetencionFuente } = calcularRetencionYIva(orden);
    if (subtotal < retenSettings.retefuenteThreshold) {
      setReteError("La orden no supera el umbral para aplicar retención.");
      return;
    }
    try {
      setReteLoading(true);
      
      // Primero actualizar el estado local ANTES del PUT (optimistic update)
      const ordenIndex = ordenesCredito.findIndex(o => o.id === orden.id);
      if (ordenIndex === -1) {
        setReteError("Orden no encontrada");
        return;
      }
      
      const nuevoEstadoRetencion = !orden.tieneRetencionFuente;
      const nuevoValorRetencion = nuevoEstadoRetencion ? retencionFuente : 0;
      
      // Actualizar INMEDIATAMENTE el estado local sin esperar el backend
      setOrdenesCredito(prev => {
        const newArray = [...prev];
        newArray[ordenIndex] = {
          ...newArray[ordenIndex],
          tieneRetencionFuente: nuevoEstadoRetencion,
          retencionFuente: nuevoValorRetencion,
          iva: iva
        };
        return newArray;
      });
      
      // Ahora hacer el PUT al backend (en background)
      await actualizarOrden(orden.id, {
        ...orden,
        tieneRetencionFuente: nuevoEstadoRetencion,
        retencionFuente: nuevoValorRetencion,
        iva,
      });
      
      // Si el PUT fue exitoso, no hacemos nada más (ya actualizamos el estado)
      // Si falla, revertimos en el catch
      
    } catch (err) {
      // Revertir el cambio optimista si el PUT falla
      setOrdenesCredito(prev => {
        const newArray = [...prev];
        const ordenIndex = newArray.findIndex(o => o.id === orden.id);
        if (ordenIndex !== -1) {
          newArray[ordenIndex] = {
            ...newArray[ordenIndex],
            tieneRetencionFuente: orden.tieneRetencionFuente, // Revertir al valor original
            retencionFuente: orden.retencionFuente,
            iva: orden.iva
          };
        }
        return newArray;
      });
      setReteError("Error actualizando retención: " + (err?.message || ""));
    } finally {
      setReteLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    montoTotal: '',
    fecha: getTodayLocalDate(),
    factura: '',
    sedeId: sedeIdUsuario || '' // Sede del usuario por defecto
  });
  
  // Array de métodos de pago: [{ tipo: "EFECTIVO", monto: 50000, banco: "" }, ...]
  const [metodosPago, setMetodosPago] = useState([]);
  const [observacionesAdicionales, setObservacionesAdicionales] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  const [error, setError] = useState('');

  // Lista de bancos (dinámica desde API)
  const [bancos, setBancos] = useState([]);
  // Cargar bancos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      listarBancos().then((bancosData) => {
        setBancos(Array.isArray(bancosData) ? bancosData : []);
      }).catch((err) => {
        setBancos([]);
      });
    }
  }, [isOpen]);

  // Métodos de pago disponibles
  const tiposMetodoPago = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "NEQUI", label: "Nequi" },
    { value: "DAVIPLATA", label: "Daviplata" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "OTRO", label: "Otro" }
  ];

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const cargarClientes = async () => {
        try {
          const clientesData = await listarClientes();
          setClientes(clientesData);
          
          // Si viene un crédito, preseleccionar el cliente
          if (credito?.cliente?.id) {
            const cliente = clientesData.find(c => c.id === credito.cliente.id);
            if (cliente) {
              setClienteSeleccionado(cliente);
              setClienteSearch(cliente.nombre);
            }
          }
        } catch (err) {
          // console.error("Error cargando clientes:", err);
        }
      };
      cargarClientes();
    }
  }, [isOpen, credito]);

  // Cargar órdenes a crédito del cliente seleccionado
  useEffect(() => {
    
    if (isOpen && clienteSeleccionado?.id) {
      cargarOrdenesCredito(clienteSeleccionado.id);
    } else if (!clienteSeleccionado?.id && isOpen) {
      // Solo limpiar si realmente no hay cliente seleccionado Y el modal está abierto
      setOrdenesCredito([]);
      setOrdenesSeleccionadas(new Set());
      setDistribucion([]);
    }
  }, [isOpen, clienteSeleccionado?.id]); // Usar clienteSeleccionado?.id en lugar del objeto completo

  const cargarOrdenesCredito = async (clienteId) => {
    setLoadingOrdenes(true);
    try {
      // Usar el nuevo endpoint que devuelve solo órdenes a crédito con creditoDetalle
      const ordenes = await listarOrdenesCredito(clienteId);
      
      // El endpoint ya filtra solo órdenes a crédito con saldo pendiente
      // Pero por seguridad, filtramos las que tienen saldo > 0
      const ordenesConSaldo = ordenes.filter(orden => {
        return orden.creditoDetalle?.saldoPendiente > 0;
      });
      
      setOrdenesCredito(ordenesConSaldo);
      setOrdenesSeleccionadas(new Set());
      setDistribucion([]);
    } catch (err) {
      // console.error("Error cargando órdenes a crédito:", err);
      setError('Error cargando órdenes a crédito del cliente');
      setOrdenesCredito([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  // Calcular distribución automática cuando cambia el monto total o las órdenes seleccionadas
  useEffect(() => {
    if (formData.montoTotal && ordenesSeleccionadas.size > 0) {
      calcularDistribucion();
    } else {
      setDistribucion([]);
    }
  }, [formData.montoTotal, ordenesSeleccionadas]);

  const calcularDistribucion = () => {
    const montoTotal = parseFloat(formData.montoTotal) || 0;
    if (montoTotal <= 0) {
      setDistribucion([]);
      return;
    }

    // Obtener las órdenes seleccionadas con su información
    const ordenesSeleccionadasArray = Array.from(ordenesSeleccionadas)
      .map(ordenId => ordenesCredito.find(o => o.id === ordenId))
      .filter(Boolean)
      .sort((a, b) => {
        // Ordenar por fecha (más antiguas primero) o por saldo (menor primero)
        const fechaA = new Date(a.fecha || 0);
        const fechaB = new Date(b.fecha || 0);
        return fechaA - fechaB;
      });

    const nuevaDistribucion = [];
    let montoDisponible = montoTotal;

    for (const orden of ordenesSeleccionadasArray) {
      const saldoPendiente = orden.creditoDetalle?.saldoPendiente || 0;
      
      if (montoDisponible <= 0) {
        // Si no hay más dinero disponible, no se abona nada a esta orden
        nuevaDistribucion.push({
          ordenId: orden.id,
          ordenNumero: orden.numero,
          ordenFecha: orden.fecha,
          saldoPendiente: saldoPendiente,
          montoAbono: 0,
          saldoRestante: saldoPendiente
        });
      } else if (montoDisponible >= saldoPendiente) {
        // Si el monto disponible es mayor o igual al saldo, se abona todo el saldo
        nuevaDistribucion.push({
          ordenId: orden.id,
          ordenNumero: orden.numero,
          ordenFecha: orden.fecha,
          saldoPendiente: saldoPendiente,
          montoAbono: saldoPendiente,
          saldoRestante: 0
        });
        montoDisponible -= saldoPendiente;
      } else {
        // Si el monto disponible es menor al saldo, se abona solo lo disponible
        nuevaDistribucion.push({
          ordenId: orden.id,
          ordenNumero: orden.numero,
          ordenFecha: orden.fecha,
          saldoPendiente: saldoPendiente,
          montoAbono: montoDisponible,
          saldoRestante: saldoPendiente - montoDisponible
        });
        montoDisponible = 0;
      }
    }

    setDistribucion(nuevaDistribucion);
  };

  const toggleOrdenSeleccionada = (ordenId) => {
    const nuevasSeleccionadas = new Set(ordenesSeleccionadas);
    if (nuevasSeleccionadas.has(ordenId)) {
      nuevasSeleccionadas.delete(ordenId);
    } else {
      nuevasSeleccionadas.add(ordenId);
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

  // Función para construir la descripción completa (string estructurado)
  const construirDescripcion = (metodosArray, observaciones) => {
    if (metodosArray.length === 0) {
      return observaciones || "";
    }

    let descripcionCompleta = "";
    
    const esMixto = metodosArray.length > 1;
    const tipoPrincipal = esMixto ? "MIXTO" : metodosArray[0].tipo;
    
    descripcionCompleta = `Método de pago: ${tipoPrincipal}`;
    
    const efectivo = metodosArray.filter(m => m.tipo === "EFECTIVO");
    const transferencias = metodosArray.filter(m => m.tipo === "TRANSFERENCIA");
    const cheques = metodosArray.filter(m => m.tipo === "CHEQUE");
    const otros = metodosArray.filter(m => !["EFECTIVO", "TRANSFERENCIA", "CHEQUE"].includes(m.tipo));
    
    if (efectivo.length > 0) {
      const totalEfectivo = efectivo.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
      if (totalEfectivo > 0) {
        descripcionCompleta += `\nEfectivo: $${totalEfectivo.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
    }
    
    if (transferencias.length > 0) {
      transferencias.forEach((transf) => {
        if (transf.banco && transf.monto > 0) {
          const montoFormateado = transf.monto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          descripcionCompleta += `\nTransferencia: ${transf.banco} - Monto: $${montoFormateado}`;
        }
      });
    }
    
    if (cheques.length > 0) {
      cheques.forEach((cheque) => {
        if (cheque.monto > 0) {
          const montoFormateado = cheque.monto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          descripcionCompleta += `\nCheque: $${montoFormateado}`;
        }
      });
    }
    
    if (otros.length > 0) {
      otros.forEach((otro) => {
        if (otro.monto > 0) {
          const montoFormateado = otro.monto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          descripcionCompleta += `\n${otro.tipo}: $${montoFormateado}`;
        }
      });
    }
    
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

  const resetForm = () => {
    setFormData({
      montoTotal: '',
      fecha: getTodayLocalDate(),
      factura: '',
      sedeId: sedeIdUsuario || '' // Restablecer sede del usuario
    });
    setMetodosPago([]);
    setObservacionesAdicionales("");
    setClienteSeleccionado(null);
    setClienteSearch("");
    setClienteSearchModal("");
    setShowClienteModal(false);
    setOrdenesSeleccionadas(new Set());
    setDistribucion([]);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = (type === 'text' && name !== 'fecha') ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    const montoTotal = parseFloat(formData.montoTotal);
    const hoy = getTodayLocalDate();
    
    if (isNaN(montoTotal) || montoTotal <= 0) {
      setError('El monto total del abono debe ser mayor a 0.');
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
    
    if (!formData.sedeId) {
      setError('Debes seleccionar una sede.');
      return;
    }

    // Validación: no permitir abono mayor a la suma de las deudas
    const sumaDeudas = Array.from(ordenesSeleccionadas)
      .map(ordenId => {
        const orden = ordenesCredito.find(o => o.id === ordenId);
        return orden ? Number(orden.saldoPendiente || orden.saldo || 0) : 0;
      })
      .reduce((acc, val) => acc + val, 0);
    if (montoTotal > sumaDeudas) {
      const excedente = montoTotal - sumaDeudas;
      setError(`El monto ingresado ($${montoTotal.toLocaleString('es-CO')}) excede la deuda total ($${sumaDeudas.toLocaleString('es-CO')}). El excedente de $${excedente.toLocaleString('es-CO')} no puede aplicarse a ningún crédito.`);
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

    const metodosValidos = metodosPago.filter(m => m.tipo && m.monto > 0);
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

    const sumaMetodos = metodosValidos.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
    if (Math.abs(sumaMetodos - montoTotal) > 0.01) {
      setError(`La suma de los métodos de pago ($${sumaMetodos.toLocaleString()}) debe coincidir con el monto total ($${montoTotal.toLocaleString()}).`);
      return;
    }

    try {
      setLoading(true);
      
      const metodoPagoString = construirDescripcion(metodosValidos, observacionesAdicionales);

      // CALCULAR MONTOS POR MÉTODO DE PAGO (campos numéricos)
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
        // Otros tipos (NEQUI, DAVIPLATA, etc.) no se envían en campos numéricos por ahora
      });

      // Crear un abono por cada orden con monto de abono > 0
      // El creditoId viene directamente en creditoDetalle.creditoId de cada orden
      const abonosACrear = distribucionValida.map(dist => {
        const orden = ordenesCredito.find(o => o.id === dist.ordenId);
        const creditoId = orden?.creditoDetalle?.creditoId;
        
        if (!creditoId) {
          // console.warn(`No se encontró creditoId para la orden ${dist.ordenId}`);
          return null;
        }
        
        // CALCULAR RETENCIÓN PROPORCIONAL
        // Solo si la orden tiene retención Y el saldo queda en 0 (orden completamente pagada)
        let montoRetencionAbono = 0;
        if (orden.tieneRetencionFuente && dist.saldoRestante === 0) {
          // Si este abono completa la orden, incluir la retención total de la orden
          montoRetencionAbono = orden.retencionFuente || 0;
        }
        
        // CALCULAR MONTOS PROPORCIONALES de cada método de pago
        const proporcion = dist.montoAbono / montoTotal;
        const montoEfectivoAbono = montoEfectivoTotal * proporcion;
        const montoTransferenciaAbono = montoTransferenciaTotal * proporcion;
        const montoChequeAbono = montoChequeTotal * proporcion;
        
        return {
          creditoId: creditoId,
          total: dist.montoAbono,
          fecha: formData.fecha,
          metodoPago: metodoPagoString,
          factura: formData.factura || null,
          sedeId: formData.sedeId || sedeIdUsuario, // Incluir sedeId
          // CAMPOS NUMÉRICOS
          montoEfectivo: Math.round(montoEfectivoAbono * 100) / 100,
          montoTransferencia: Math.round(montoTransferenciaAbono * 100) / 100,
          montoCheque: Math.round(montoChequeAbono * 100) / 100,
          montoRetencion: Math.round(montoRetencionAbono * 100) / 100
        };
      }).filter(abono => abono !== null && abono.creditoId); // Solo crear si tiene creditoId válido

      if (abonosACrear.length === 0) {
        setError('No se pudo determinar el crédito para alguna de las órdenes seleccionadas.');
        return;
      }

      // Crear todos los abonos
      const resultados = await Promise.all(
        abonosACrear.map(abonoData => 
          api.post(`/creditos/${abonoData.creditoId}/abonos`, abonoData)
        )
      );
      
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error al crear los abonos';
      // console.error("Error al registrar abonos:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalMetodosPago = metodosPago
    .filter(m => m.tipo && m.monto > 0)
    .reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);

  const totalDistribuido = distribucion.reduce((sum, d) => sum + d.montoAbono, 0);
  const montoRestante = parseFloat(formData.montoTotal || 0) - totalDistribuido;

  // Calcular total deuda (suma de todos los saldos pendientes de las órdenes seleccionadas)
  const totalDeuda = Array.from(ordenesSeleccionadas)
    .map(ordenId => ordenesCredito.find(o => o.id === ordenId))
    .filter(Boolean)
    .reduce((sum, orden) => sum + (orden.creditoDetalle?.saldoPendiente || 0), 0);

  // Calcular saldo después del abono
  const saldoDespuesAbono = totalDeuda - totalDistribuido;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div className="modal-container modal-wide" style={{ maxWidth: '95vw', width: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header con título y fecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid #e0e0e0' }}>
          <h2 style={{ margin: 0, color: '#1e2753' }}>CRÉDITOS X CLIENTE</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>SEDE:</label>
              <select
                name="sedeId"
                value={formData.sedeId}
                onChange={handleChange}
                style={{ padding: '0.4rem', fontSize: '0.9rem', minWidth: '150px' }}
                required
              >
                <option value="">Seleccionar sede</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>FECHA:</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="modal-error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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

          {/* Información del Cliente */}
          {clienteSeleccionado && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              border: '1px solid #e0e0e0',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#1e2753' }}>CLIENTE</strong>
                  <button
                    type="button"
                    onClick={() => setShowClienteModal(true)}
                    className="btn-guardar"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                  >
                    Cambiar
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <div><strong>NOMBRE:</strong> {clienteSeleccionado.nombre || '-'}</div>
                  <div><strong>DIRECCIÓN:</strong> {clienteSeleccionado.direccion || '-'}</div>
                  <div><strong>TELÉFONO:</strong> {clienteSeleccionado.telefono || '-'}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <div style={{ marginTop: '1.5rem' }}>
                  <div><strong>NIT:</strong> {clienteSeleccionado.nit || '-'}</div>
                  <div><strong>CIUDAD:</strong> {clienteSeleccionado.ciudad || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Layout de 3 Columnas: Métodos de Pago (Izq) | Tabla Órdenes (Centro) | Resumen (Der) */}
          {clienteSeleccionado && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '200px 1fr 300px', 
              gap: '1rem', 
              flex: 1, 
              minHeight: 0,
              marginTop: '1rem'
            }}>
              {/* COLUMNA IZQUIERDA: Botones de Métodos de Pago */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e2753' }}>Métodos de Pago</div>
                {tiposMetodoPago.slice(0, 4).map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => {
                      const existe = metodosPago.find(m => m.tipo === tipo.value);
                      if (!existe) {
                        setMetodosPago([...metodosPago, { tipo: tipo.value, monto: 0, banco: "" }]);
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#fff',
                      border: '2px solid #1e2753',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      color: '#1e2753',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#1e2753';
                      e.target.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#fff';
                      e.target.style.color = '#1e2753';
                    }}
                  >
                    {tipo.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={agregarMetodoPago}
                  className="btn-guardar"
                  style={{
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    marginTop: '0.5rem'
                  }}
                >
                  + Agregar Otro
                </button>
              </div>

              {/* COLUMNA CENTRAL: Tabla de Órdenes */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                    Este cliente no tiene órdenes a crédito con saldo pendiente
                  </div>
                ) : (
                  <div style={{ 
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#1e2753', color: '#fff' }}>
                        <tr>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>
                            <input
                              type="checkbox"
                              checked={ordenesSeleccionadas.size === ordenesCredito.length && ordenesCredito.length > 0}
                              onChange={toggleSeleccionarTodas}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </th>
                          <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #fff' }}>FECHA</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>ORDEN</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #fff' }}>FACTURA</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>VALOR</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', borderRight: '1px solid #fff' }}>SALDO</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>ABONO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenesCredito.map((orden) => {
                          const dist = distribucion.find(d => d.ordenId === orden.id);
                          const valorOrden = orden.total || 0;
                          const saldoPendiente = orden.creditoDetalle?.saldoPendiente || 0;
                          const montoAbono = dist?.montoAbono || 0;
                          const estaSeleccionada = ordenesSeleccionadas.has(orden.id);
                          
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
                                color: montoAbono > 0 ? '#28a745' : '#666',
                                fontWeight: montoAbono > 0 ? 'bold' : 'normal',
                                display: 'flex', alignItems: 'center', gap: 8
                              }}>
                                ${montoAbono.toLocaleString('es-CO')}
                                {/* Checkbox de retención fuente */}
                                {estaSeleccionada && (
                                  <input
                                    type="checkbox"
                                    checked={!!orden.tieneRetencionFuente}
                                    disabled={retenLoading || (calcularRetencionYIva(orden).subtotal < retenSettings.retefuenteThreshold)}
                                    title={calcularRetencionYIva(orden).subtotal < retenSettings.retefuenteThreshold ? `Para aplicar retención: la orden debe estar seleccionada y el subtotal debe ser >= $${retenSettings.retefuenteThreshold.toLocaleString('es-CO')}` : 'Marcar para aplicar retención'}
                                    style={{ width: 18, height: 18, cursor: (retenLoading || calcularRetencionYIva(orden).subtotal < retenSettings.retefuenteThreshold) ? 'not-allowed' : 'pointer', opacity: (retenLoading || calcularRetencionYIva(orden).subtotal < retenSettings.retefuenteThreshold) ? 0.5 : 1 }}
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                                    onChange={e => { e.preventDefault(); e.stopPropagation(); handleToggleRetencion(orden); }}
                                  />
                                )}
                              </td>
                            </tr>
                          );
        {/* Error de retención fuente */}
        {retenError && (
          <div className="modal-error" role="alert" style={{ marginBottom: '1rem', color: 'red' }}>
            {retenError}
          </div>
        )}
                        })}
                      </tbody>
                      <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', position: 'sticky', bottom: 0 }}>
                        <tr>
                          <td colSpan="4" style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            TOTAL DEUDA:
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753' }}>
                            ${(Array.from(ordenesSeleccionadas)
                              .map(ordenId => ordenesCredito.find(o => o.id === ordenId))
                              .filter(Boolean)
                              .reduce((sum, orden) => sum + (orden.total || 0), 0)).toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#dc3545' }}>
                            ${totalDeuda.toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', borderTop: '2px solid #1e2753', color: '#28a745' }}>
                            ${totalDistribuido.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Input de Monto Total */}
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Monto Total del Abono (COP) *
                  </label>
                  <input
                    type="number"
                    name="montoTotal"
                    value={formData.montoTotal}
                    onChange={handleChange}
                    step="any"
                    min="0"
                    placeholder="Ej: 5000000"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      textAlign: 'right'
                    }}
                  />
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
                        {metodosPago.filter(m => m.tipo && m.monto > 0).length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{ padding: '1rem', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                              Agregue métodos de pago
                            </td>
                          </tr>
                        ) : (
                          metodosPago.filter(m => m.tipo && m.monto > 0).map((metodo, index) => {
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
                          })
                        )}
                      </tbody>
                      <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #1e2753' }}>
                        <tr>
                          <td style={{ padding: '0.5rem' }}>TOTAL:</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#1e2753' }}>
                            ${totalMetodosPago.toLocaleString('es-CO')}
                          </td>
                        </tr>
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
                      <strong style={{ color: '#dc3545' }}>${totalDeuda.toLocaleString('es-CO')}</strong>
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
                      <span style={{ fontWeight: '600' }}>SALDO:</span>
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
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#1e2753' }}>
                      Editar Métodos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {metodosPago.map((metodo, index) => (
                        <div key={index} style={{ 
                          padding: '0.5rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                            <div>
                              <select
                                value={metodo.tipo}
                                onChange={(e) => actualizarMetodoPago(index, 'tipo', e.target.value)}
                                style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem' }}
                              >
                                <option value="">Tipo...</option>
                                {tiposMetodoPago.map((tipo) => (
                                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                ))}
                              </select>
                              {metodo.tipo === "TRANSFERENCIA" && (
                                <div>
                                  <select
                                    value={metodo.banco}
                                    onChange={(e) => actualizarMetodoPago(index, 'banco', e.target.value)}
                                    style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                                    required
                                  >
                                    <option value="">Banco...</option>
                                    {bancos.map((banco) => (
                                      <option key={banco.id || banco.nombre} value={banco.id || banco.nombre}>
                                        {banco.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <input
                                type="number"
                                value={metodo.monto || ""}
                                onChange={(e) => {
                                  const valor = parseFloat(e.target.value) || 0;
                                  actualizarMetodoPago(index, 'monto', valor);
                                }}
                                placeholder="Monto"
                                min="0"
                                step="0.01"
                                style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => eliminarMetodoPago(index)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Campos adicionales y botones */}
          {clienteSeleccionado && (
            <div style={{ 
              marginTop: '1rem', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '2px solid #e0e0e0'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Número de Factura / Recibo (Opcional)
                </label>
                <input
                  type="text"
                  name="factura"
                  value={formData.factura}
                  onChange={handleChange}
                  placeholder="Ej: FAC-001"
                  maxLength={50}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Observaciones Adicionales (Opcional)
                </label>
                <textarea
                  value={observacionesAdicionales}
                  onChange={(e) => setObservacionesAdicionales(e.target.value)}
                  placeholder="Agregar notas adicionales..."
                  rows="3"
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          <div className="modal-buttons" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e0e0e0' }}>
            <button type="button" className="btn-cancelar" onClick={onClose} disabled={loading}>
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
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>Ciudad</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => {
                          const handleSelect = () => {
                            setClienteSeleccionado(c);
                            setClienteSearch(c.nombre);
                            setClienteSearchModal("");
                            setShowClienteModal(false);
                          };
                          return (
                            <tr
                              key={c.id}
                              style={{
                                transition: 'background-color 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={handleSelect}
                              onDoubleClick={handleSelect}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect();
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
                          );
                        })}
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

export default AbonoModal;
