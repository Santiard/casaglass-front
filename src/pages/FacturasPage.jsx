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

export default function FacturasPage() {
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
      alert("Factura marcada como pagada.");
      await fetchData();
    } catch (e) {
      console.error("Error marcando factura como pagada", e);
      const msg = e?.response?.data?.message || "No se pudo marcar como pagada.";
      alert(msg);
    }
  };

  // Manejar eliminación de factura
  const handleEliminar = async (factura) => {
    try {
      if (!confirm(`¿Eliminar la factura #${factura.numeroFactura || factura.numero || factura.id}? Esta acción no se puede deshacer.`)) {
        return;
      }
      await eliminarFactura(factura.id);
      alert("Factura eliminada exitosamente.");
      await fetchData();
    } catch (e) {
      console.error("Error eliminando factura", e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || "No se pudo eliminar la factura.";
      alert(msg);
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
    </div>
  );
}
