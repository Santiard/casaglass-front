// src/pages/MovimientosPage.jsx
import { useEffect, useState } from "react";
import MovimientosTable from "../componets/MovimientosTable";

// Estos dos servicios deben existir en tu proyecto.
// Si la ruta difiere, ajusta adentro de cada servicio.
import { listarSedes } from "../services/SedesService.js";
import { listarProductos } from "../services/ProductosService.js";

import {
  listarTraslados,
  crearTraslado,
  actualizarCabecera,
  eliminarTraslado,
  confirmarTraslado,
} from "../services/TrasladosService.js";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function MovimientosPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [traslados, setTraslados] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Si no es admin, filtrar por sede del usuario
        const params = isAdmin ? {} : { sedeId };
        const [sedesRes, prodsRes, trasladosRes] = await Promise.all([
          listarSedes(),       // GET /api/sedes  => [{id, nombre, ...}]
          listarProductos(),   // GET /api/productos => [{id, nombre, codigo}]
          listarTraslados(params),   // GET /api/traslados-movimientos?sedeId=X
        ]);
        setSedes(Array.isArray(sedesRes) ? sedesRes : []);
        // Filtrar cortes: excluir productos que tengan largoCm (son cortes)
        // Los cortes nunca se compran o trasladan, solo se quedan en la sede donde son generados
        setCatalogoProductos(
          (prodsRes || [])
            .filter(p => p.largoCm === undefined || p.largoCm === null) // Excluir cortes
            .map((p) => ({
              id: p.id,
              nombre: p.nombre,
              codigo: p.codigo ?? "",
              categoria: p.categoria?.nombre ?? p.categoria ?? "", //  Extraemos el nombre si es objeto
            }))
        );
        setTraslados(Array.isArray(trasladosRes) ? trasladosRes : []);
      } catch (e) {
        console.error("Error cargando datos:", e);
        showError("No se pudieron cargar traslados/sedes/productos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, sedeId, showError]);

  const reloadTraslados = async () => {
    try {
      setLoading(true);
      // Si no es admin, filtrar por sede del usuario
      const params = isAdmin ? {} : { sedeId };
      const res = await listarTraslados(params);
      setTraslados(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error recargando traslados:", e);
      showError("No se pudieron recargar los traslados.");
    } finally {
      setLoading(false);
    }
  };

  // Crear
  const onCrear = async (payload) => {
    try {
      await crearTraslado(payload);
      await reloadTraslados();
    } catch (e) {
      console.error("Error creando traslado:", e);
      throw new Error(e?.response?.data || e?.message || "No se pudo crear el traslado.");
    }
  };

  // Actualizar cabecera
  const onActualizar = async (id, payload) => {
    try {
      await actualizarCabecera(id, payload);
      await reloadTraslados();
    } catch (e) {
      console.error("Error actualizando traslado:", e);
      throw new Error(e?.response?.data || e?.message || "No se pudo actualizar el traslado.");
    }
  };

  // Confirmar llegada
  const onConfirmar = async (id, trabajadorId) => {
    try {
      const response = await confirmarTraslado(id, trabajadorId);
      await reloadTraslados();
      return response; // Retornamos la respuesta para mostrar el mensaje de éxito
    } catch (e) {
      console.error("Error confirmando traslado:", e);
      throw e; // Re-lanzamos el error para que lo maneje el componente
    }
  };

  // Eliminar
  const onEliminar = async (id) => {
    try {
      await eliminarTraslado(id);
      await reloadTraslados();
    } catch (e) {
      console.error("Error eliminando traslado:", e);
      showError(e?.response?.data || "No se pudo eliminar el traslado.");
    }
  };

  return (
    <div>
      <MovimientosTable
        data={traslados}
        loading={loading}
        rowsPerPage={10}
        sedes={sedes}
        catalogoProductos={catalogoProductos}
        onCrear={onCrear}
        onActualizar={onActualizar}
        onEliminar={onEliminar}
        onConfirmar={onConfirmar}
      />
      <ConfirmDialog />
    </div>
  );
}
