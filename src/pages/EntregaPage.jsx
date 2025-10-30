import { useState, useEffect } from "react";
import EntregasTable from "../componets/EntregaTable.jsx";
import EntregaDetallePanel from "../componets/EntregaDetallePanel.jsx";
import CrearEntregaModal from "../modals/CrearEntregaModal.jsx";
import ConfirmarEntregaModal from "../modals/ConfirmarEntregaModal.jsx";
import EntregasService from "../services/EntregasService.js";
import * as SedesService from "../services/SedesService.js";
import * as TrabajadoresService from "../services/TrabajadoresService.js";
import "../styles/EntregaPage.css";

export default function EntregasPage() {
  // Estados principales
  const [entregas, setEntregas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  
  // Estados de modales
  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  const [mostrarConfirmarModal, setMostrarConfirmarModal] = useState(false);
  const [entregaAConfirmar, setEntregaAConfirmar] = useState(null);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    sedeId: "",
    empleadoId: "",
    estado: "",
    desde: "",
    hasta: ""
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (!isLoading) {
      cargarEntregas();
    }
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Cargar datos en paralelo
      const [entregasData, sedesData, trabajadoresData] = await Promise.all([
        EntregasService.obtenerEntregas(),
        SedesService.listarSedes(),
        TrabajadoresService.listarTrabajadores()
      ]);
      
      setEntregas(entregasData || []);
      setSedes(sedesData || []);
      setTrabajadores(trabajadoresData || []);
      
      console.log("Datos cargados:", {
        entregas: entregasData?.length,
        sedes: sedesData?.length,
        trabajadores: trabajadoresData?.length
      });
      
    } catch (err) {
      console.error("Error cargando datos:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error cargando datos: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEntregas = async () => {
    try {
      console.log('cargarEntregas: Iniciando carga...');
      console.log('cargarEntregas: Filtros actuales:', filtros);
      
      // Filtrar parámetros vacíos
      const filtrosLimpios = Object.fromEntries(
        Object.entries(filtros).filter(([_, value]) => value !== "")
      );
      
      console.log('cargarEntregas: Filtros limpios:', filtrosLimpios);
      
      const data = await EntregasService.obtenerEntregas(filtrosLimpios);
      console.log('cargarEntregas: Datos recibidos:', data);
      console.log('cargarEntregas: Cantidad de entregas:', data?.length);
      
      setEntregas(data || []);
      
    } catch (err) {
      console.error("Error cargando entregas:", err);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`Error cargando entregas: ${errorMessage}`);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      sedeId: "",
      empleadoId: "",
      estado: "",
      desde: "",
      hasta: ""
    });
  };

  const handleCrearEntrega = () => {
    setMostrarCrearModal(true);
  };

  const handleEntregaCreada = () => {
    console.log('handleEntregaCreada: Entrega creada exitosamente');
    setMostrarCrearModal(false);
    console.log('handleEntregaCreada: Recargando entregas...');
    cargarEntregas(); // Recargar lista
  };

  const handleConfirmarEntrega = (entrega) => {
    setEntregaAConfirmar(entrega);
    setMostrarConfirmarModal(true);
  };

  const handleEntregaConfirmada = () => {
    setMostrarConfirmarModal(false);
    setEntregaAConfirmar(null);
    cargarEntregas(); // Recargar lista
  };

  const handleCancelarEntrega = async (entrega, motivo) => {
    try {
      await EntregasService.cancelarEntrega(entrega.id, motivo);
      cargarEntregas(); // Recargar lista
    } catch (err) {
      console.error("Error cancelando entrega:", err);
      setError(`Error cancelando entrega: ${err.message}`);
    }
  };

  const handleEliminarEntrega = async (entrega) => {
    try {
      if (entrega.estado === "ENTREGADA") {
        alert("No se puede eliminar una entrega ENTREGADA");
        return;
      }
      if (!window.confirm(`¿Eliminar entrega #${entrega.id}?`)) return;
      await EntregasService.eliminarEntrega(entrega.id);
      await cargarEntregas();
    } catch (err) {
      console.error("Error eliminando entrega:", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || "No se pudo eliminar";
      setError(`Error eliminando entrega: ${msg}`);
    }
  };

  if (isLoading) {
    return (
      <div className="entregas-loading">
        <div className="loading-spinner">Cargando entregas...</div>
      </div>
    );
  }

  return (
    <div className="entregas-page">
      <div className="entregas-header">
        <h1>Gestión de Entregas de Dinero</h1>
        <button 
          className="btn-crear-entrega" 
          onClick={handleCrearEntrega}
        >
          + Nueva Entrega
        </button>
      </div>

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
            {sedes.map(sede => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
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
            {trabajadores.map(trabajador => (
              <option key={trabajador.id} value={trabajador.id}>
                {trabajador.nombre}
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
          onCancelar={handleCancelarEntrega}
          onEliminar={handleEliminarEntrega}
        />
      </div>

      {/* Panel de detalles */}
      {seleccionado && (
        <EntregaDetallePanel
          entrega={seleccionado}
          onClose={() => setSeleccionado(null)}
          onActualizar={cargarEntregas}
        />
      )}

      {/* Modales */}
      <CrearEntregaModal
        isOpen={mostrarCrearModal}
        onClose={() => setMostrarCrearModal(false)}
        onSuccess={handleEntregaCreada}
        sedes={sedes}
        trabajadores={trabajadores}
      />

      <ConfirmarEntregaModal
        isOpen={mostrarConfirmarModal}
        entrega={entregaAConfirmar}
        onClose={() => setMostrarConfirmarModal(false)}
        onSuccess={handleEntregaConfirmada}
      />
    </div>
  );
}