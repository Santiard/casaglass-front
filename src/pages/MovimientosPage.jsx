import { useEffect, useState } from "react";
import MovimientosTable from "../componets/MovimientosTable";

import { listarSedes } from "../services/SedesService.js";
import { listarProductos } from "../services/ProductosService.js";
import {
  listarTraslados,
  crearTraslado,
  actualizarCabecera,
  eliminarTraslado,
  confirmarTraslado,
} from "../services/TrasladosService.js";

export default function MovimientosPage() {
  const [traslados, setTraslados] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({ sedes: null, productos: null, traslados: null });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrors({ sedes: null, productos: null, traslados: null });

      const results = await Promise.allSettled([
        listarSedes(),       // 0
        listarProductos(),   // 1
        listarTraslados(),   // 2
      ]);

      // Sedes
      if (results[0].status === "fulfilled") {
        setSedes(Array.isArray(results[0].value) ? results[0].value : []);
      } else {
        const e = results[0].reason;
        console.error("Error /sedes:", { status: e?.response?.status, data: e?.response?.data, err: e });
        setErrors(prev => ({ ...prev, sedes: e?.response?.data || e?.message || "Error listando sedes" }));
      }

      // Productos
      if (results[1].status === "fulfilled") {
        setCatalogoProductos(Array.isArray(results[1].value) ? results[1].value : []);
      } else {
        const e = results[1].reason;
        console.error("Error /productos:", { status: e?.response?.status, data: e?.response?.data, err: e });
        setErrors(prev => ({ ...prev, productos: e?.response?.data || e?.message || "Error listando productos" }));
      }

      // Traslados
      if (results[2].status === "fulfilled") {
        setTraslados(Array.isArray(results[2].value) ? results[2].value : []);
      } else {
        const e = results[2].reason;
        console.error("Error /traslados:", { status: e?.response?.status, data: e?.response?.data, err: e });
        setErrors(prev => ({ ...prev, traslados: e?.response?.data || e?.message || "Error listando traslados" }));
      }

      setLoading(false);
    })();
  }, []);

  const reloadTraslados = async () => {
    try {
      setLoading(true);
      const res = await listarTraslados();
      setTraslados(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error recargando /traslados:", { status: e?.response?.status, data: e?.response?.data, err: e });
      setErrors(prev => ({ ...prev, traslados: e?.response?.data || e?.message || "Error recargando traslados" }));
    } finally {
      setLoading(false);
    }
  };

  const onCrear = async (payload) => {
    try {
      await crearTraslado(payload);
      await reloadTraslados();
    } catch (e) {
      console.error("Error creando traslado:", { status: e?.response?.status, data: e?.response?.data, err: e });
      alert(e?.response?.data || e.message || "No se pudo crear el traslado.");
      throw e;
    }
  };

  const onActualizar = async (id, payload) => {
    try {
      await actualizarCabecera(id, payload);
      await reloadTraslados();
    } catch (e) {
      console.error("Error actualizando traslado:", { status: e?.response?.status, data: e?.response?.data, err: e });
      alert(e?.response?.data || e.message || "No se pudo actualizar el traslado.");
      throw e;
    }
  };

  const onEliminar = async (id) => {
    if (!confirm("¿Eliminar este traslado?")) return;
    try {
      await eliminarTraslado(id);
      await reloadTraslados();
    } catch (e) {
      console.error("Error eliminando traslado:", { status: e?.response?.status, data: e?.response?.data, err: e });
      alert(e?.response?.data || e.message || "No se pudo eliminar el traslado.");
    }
  };

  const onConfirmar = async (id, trabajadorId) => {
    try {
      await confirmarTraslado(id, trabajadorId);
      await reloadTraslados();
    } catch (e) {
      console.error("Error confirmando traslado:", { status: e?.response?.status, data: e?.response?.data, err: e });
      alert(e?.response?.data || e.message || "No se pudo confirmar el traslado.");
    }
  };

  return (
    <div>
      <h1>Traslados</h1>

      {/* Mensajes rápidos si algo falló (no bloquean la UI) */}
      {(errors.sedes || errors.productos || errors.traslados) && (
        <div style={{ marginBottom: 12 }}>
          {errors.sedes && <div className="alert error">Error sedes: {String(errors.sedes)}</div>}
          {errors.productos && <div className="alert error">Error productos: {String(errors.productos)}</div>}
          {errors.traslados && <div className="alert error">Error traslados: {String(errors.traslados)}</div>}
        </div>
      )}

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
    </div>
  );
}
