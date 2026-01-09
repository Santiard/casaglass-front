// src/pages/ReembolsosPage.jsx
import { useEffect, useState } from "react";
import ReembolsosIngresoTable from "../componets/ReembolsosIngresoTable.jsx";
import ReembolsosVentaTable from "../componets/ReembolsosVentaTable.jsx";
import CrearReembolsoIngresoModal from "../modals/CrearReembolsoIngresoModal.jsx";
import CrearReembolsoVentaModal from "../modals/CrearReembolsoVentaModal.jsx";
import ReembolsoIngresoDetalleModal from "../modals/ReembolsoIngresoDetalleModal.jsx";
import ReembolsoVentaDetalleModal from "../modals/ReembolsoVentaDetalleModal.jsx";
import ReembolsosIngresoService from "../services/ReembolsosIngresoService.js";
import ReembolsosVentaService from "../services/ReembolsosVentaService.js";
import { useToast } from "../context/ToastContext.jsx";
import add from "../assets/add.png";
import "../styles/ReembolsosPage.css";

export default function ReembolsosPage() {
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState("ingreso"); // "ingreso" | "venta"
  
  // Estados para reembolsos de ingreso
  const [reembolsosIngreso, setReembolsosIngreso] = useState([]);
  const [loadingIngreso, setLoadingIngreso] = useState(false);
  const [isModalIngresoOpen, setIsModalIngresoOpen] = useState(false);
  const [reembolsoIngresoAEditar, setReembolsoIngresoAEditar] = useState(null);
  const [isDetalleIngresoOpen, setIsDetalleIngresoOpen] = useState(false);
  const [reembolsoIngresoId, setReembolsoIngresoId] = useState(null);
  
  // Estados para reembolsos de venta
  const [reembolsosVenta, setReembolsosVenta] = useState([]);
  const [loadingVenta, setLoadingVenta] = useState(false);
  const [isModalVentaOpen, setIsModalVentaOpen] = useState(false);
  const [reembolsoVentaAEditar, setReembolsoVentaAEditar] = useState(null);
  const [isDetalleVentaOpen, setIsDetalleVentaOpen] = useState(false);
  const [reembolsoVentaId, setReembolsoVentaId] = useState(null);

  // Cargar reembolsos de ingreso
  const cargarReembolsosIngreso = async () => {
    setLoadingIngreso(true);
    try {
      const lista = await ReembolsosIngresoService.listarReembolsos();
      setReembolsosIngreso(lista || []);
    } catch (error) {
      showError("No se pudieron cargar las devoluciones de ingreso.");
    } finally {
      setLoadingIngreso(false);
    }
  };

  // Cargar reembolsos de venta
  const cargarReembolsosVenta = async () => {
    setLoadingVenta(true);
    try {
      const lista = await ReembolsosVentaService.listarReembolsos();
      setReembolsosVenta(lista || []);
    } catch (error) {
      showError("No se pudieron cargar las devoluciones de venta.");
    } finally {
      setLoadingVenta(false);
    }
  };

  useEffect(() => {
    if (view === "ingreso") {
      cargarReembolsosIngreso();
    } else {
      cargarReembolsosVenta();
    }
  }, [view]);

  // Handlers para reembolsos de ingreso
  const handleCrearIngreso = async (payload) => {
    try {
      if (reembolsoIngresoAEditar) {
        // Modo edición
        await ReembolsosIngresoService.actualizarReembolso(reembolsoIngresoAEditar.id, payload);
        showSuccess("Devolución de ingreso actualizada exitosamente.");
      } else {
        // Modo creación
        await ReembolsosIngresoService.crearReembolso(payload);
        showSuccess("Devolución de ingreso creada exitosamente.");
      }
      await cargarReembolsosIngreso();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo guardar la devolución.";
      showError(msg);
      throw error;
    }
  };

  const handleProcesarIngreso = async (id) => {
    try {
      await ReembolsosIngresoService.procesarReembolso(id);
      await cargarReembolsosIngreso();
      showSuccess("Devolución procesada exitosamente.");
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo procesar la devolución.";
      showError(msg);
    }
  };

  const handleEliminarIngreso = async (id) => {
    try {
      await ReembolsosIngresoService.eliminarReembolso(id);
      await cargarReembolsosIngreso();
      showSuccess("Devolución eliminada exitosamente.");
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo eliminar la devolución.";
      showError(msg);
    }
  };

  const handleVerDetallesIngreso = async (reembolso) => {
    setReembolsoIngresoId(reembolso.id);
    setIsDetalleIngresoOpen(true);
  };

  const handleEditarIngreso = async (reembolso) => {
    if (reembolso.procesado || reembolso.estado === "PROCESADO") {
      showError("No se puede editar una devolución ya procesada.");
      return;
    }
    setReembolsoIngresoAEditar(reembolso);
    setIsModalIngresoOpen(true);
  };

  // Handlers para reembolsos de venta
  const handleCrearVenta = async (payload) => {
    try {
      if (reembolsoVentaAEditar) {
        // Modo edición
        await ReembolsosVentaService.actualizarReembolso(reembolsoVentaAEditar.id, payload);
        showSuccess("Devolución de venta actualizada exitosamente.");
      } else {
        // Modo creación
        await ReembolsosVentaService.crearReembolso(payload);
        showSuccess("Devolución de venta creada exitosamente.");
      }
      await cargarReembolsosVenta();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo guardar la devolución.";
      showError(msg);
      throw error;
    }
  };

  const handleProcesarVenta = async (id) => {
    try {
      await ReembolsosVentaService.procesarReembolso(id);
      await cargarReembolsosVenta();
      showSuccess("Devolución procesada exitosamente.");
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo procesar la devolución.";
      showError(msg);
    }
  };

  const handleEliminarVenta = async (id) => {
    try {
      await ReembolsosVentaService.eliminarReembolso(id);
      await cargarReembolsosVenta();
      showSuccess("Devolución eliminada exitosamente.");
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo eliminar la devolución.";
      showError(msg);
    }
  };

  const handleVerDetallesVenta = async (reembolso) => {
    setReembolsoVentaId(reembolso.id);
    setIsDetalleVentaOpen(true);
  };

  const handleEditarVenta = async (reembolso) => {
    // Solo permitir edición si no está procesado
    if (reembolso.procesado || reembolso.estado === "PROCESADO") {
      showError("No se puede editar una devolución ya procesada.");
      return;
    }
    setReembolsoVentaAEditar(reembolso);
    setIsModalVentaOpen(true);
  };

  return (
    <div className="reembolsos-page">
      <div className="reembolsos-header">
        <h1>Devoluciones</h1>
        <button
          onClick={() => view === "ingreso" ? setIsModalIngresoOpen(true) : setIsModalVentaOpen(true)}
          className="btn-crear-reembolso"
        >
          <img src={add} alt="Agregar" />
          Crear Devolución
        </button>
      </div>

      {/* Tabs */}
      <div className="reembolsos-tabs">
        <button
          className={`tab ${view === "ingreso" ? "active" : ""}`}
          onClick={() => setView("ingreso")}
        >
          Devoluciones de Ingreso
        </button>
        <button
          className={`tab ${view === "venta" ? "active" : ""}`}
          onClick={() => setView("venta")}
        >
          Devoluciones de Venta
        </button>
      </div>

      {/* Contenido según la vista */}
      {view === "ingreso" ? (
        <ReembolsosIngresoTable
          data={reembolsosIngreso}
          loading={loadingIngreso}
          onVerDetalles={handleVerDetallesIngreso}
          onProcesar={handleProcesarIngreso}
          onEliminar={handleEliminarIngreso}
          onEditar={handleEditarIngreso}
        />
      ) : (
        <ReembolsosVentaTable
          data={reembolsosVenta}
          loading={loadingVenta}
          onVerDetalles={handleVerDetallesVenta}
          onProcesar={handleProcesarVenta}
          onEliminar={handleEliminarVenta}
          onEditar={handleEditarVenta}
        />
      )}

      {/* Modales */}
      <CrearReembolsoIngresoModal
        isOpen={isModalIngresoOpen}
        onClose={() => {
          setIsModalIngresoOpen(false);
          setReembolsoIngresoAEditar(null);
        }}
        onSave={handleCrearIngreso}
        reembolsoAEditar={reembolsoIngresoAEditar}
      />

      <CrearReembolsoVentaModal
        isOpen={isModalVentaOpen}
        onClose={() => {
          setIsModalVentaOpen(false);
          setReembolsoVentaAEditar(null);
        }}
        onSave={handleCrearVenta}
        reembolsoAEditar={reembolsoVentaAEditar}
      />

      {/* Modales de detalle */}
      <ReembolsoIngresoDetalleModal
        isOpen={isDetalleIngresoOpen}
        onClose={() => {
          setIsDetalleIngresoOpen(false);
          setReembolsoIngresoId(null);
        }}
        reembolsoId={reembolsoIngresoId}
      />

      <ReembolsoVentaDetalleModal
        isOpen={isDetalleVentaOpen}
        onClose={() => {
          setIsDetalleVentaOpen(false);
          setReembolsoVentaId(null);
        }}
        reembolsoId={reembolsoVentaId}
      />
    </div>
  );
}

