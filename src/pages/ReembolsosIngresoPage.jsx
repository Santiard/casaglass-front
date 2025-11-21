// src/pages/ReembolsosIngresoPage.jsx
import { useEffect, useState } from "react";
import ReembolsosIngresoTable from "../componets/ReembolsosIngresoTable.jsx";
import CrearReembolsoIngresoModal from "../modals/CrearReembolsoIngresoModal.jsx";
import ReembolsosIngresoService from "../services/ReembolsosIngresoService.js";
import { useToast } from "../context/ToastContext.jsx";
import add from "../assets/add.png";

export default function ReembolsosIngresoPage() {
  const { showSuccess, showError } = useToast();
  const [reembolsos, setReembolsos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reembolsoSeleccionado, setReembolsoSeleccionado] = useState(null);

  const cargarReembolsos = async () => {
    setLoading(true);
    try {
      const lista = await ReembolsosIngresoService.listarReembolsos();
      setReembolsos(lista || []);
    } catch (error) {
      console.error("Error cargando reembolsos:", error);
      showError("No se pudieron cargar los reembolsos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReembolsos();
  }, []);

  const handleCrear = async (payload) => {
    try {
      await ReembolsosIngresoService.crearReembolso(payload);
      await cargarReembolsos();
      showSuccess("Reembolso creado exitosamente.");
    } catch (error) {
      console.error("Error creando reembolso:", error);
      const msg = error?.response?.data?.error || error?.message || "No se pudo crear el reembolso.";
      showError(msg);
      throw error;
    }
  };

  const handleProcesar = async (id) => {
    try {
      await ReembolsosIngresoService.procesarReembolso(id);
      await cargarReembolsos();
      showSuccess("Reembolso procesado exitosamente.");
    } catch (error) {
      console.error("Error procesando reembolso:", error);
      const msg = error?.response?.data?.error || error?.message || "No se pudo procesar el reembolso.";
      showError(msg);
    }
  };

  const handleAnular = async (id) => {
    try {
      await ReembolsosIngresoService.anularReembolso(id);
      await cargarReembolsos();
      showSuccess("Reembolso anulado exitosamente.");
    } catch (error) {
      console.error("Error anulando reembolso:", error);
      const msg = error?.response?.data?.error || error?.message || "No se pudo anular el reembolso.";
      showError(msg);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await ReembolsosIngresoService.eliminarReembolso(id);
      await cargarReembolsos();
      showSuccess("Reembolso eliminado exitosamente.");
    } catch (error) {
      console.error("Error eliminando reembolso:", error);
      const msg = error?.response?.data?.error || error?.message || "No se pudo eliminar el reembolso.";
      showError(msg);
    }
  };

  const handleVerDetalles = async (reembolso) => {
    try {
      // Cargar el reembolso completo con todos los detalles
      const completo = await ReembolsosIngresoService.obtenerReembolso(reembolso.id);
      setReembolsoSeleccionado(completo);
      // TODO: Abrir modal de detalles (crear componente si es necesario)
      alert(`Reembolso #${completo.id}\nTotal: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(completo.totalReembolso)}\nEstado: ${completo.estado}`);
    } catch (error) {
      console.error("Error cargando detalles:", error);
      showError("No se pudieron cargar los detalles del reembolso.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Reembolsos de Ingreso</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#4f67ff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          <img src={add} alt="Agregar" style={{ width: "20px", height: "20px" }} />
          Crear Reembolso
        </button>
      </div>

      <ReembolsosIngresoTable
        data={reembolsos}
        loading={loading}
        onVerDetalles={handleVerDetalles}
        onProcesar={handleProcesar}
        onAnular={handleAnular}
        onEliminar={handleEliminar}
      />

      <CrearReembolsoIngresoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCrear}
      />
    </div>
  );
}

