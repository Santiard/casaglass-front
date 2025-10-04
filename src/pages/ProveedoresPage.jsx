import React, { useCallback, useEffect, useState } from "react";
import ProveedorTable from "../componets/ProveedorTable.jsx"; // usa el nombre REAL de tu archivo
import {
  listarProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from "../services/ProveedoresService";

export default function ProveedoresPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await listarProveedores();
      setData(arr);
    } catch (e) {
      console.error("Error listando proveedores", e);
      alert("No se pudieron cargar los proveedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGuardar = async (prov, isEdit) => {
    try {
      if (isEdit) await actualizarProveedor(prov.id, prov);
      else       await crearProveedor(prov);
      await fetchData();
    } catch (e) {
      console.error("Error guardando proveedor", e);
      const msg = e?.response?.data?.message || "No se pudo guardar el proveedor.";
      alert(msg);
    }
  };

  const handleEliminar = async (prov) => {
    try {
      await eliminarProveedor(prov.id);
      await fetchData();
    } catch (e) {
      console.error("Error eliminando proveedor", e);
      const backendMsg = e?.response?.data?.message;
      if (backendMsg) alert(backendMsg);
      else if (e?.response?.status === 409)
        alert("No se puede eliminar el proveedor porque tiene registros asociados.");
      else
        alert("No se pudo eliminar el proveedor. Revisa consola.");
    }
  };

  return (
    <div className="proveedores-page clientes-page">
      <div className="rowSuperior" />
      <div className="rowInferior fill">
        <ProveedorTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}             // PUT cuando isEdit = true
          onEliminar={handleEliminar}          // DELETE
          onCrear={(p) => handleGuardar(p, false)} // POST
        />
      </div>
    </div>
  );
}
