// src/pages/IngresosPage.jsx
import { useEffect, useState, useCallback } from "react";
import IngresosTable from "../componets/IngresoTable.jsx";
import IngresoDetalleModal from "../modals/IngresoDetalleModal.jsx";
import { listarIngresos, crearIngresoDesdeForm, actualizarIngresoDesdeForm, eliminarIngreso, obtenerIngreso, procesarIngreso } from "../services/IngresosService.js";
import { listarProveedores } from "../services/ProveedoresService.js";
import { listarInventarioCompleto } from "../services/InventarioService.js";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function IngresosPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [seleccionado, setSeleccionado] = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadIngresos = useCallback(async (page = 1, size = 20) => {
    setLoading(true);
    try {
      // Si no es admin, filtrar por sede del usuario
      const params = {
        ...(isAdmin ? {} : { sedeId }),
        page: page,
        size: size
      };
      const response = await listarIngresos(params);
      
      // El backend retorna un objeto con paginación si se envían page y size
      if (response && typeof response === 'object' && 'content' in response) {
        // Respuesta paginada
        setIngresos(Array.isArray(response.content) ? response.content : []);
        setTotalElements(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.page || page);
      } else {
        // Respuesta sin paginación (fallback)
        const arr = Array.isArray(response) ? response : [];
        setIngresos(arr);
        setTotalElements(arr.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (e) {
      // Evitar múltiples logs del mismo error
      const errorMessage = e?.response?.data?.message || e?.message || "No se pudieron cargar los ingresos.";
      
      // Si es el error de lazy initialization, mostrar mensaje más específico
      if (errorMessage.includes("lazily initialize") || errorMessage.includes("no Session")) {
        showError("Error del servidor: El backend no puede cargar los detalles de los ingresos. Por favor, contacte al administrador del sistema.");
      } else {
        showError(errorMessage);
      }
      
      // En caso de error, establecer valores por defecto para evitar estados inconsistentes
      setIngresos([]);
      setTotalElements(0);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sedeId, showError]);

  const loadAux = async () => {
    try {
      const prov = await listarProveedores();
      setProveedores(prov || []);
      // No cargar productos aquí - se cargarán en el modal al seleccionar categoría
      setCatalogo([]);
    } catch (e) {
      showError(e?.response?.data?.message || "No se pudieron cargar los datos");
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadIngresos(1, pageSize);
    loadAux();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, sedeId]); // Solo recargar si cambian estos valores

  // Recargar cuando cambie la página o el tamaño
  useEffect(() => {
    if (currentPage > 0 && pageSize > 0) {
      loadIngresos(currentPage, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]); // Removida dependencia de loadIngresos para evitar recargas innecesarias

  // Handler para cambios de página desde IngresosTable
  const handlePageChange = useCallback((newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setCurrentPage(1);
      loadIngresos(1, newSize); // Resetear a página 1 si cambia el tamaño
    } else {
      setCurrentPage(newPage);
      loadIngresos(newPage, newSize);
    }
  }, [pageSize, loadIngresos]);

  const onCrear = async (payload) => {
    try {
      await crearIngresoDesdeForm(payload);
      await loadIngresos(currentPage, pageSize);
    } catch (e) {
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onActualizar = async (id, payload) => {
    try {
      await actualizarIngresoDesdeForm(id, payload);
      await loadIngresos(currentPage, pageSize);
    } catch (e) {
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onEliminar = async (id) => {
    try {
      await eliminarIngreso(id);
      await loadIngresos(currentPage, pageSize);
      showSuccess(`Ingreso #${id} eliminado correctamente.`);
    } catch (e) {
      const errorMsg = e?.message || e?.response?.data?.error || e?.response?.data?.message || "No se pudo eliminar el ingreso";
      showError(errorMsg);
      throw e;
    }
  };

  const onConfirmar = async (ingreso) => {
    try {
      await procesarIngreso(ingreso.id);
      showSuccess(`Ingreso #${ingreso.id} confirmado correctamente.`);
      await loadIngresos(currentPage, pageSize);
    } catch (e) {
      const msg = e?.message || e?.response?.data?.message || e?.response?.data?.error || "No se pudo confirmar el ingreso.";
      showError(msg);
      throw e;
    }
  };

  // ❌ ELIMINADAS: onProcesar y onDesprocesar ya no son necesarias
  // El backend procesa automáticamente los ingresos al crearlos

  // Handler para ver detalles - obtiene el ingreso completo con detalles
  const onVerDetalles = async (ing) => {
    try {
      setLoading(true);
      const ingresoCompleto = await obtenerIngreso(ing.id);
      setSeleccionado(ingresoCompleto);
    } catch (e) {
      showError("No se pudieron cargar los detalles del ingreso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-ingresos">
      <IngresosTable
        data={ingresos}
        loading={loading}
        proveedores={proveedores}
        catalogoProductos={catalogo}
        onVerDetalles={onVerDetalles} // 👈 ahora llama a la función que obtiene el ingreso completo
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

      {/* Modal de detalles */}
      {seleccionado && (
        <IngresoDetalleModal
          ingreso={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}

      {/* Modal de confirmación */}
      <ConfirmDialog />
    </div>
  );
}