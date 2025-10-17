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
      const arr = await listarOrdenesTabla();
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

  // 🔹 Guardar (editar o crear)
  const handleGuardar = async (orden, isEdit) => {
    try {
      // Si orden es null, solo refrescar (modal ya guardó)
      if (!orden) {
        console.log("Refrescando tabla...");
        await fetchData();
        return;
      }

      console.log("Guardando orden con payload:", orden);

      let updated;
      if (isEdit) {
        updated = await actualizarOrden(orden.id, orden);
        console.log("✅ Orden actualizada:", updated);
      } else {
        updated = await crearOrden(orden);
        console.log("✅ Orden creada:", updated);
      }

      await fetchData(); // refrescar tabla
    } catch (e) {
      console.error("Error guardando orden", e);
      console.error("Response data:", e?.response?.data);
      console.error("Status:", e?.response?.status);
      alert("No se pudo guardar la orden. Revisa consola.");
    }
  };

  // 🔹 Eliminar orden
  const handleEliminar = async (orden) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta orden?")) return;
    try {
      await eliminarOrden(orden.id);
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
