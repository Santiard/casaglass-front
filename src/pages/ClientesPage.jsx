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
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ClientesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError, showSuccess } = useToast();
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
      // Validación adicional para NITs duplicados al crear (no al editar)
      if (!isEdit && cliente.nit) {
        const nitExiste = data.some(clienteExistente => 
          clienteExistente.nit === cliente.nit
        );
        
        if (nitExiste) {
          showError(`Ya existe un cliente registrado con el NIT ${cliente.nit}. Por favor, verifique el número ingresado.`);
          throw new Error(`NIT duplicado: ${cliente.nit}`);
        }
      }

      if (isEdit) {
        await actualizarCliente(cliente.id, cliente);
      } else {
        await crearCliente(cliente);
      }
      await fetchData();
    } catch (e) {
      console.error("Error guardando cliente", e);
      
      // Si es error de NIT duplicado, no mostrar alert adicional (ya se mostró arriba)
      if (e.message && e.message.includes('NIT duplicado')) {
        return;
      }
      
      // Para otros errores, mostrar mensaje apropiado
      const msg = e?.response?.data?.message 
               || e?.response?.data?.error
               || "No se pudo guardar el cliente. Revisa consola.";
      showError(msg);
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
      showError(backendMsg); // mensaje enviado desde el backend
    } else if (e?.response?.status === 409) {
      showError("No se puede eliminar el cliente porque tiene registros asociados (por ejemplo, órdenes o créditos).");
    } else {
      showError("No se pudo eliminar el cliente. Revisa consola.");
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
      <ConfirmDialog />
    </div>
  );
}
