import React, { useCallback, useEffect, useState } from "react";
import ProveedorTable from "../componets/ProveedorTable.jsx"; // usa el nombre REAL de tu archivo
import {
  listarProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from "../services/ProveedoresService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ProveedoresPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError, showSuccess } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await listarProveedores();
      setData(arr);
    } catch (e) {
      console.error("Error listando proveedores", e);
      showError("No se pudieron cargar los proveedores.");
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
      showError(msg);
    }
  };

  const handleEliminar = async (prov) => {
    // Mostrar modal de confirmación
    const confirmacion = await confirm({
      title: "Eliminar Proveedor",
      message: `¿Estás seguro de que deseas eliminar al proveedor "${prov.nombre || 'este proveedor'}"?\n\nEsta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });

    // Si el usuario canceló, no hacer nada
    if (!confirmacion) return;

    // Si confirmó, proceder con la eliminación
    try {
      await eliminarProveedor(prov.id);
      await fetchData();
      showSuccess(`Proveedor "${prov.nombre || 'el proveedor'}" eliminado correctamente.`);
    } catch (e) {
      console.error("Error eliminando proveedor", e);
      const backendMsg = e?.response?.data?.message;
      if (backendMsg) showError(backendMsg);
      else if (e?.response?.status === 409)
        showError("No se puede eliminar el proveedor porque tiene registros asociados.");
      else
        showError("No se pudo eliminar el proveedor. Revisa consola.");
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
      <ConfirmDialog />
    </div>
  );
}
