// src/pages/IngresosPage.jsx
import { useEffect, useState, useCallback } from "react";
import IngresosTable from "../componets/IngresoTable.jsx";
import IngresoDetalleModal from "../modals/IngresoDetalleModal.jsx";
import { listarIngresos, crearIngresoDesdeForm, actualizarIngresoDesdeForm, eliminarIngreso, procesarIngreso, obtenerIngreso } from "../services/IngresosService.js";
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
        console.error("Error del backend (lazy initialization):", {
          status: e?.response?.status,
          message: errorMessage,
          url: e?.config?.url,
        });
        showError("Error del servidor: El backend no puede cargar los detalles de los ingresos. Por favor, contacte al administrador del sistema.");
      } else {
        console.error("Error listar ingresos:", {
          status: e?.response?.status,
          data: e?.response?.data,
          url: e?.config?.url,
          params: e?.config?.params,
        });
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
      console.error("Error cargando datos:", e);
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
      console.error("Error en onCrear:", e);
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onActualizar = async (id, payload) => {
    try {
      await actualizarIngresoDesdeForm(id, payload);
      await loadIngresos(currentPage, pageSize);
    } catch (e) {
      console.error("Error en onActualizar:", e);
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onEliminar = async (id) => {
    await eliminarIngreso(id);
    await loadIngresos(currentPage, pageSize);
  };

  const onProcesar = async (id) => {
    const confirmacion = await confirm({
      title: "Procesar Ingreso",
      message: `¿Estás seguro de que deseas marcar el ingreso #${id} como procesado?\n\nEsta acción cambiará el estado del ingreso a 'Procesado' y no se podrá editar posteriormente.`,
      confirmText: "Procesar",
      cancelText: "Cancelar",
      type: "warning"
    });
    
    if (!confirmacion) return;
    
    try {
      const resultado = await procesarIngreso(id);
      await loadIngresos(currentPage, pageSize); // Recargar la tabla
      showSuccess(`Ingreso #${id} marcado como procesado correctamente`);
    } catch (e) {
      console.error("Error al procesar ingreso:", e);
      console.error(" Detalle del error:", e?.response?.data);
      
      let errorMsg = "Error desconocido";
      if (e?.response?.data) {
        if (typeof e.response.data === 'string') {
          errorMsg = e.response.data;
        } else if (e.response.data.message) {
          errorMsg = e.response.data.message;
        } else {
          errorMsg = JSON.stringify(e.response.data);
        }
      } else if (e?.message) {
        errorMsg = e.message;
      }
      
      showError(`Error al procesar el ingreso: ${errorMsg}`);
    }
  };

  // Handler para ver detalles - obtiene el ingreso completo con detalles
  const onVerDetalles = async (ing) => {
    try {
      setLoading(true);
      const ingresoCompleto = await obtenerIngreso(ing.id);
      console.log("📦 Ingreso completo obtenido:", ingresoCompleto);
      setSeleccionado(ingresoCompleto);
    } catch (e) {
      console.error("Error al obtener detalles del ingreso:", e);
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
        onProcesar={onProcesar}
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