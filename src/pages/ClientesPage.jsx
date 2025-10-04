// src/pages/ClientesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import ClientesTable from "../componets/ClientesTable";
import "../styles/ClientesPage.css";
import {
  listarClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from "../services/ClientesService";

export default function ClientesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await listarClientes();
      setData(arr);
    } catch (e) {
      console.error("Error listando clientes", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // El modal te pasa (cliente, isEdit)
  const handleGuardar = async (cliente, isEdit) => {
    try {
      if (isEdit) {
        await actualizarCliente(cliente.id, cliente);
      } else {
        await crearCliente(cliente);
      }
      await fetchData();
    } catch (e) {
      console.error("Error guardando cliente", e);
      alert("No se pudo guardar el cliente. Revisa consola.");
    }
  };

  const handleEliminar = async (cli) => {
  try {
    await eliminarCliente(cli.id);
    await fetchData();
  } catch (e) {
    console.error("Error eliminando cliente", e);

    // Si el backend devuelve mensaje personalizado (por ejemplo en status 409)
    const backendMsg = e?.response?.data?.message;

    if (backendMsg) {
      alert(backendMsg); // mensaje enviado desde el backend
    } else if (e?.response?.status === 409) {
      alert("No se puede eliminar el cliente porque tiene registros asociados (por ejemplo, órdenes o créditos).");
    } else {
      alert("No se pudo eliminar el cliente. Revisa consola.");
    }
  }
};
  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <ClientesTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}
          onEliminar={handleEliminar}
          onCrear={(c) => handleGuardar(c, false)}
        />
      </div>
    </div>
  );
}
