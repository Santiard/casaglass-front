// src/pages/MovimientosPage.jsx
import { useEffect, useState, useCallback } from "react";
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
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadTraslados = useCallback(async (page = 1, size = 20) => {
    try {
      setLoading(true);
      // Si no es admin, filtrar por sede del usuario
      const params = {
        ...(isAdmin ? {} : { sedeId }),
        page: page,
        size: size
      };
      const response = await listarTraslados(params);
      
      // El backend retorna un objeto con paginación si se envían page y size
      if (response && typeof response === 'object' && 'content' in response) {
        // Respuesta paginada
        setTraslados(Array.isArray(response.content) ? response.content : []);
        setTotalElements(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.page || page);
      } else {
        // Respuesta sin paginación (fallback)
        const arr = Array.isArray(response) ? response : [];
        setTraslados(arr);
        setTotalElements(arr.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error("Error cargando traslados:", e);
      showError("No se pudieron cargar los traslados.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sedeId, showError]);

  useEffect(() => {
    (async () => {
      try {
        // Cargar sedes y productos (no necesitan paginación)
        const [sedesRes, prodsRes] = await Promise.all([
          listarSedes(),       // GET /api/sedes  => [{id, nombre, ...}]
          listarProductos(),   // GET /api/productos => [{id, nombre, codigo}]
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
              color: p.color, // Incluir color para filtro
            }))
        );
        // Cargar traslados con paginación
        await loadTraslados(1, pageSize);
      } catch (e) {
        console.error("Error cargando datos:", e);
        showError("No se pudieron cargar traslados/sedes/productos.");
      }
    })();
  }, [isAdmin, sedeId]); // Solo recargar si cambian estos valores

  // Recargar cuando cambie la página o el tamaño
  useEffect(() => {
    if (currentPage > 0 && pageSize > 0) {
      loadTraslados(currentPage, pageSize);
    }
  }, [currentPage, pageSize, loadTraslados]);

  const reloadTraslados = async () => {
    await loadTraslados(currentPage, pageSize);
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

  // Handler para cambios de página desde MovimientosTable
  const handlePageChange = useCallback((newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setCurrentPage(1);
      loadTraslados(1, newSize); // Resetear a página 1 si cambia el tamaño
    } else {
      setCurrentPage(newPage);
      loadTraslados(newPage, newSize);
    }
  }, [pageSize, loadTraslados]);

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
        // Paginación del servidor
        totalElements={totalElements}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        serverSidePagination={true}
      />
      <ConfirmDialog />
    </div>
  );
}
