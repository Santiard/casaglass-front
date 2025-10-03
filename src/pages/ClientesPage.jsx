// src/pages/ClientesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import ClientesTable from "../componets/ClientesTable";
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
      alert("No se pudo eliminar el cliente. Revisa consola.");
    }
  };

  return (
    <div>
      <div className="rowSuperior" />
      <div className="rowInferior">
        <ClientesTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}     // PUT cuando isEdit = true
          onEliminar={handleEliminar}  // DELETE
          onCrear={(c) => handleGuardar(c, false)} // por si decides llamarlo directo
        />
      </div>
    </div>
  );
}