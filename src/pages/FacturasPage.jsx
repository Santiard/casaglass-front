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
import { useAuth } from "../context/AuthContext.jsx";

export default function FacturasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [data, setData] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Si no es admin, filtrar por sede del usuario
      const params = isAdmin ? {} : { sedeId };
      // Intentar primero con tabla optimizada, fallback a básico
      try {
        const arr = await listarFacturasTabla(params);
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
  }, [isAdmin, sedeId]);

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

  // Manejar confirmación de todas las facturas pendientes
  const handleConfirmarTodas = async () => {
    // Filtrar facturas pendientes
    const facturasPendientes = data.filter(f => {
      const estado = f.estado?.toLowerCase() || 'pendiente';
      return estado === 'pendiente';
    });

    if (facturasPendientes.length === 0) {
      showError("No hay facturas pendientes para confirmar.");
      return;
    }

    const confirmacion = await confirm({
      title: "Confirmar Todas las Facturas",
      message: `¿Estás seguro de que deseas confirmar ${facturasPendientes.length} factura(s) pendiente(s)?\n\nEsta acción marcará todas las facturas pendientes como pagadas.`,
      confirmText: "Confirmar Todas",
      cancelText: "Cancelar",
      type: "info"
    });
    
    if (!confirmacion) return;

    try {
      const fechaPago = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let confirmadas = 0;
      let errores = 0;

      // Confirmar todas las facturas pendientes
      for (const factura of facturasPendientes) {
        try {
          await marcarFacturaComoPagada(factura.id, fechaPago);
          confirmadas++;
        } catch (e) {
          console.error(`Error confirmando factura ${factura.id}:`, e);
          errores++;
        }
      }

      if (confirmadas > 0) {
        showSuccess(`Se confirmaron ${confirmadas} factura(s) exitosamente.${errores > 0 ? ` ${errores} factura(s) tuvieron errores.` : ''}`);
        await fetchData();
      } else {
        showError("No se pudo confirmar ninguna factura.");
      }
    } catch (e) {
      console.error("Error confirmando facturas", e);
      const msg = e?.response?.data?.message || "No se pudieron confirmar las facturas.";
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
          onConfirmarTodas={handleConfirmarTodas}
        />
      </div>
      <ConfirmDialog />
    </div>
  );
}
