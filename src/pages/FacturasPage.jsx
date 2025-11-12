// src/pages/FacturasPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import FacturasTable from "../componets/FacturasTable";
import "../styles/ClientesPage.css";
import {
  listarFacturas,
  listarFacturasTabla,
  eliminarFactura,
  marcarFacturaComoPagada,
} from "../services/FacturasService";
import { listarClientes } from "../services/ClientesService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function FacturasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Intentar primero con tabla optimizada, fallback a básico
      try {
        const arr = await listarFacturasTabla();
        setData(arr);
      } catch (tablaError) {
        console.warn("Endpoint /facturas/tabla no disponible, usando /facturas básico:", tablaError);
        const arr = await listarFacturas();
        setData(arr);
      }
    } catch (e) {
      console.error("Error listando facturas", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const arr = await listarClientes();
      setClientes(arr);
    } catch (e) {
      console.error("Error listando clientes", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchClientes();
  }, [fetchData, fetchClientes]);

  // Manejar verificación (marcar como pagada)
  const handleVerificar = async (factura) => {
    try {
      const fechaPago = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await marcarFacturaComoPagada(factura.id, fechaPago);
      showSuccess("Factura marcada como pagada.");
      await fetchData();
    } catch (e) {
      console.error("Error marcando factura como pagada", e);
      const msg = e?.response?.data?.message || "No se pudo marcar como pagada.";
      showError(msg);
    }
  };

  // Manejar eliminación de factura
  const handleEliminar = async (factura) => {
    const confirmacion = await confirm({
      title: "Eliminar Factura",
      message: `¿Estás seguro de que deseas eliminar la factura #${factura.numeroFactura || factura.numero || factura.id}?\n\nEsta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });
    
    if (!confirmacion) return;
    
    try {
      await eliminarFactura(factura.id);
      showSuccess("Factura eliminada exitosamente.");
      await fetchData();
    } catch (e) {
      console.error("Error eliminando factura", e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || "No se pudo eliminar la factura.";
      showError(msg);
    }
  };

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <FacturasTable
          data={data}
          loading={loading}
          clientes={clientes}
          onVerificar={handleVerificar}
          onEliminar={handleEliminar}
        />
      </div>
      <ConfirmDialog />
    </div>
  );
}
