import React, { useState, useEffect, useCallback } from "react";
import EntregasTable from "../componets/EntregaTable.jsx";
import EntregaDetalleModal from "../modals/EntregaDetalleModal.jsx";
import CrearEntregaModal from "../modals/CrearEntregaModal.jsx";
// CrearGastoModal eliminado - ya no se usan gastos en entregas
import EntregasImprimirModal from "../modals/EntregasImprimirModal.jsx";
import EntregasService from "../services/EntregasService.js";
import * as SedesService from "../services/SedesService.js";
import * as TrabajadoresService from "../services/TrabajadoresService.js";
import * as ProveedoresService from "../services/ProveedoresService.js";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/EntregaPage.css";

export default function EntregasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError: showToastError } = useToast();
  const { isAdmin, sedeId: sedeIdUsuario, user } = useAuth();
  const userId = user?.id || null;
  
  // Estados principales
  const [entregas, setEntregas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  
  // Estados de modales
  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  // mostrarCrearGastoModal eliminado - ya no se usan gastos en entregas
  const [mostrarImprimirModal, setMostrarImprimirModal] = useState(false);
  const [entregasParaImprimir, setEntregasParaImprimir] = useState([]);
  const [infoSeleccionadas, setInfoSeleccionadas] = useState({ count: 0, handler: null });
  
  // Memoizar la función setInfoSeleccionadas para evitar recreaciones
  const handleSetInfoSeleccionadas = useCallback((info) => {
    setInfoSeleccionadas(info);
  }, []);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    sedeId: "",
    empleadoId: "",
    estado: "",
    desde: "",
    hasta: ""
  });

  // Función para cargar datos iniciales (memoizada)
  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Si no es admin, filtrar por sede del usuario
      const filtrosEntregas = isAdmin ? {} : { sedeId: sedeIdUsuario };
      // Cargar datos en paralelo
      const [entregasData, sedesData, trabajadoresData, proveedoresData] = await Promise.all([
        EntregasService.obtenerEntregas(filtrosEntregas),
        SedesService.listarSedes(),
        TrabajadoresService.listarTrabajadores(),
        ProveedoresService.listarProveedores()
      ]);
      
      // Ordenar entregas de más recientes a más antiguas por fechaEntrega
      const entregasOrdenadas = (entregasData || []).sort((a, b) => {
        const fechaA = new Date(a.fechaEntrega || 0);
        const fechaB = new Date(b.fechaEntrega || 0);
        return fechaB - fechaA; // Más reciente primero
      });
      
      setEntregas(entregasOrdenadas);
      setSedes(sedesData || []);
      setTrabajadores(trabajadoresData || []);
      setProveedores(proveedoresData || []);
      
      
    } catch (err) {
      console.error("Error cargando datos:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error cargando datos: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, sedeIdUsuario]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);



  // Función para cargar entregas (mantener para compatibilidad con otros handlers)
  // Esta función recarga los datos con filtros según el rol del usuario
  const cargarEntregas = useCallback(async () => {
    try {
      // Si no es admin, filtrar por sede del usuario
      const filtros = isAdmin ? {} : { sedeId: sedeIdUsuario };
      const data = await EntregasService.obtenerEntregas(filtros);
      
      // Ordenar entregas de más recientes a más antiguas por fechaEntrega
      const entregasOrdenadas = (data || []).sort((a, b) => {
        const fechaA = new Date(a.fechaEntrega || 0);
        const fechaB = new Date(b.fechaEntrega || 0);
        return fechaB - fechaA; // Más reciente primero
      });
      
      setEntregas(entregasOrdenadas);
      
    } catch (err) {
      console.error("Error cargando entregas:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error cargando entregas: ${errorMessage}`);
    }
  }, [isAdmin, sedeIdUsuario]); // Recarga con filtros según el rol del usuario

  const handleFiltroChange = async (campo, valor) => {
    const nuevosFiltros = {
      ...filtros,
      [campo]: valor
    };
    setFiltros(nuevosFiltros);
    
    // Aplicar filtros inmediatamente
    const tieneFiltros = nuevosFiltros.sedeId || nuevosFiltros.empleadoId || nuevosFiltros.estado || nuevosFiltros.desde || nuevosFiltros.hasta;
    if (!tieneFiltros) {
      // Si no hay filtros, recargar todos los datos
      await cargarDatos();
      return;
    }

    try {
      setIsLoading(true);
      // Filtrar parámetros vacíos
      const filtrosLimpios = Object.fromEntries(
        Object.entries(nuevosFiltros).filter(([_, value]) => value !== "")
      );
      
      const data = await EntregasService.obtenerEntregas(filtrosLimpios);
      
      // Ordenar entregas de más recientes a más antiguas por fechaEntrega
      const entregasOrdenadas = (data || []).sort((a, b) => {
        const fechaA = new Date(a.fechaEntrega || 0);
        const fechaB = new Date(b.fechaEntrega || 0);
        return fechaB - fechaA; // Más reciente primero
      });
      
      setEntregas(entregasOrdenadas);
      
    } catch (err) {
      console.error("Error cargando entregas:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error cargando entregas: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarFiltros = async () => {
    setFiltros({
      sedeId: "",
      empleadoId: "",
      estado: "",
      desde: "",
      hasta: ""
    });
    // Recargar todos los datos cuando se limpian los filtros
    await cargarDatos();
  };

  const handleCrearEntrega = () => {
    setMostrarCrearModal(true);
  };

  // handleCrearGasto y handleGastoCreado eliminados - ya no se usan gastos en entregas

  const handleEntregaCreada = () => {
    setMostrarCrearModal(false);
    cargarEntregas(); // Recargar lista
  };

  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);
  
  const handleConfirmarEntrega = useCallback(async (entrega) => {
    // Prevenir doble envío
    if (confirmandoEntrega) {
      return;
    }
    
    const confirmed = await confirm({
      title: "Confirmar Entrega",
      message: `¿Está seguro de que desea confirmar la entrega #${entrega.id}? El estado cambiará a "ENTREGADA".`,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      type: "warning"
    });
    
    if (confirmed) {
      try {
        setConfirmandoEntrega(true);
        await EntregasService.confirmarEntrega(entrega.id);
        // Recargar entregas después de confirmar
        await cargarEntregas();
      } catch (err) {
        console.error("Error confirmando entrega:", err);
        const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Error desconocido";
        showToastError(`Error confirmando entrega: ${errorMsg}`);
      } finally {
        setConfirmandoEntrega(false);
      }
    }
  }, [confirm, confirmandoEntrega, cargarEntregas, showToastError]);


  const handleEliminarEntrega = async (entrega) => {
    try {
      if (entrega.estado === "ENTREGADA") {
        showToastError("No se puede eliminar una entrega ENTREGADA");
        return;
      }
      const confirmacion = await confirm({
        title: "Eliminar Entrega",
        message: `¿Estás seguro de que deseas eliminar la entrega #${entrega.id}?\n\nEsta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        cancelText: "Cancelar",
        type: "danger"
      });
      
      if (!confirmacion) return;
      
      await EntregasService.eliminarEntrega(entrega.id);
      await cargarEntregas();
    } catch (err) {
      console.error("Error eliminando entrega:", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || "No se pudo eliminar";
      setError(`Error eliminando entrega: ${msg}`);
    }
  };

  const handleImprimirEntrega = async (entrega) => {
    try {
      // Obtener la entrega completa con todos sus detalles
      const entregaCompleta = await EntregasService.obtenerEntregaPorId(entrega.id);
      setEntregasParaImprimir([entregaCompleta]);
      setMostrarImprimirModal(true);
    } catch (err) {
      console.error("Error obteniendo entrega para imprimir:", err);
      setError(`Error cargando entrega: ${err.message}`);
    }
  };

  const handleImprimirMultiples = () => {
    // Abrir modal con todas las entregas filtradas
    setEntregasParaImprimir(entregas);
    setMostrarImprimirModal(true);
  };

  const handleImprimirSeleccionadas = async (entregasSeleccionadas) => {
    try {
      // Obtener las entregas completas con todos sus detalles
      const entregasCompletas = await Promise.all(
        entregasSeleccionadas.map(ent => 
          EntregasService.obtenerEntregaPorId(ent.id)
        )
      );
      setEntregasParaImprimir(entregasCompletas);
      setMostrarImprimirModal(true);
    } catch (err) {
      console.error("Error obteniendo entregas para imprimir:", err);
      setError(`Error cargando entregas: ${err.message}`);
    }
  };

  // Renderizar el contenido principal (siempre renderiza, incluso durante loading)
  
  return (
    <div className="entregas-page">
      <div className="entregas-header">
        <h1>Gestión de Entregas de Dinero</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {infoSeleccionadas.count > 0 && (
            <>
              <span style={{ 
                fontWeight: "bold", 
                color: "#1976d2",
                padding: "5px 10px",
                backgroundColor: "#e3f2fd",
                borderRadius: "4px"
              }}>
                {infoSeleccionadas.count} seleccionada(s)
              </span>
              <button 
                className="btn-crear-entrega" 
                onClick={infoSeleccionadas.handler}
                style={{ backgroundColor: "#1e2753" }}
              >
                Imprimir Seleccionadas
              </button>
            </>
          )}
          <button 
            className="btn-crear-entrega" 
            onClick={handleImprimirMultiples}
            disabled={entregas.length === 0}
            style={{ backgroundColor: "#1e2753" }}
          >
            Imprimir Entregas
          </button>
          {/* Botón de Crear Gasto eliminado - ya no se usan gastos en entregas */}
          <button 
            className="btn-crear-entrega" 
            onClick={handleCrearEntrega}
          >
            + Nueva Entrega
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="entregas-loading" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="loading-spinner">Cargando entregas...</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Filtros */}
      <div className="entregas-filtros">
        <div className="filtro-grupo">
          <label>Sede:</label>
          <select
            value={filtros.sedeId}
            onChange={(e) => handleFiltroChange('sedeId', e.target.value)}
          >
            <option value="">Todas las sedes</option>
            {Array.isArray(sedes) && sedes.map(sede => (
              <option key={sede?.id} value={sede?.id}>
                {sede?.nombre || ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Empleado:</label>
          <select
            value={filtros.empleadoId}
            onChange={(e) => handleFiltroChange('empleadoId', e.target.value)}
          >
            <option value="">Todos los empleados</option>
            {Array.isArray(trabajadores) && trabajadores.map(trabajador => (
              <option key={trabajador?.id} value={trabajador?.id}>
                {trabajador?.nombre || ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Estado:</label>
          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="ENTREGADA">Entregada</option>
            <option value="VERIFICADA">Verificada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Desde:</label>
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => handleFiltroChange('desde', e.target.value)}
          />
        </div>

        <div className="filtro-grupo">
          <label>Hasta:</label>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => handleFiltroChange('hasta', e.target.value)}
          />
        </div>

        <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
          Limpiar Filtros
        </button>
      </div>

      {/* Tabla de entregas */}
      <div className="entregas-content">
        <EntregasTable
          data={entregas}
          onVerDetalles={(entrega) => setSeleccionado(entrega)}
          onConfirmar={handleConfirmarEntrega}
          onEliminar={handleEliminarEntrega}
          onImprimir={handleImprimirEntrega}
          onImprimirSeleccionadas={handleImprimirSeleccionadas}
          onImprimirSeleccionadasClick={handleSetInfoSeleccionadas}
        />
      </div>

      {/* Modal de detalles */}
      <EntregaDetalleModal
        entrega={seleccionado}
        isOpen={!!seleccionado}
        onClose={() => setSeleccionado(null)}
      />

      {/* Modales */}
      {/* CrearGastoModal eliminado - ya no se usan gastos en entregas */}

      <CrearEntregaModal
        isOpen={mostrarCrearModal}
        onClose={() => setMostrarCrearModal(false)}
        onSuccess={handleEntregaCreada}
        sedes={Array.isArray(sedes) ? sedes : []}
        trabajadores={Array.isArray(trabajadores) ? trabajadores : []}
        sedeIdUsuario={sedeIdUsuario}
        userId={userId}
      />


      <EntregasImprimirModal
        isOpen={mostrarImprimirModal}
        entregas={entregasParaImprimir}
        onClose={() => {
          setMostrarImprimirModal(false);
          setEntregasParaImprimir([]);
        }}
      />

      <ConfirmDialog />
    </div>
  );
}