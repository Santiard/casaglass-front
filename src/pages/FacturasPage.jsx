// src/pages/FacturasPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import FacturasTable from "../componets/FacturasTable";
import "../styles/ClientesPage.css";
import {
  listarFacturas,
  listarFacturasTabla,
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

  // Manejar edición de factura
  const handleEditar = async (factura, isEdit) => {
    try {
      if (!factura) {
        // Refrescar tabla
        await fetchData();
        return;
      }

      console.log("Editando factura:", factura);
      // Aquí puedes agregar lógica para actualizar la factura si lo necesitas
      await fetchData();
    } catch (e) {
      console.error("Error editando factura", e);
      alert("No se pudo editar la factura. Revisa consola.");
    }
  };

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <FacturasTable
          data={data}
          loading={loading}
          clientes={clientes}
          onEditar={handleEditar}
        />
      </div>
    </div>
  );
}
