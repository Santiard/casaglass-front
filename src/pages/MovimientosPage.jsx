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

export default function MovimientosPage() {
  const [traslados, setTraslados] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [sedesRes, prodsRes, trasladosRes] = await Promise.all([
          listarSedes(),       // GET /api/sedes  => [{id, nombre, ...}]
          listarProductos(),   // GET /api/productos => [{id, nombre, codigo}]
          listarTraslados(),   // GET /api/traslados
        ]);
        setSedes(Array.isArray(sedesRes) ? sedesRes : []);
        setCatalogoProductos(Array.isArray(prodsRes) ? prodsRes : []);
        setTraslados(Array.isArray(trasladosRes) ? trasladosRes : []);
      } catch (e) {
        console.error("Error cargando datos:", e);
        alert("No se pudieron cargar traslados/sedes/productos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadTraslados = async () => {
    try {
      setLoading(true);
      const res = await listarTraslados();
      setTraslados(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error recargando traslados:", e);
      alert("No se pudieron recargar los traslados.");
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
      await confirmarTraslado(id, trabajadorId);
      await reloadTraslados();
    } catch (e) {
      console.error("Error confirmando traslado:", e);
      alert(e?.response?.data || e?.message || "No se pudo confirmar el traslado.");
    }
  };

  // Eliminar
  const onEliminar = async (id) => {
    try {
      await eliminarTraslado(id);
      await reloadTraslados();
    } catch (e) {
      console.error("Error eliminando traslado:", e);
      alert(e?.response?.data || "No se pudo eliminar el traslado.");
    }
  };

  return (
    <div>
      <h1>Traslados</h1>
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
