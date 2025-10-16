// src/pages/OrdenesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import OrdenesTable from "../componets/OrdenesTable";
import "../styles/Table.css";
import {
  listarOrdenesTabla,
  crearOrden,
  actualizarOrden,
  eliminarOrden,
} from "../services/OrdenesService";

export default function OrdenesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await listarOrdenesTabla(); // GET /api/ordenes/tabla
      setData(arr);
    } catch (e) {
      console.error("Error listando órdenes", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGuardar = async (orden, isEdit) => {
    try {
      if (isEdit) {
        await actualizarOrden(orden.id, orden); // PUT /api/ordenes/{id}
      } else {
        await crearOrden(orden); // POST /api/ordenes
      }
      await fetchData();
    } catch (e) {
      console.error("Error guardando orden", e);
      alert("No se pudo guardar la orden. Revisa consola.");
    }
  };

  const handleEliminar = async (orden) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta orden?")) return;
    try {
      await eliminarOrden(orden.id); // DELETE /api/ordenes/{id}
      await fetchData();
    } catch (e) {
      console.error("Error eliminando orden", e);
      const msg = e?.response?.data?.message || "No se pudo eliminar la orden.";
      alert(msg);
    }
  };

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <OrdenesTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}
          onEliminar={handleEliminar}
          onCrear={(o) => handleGuardar(o, false)}
        />
      </div>
    </div>
  );
}
