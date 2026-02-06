// src/pages/FacturasPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import FacturasTable from "../componets/FacturasTable";
import FacturaImprimirModal from "../modals/FacturaImprimirModal.jsx";
import "../styles/ClientesPage.css";
import {
  listarFacturas,
  listarFacturasTabla,
  eliminarFactura,
  marcarFacturaComoPagada,
} from "../services/FacturasService";
import { listarClientes } from "../services/ClientesService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getTodayLocalDate } from "../lib/dateUtils.js";

export default function FacturasPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [data, setData] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [facturaImprimir, setFacturaImprimir] = useState(null);
  const [isImprimirModalOpen, setIsImprimirModalOpen] = useState(false);

  const fetchData = useCallback(async (page = 1, size = 20) => {
    setLoading(true);
    try {
      // Si no es admin, filtrar por sede del usuario
      const params = {
        ...(isAdmin ? {} : { sedeId }),
        page: page,
        size: size
      };
      // Intentar primero con tabla optimizada, fallback a básico
      try {
        const response = await listarFacturasTabla(params);
        
        // El backend retorna un objeto con paginación si se envían page y size
        if (response && typeof response === 'object' && 'content' in response) {
          // Respuesta paginada
          const content = Array.isArray(response.content) ? response.content : [];
          setData(content);
          setTotalElements(response.totalElements || 0);
          setTotalPages(response.totalPages || 1);
          setCurrentPage(response.page || page);
        } else if (Array.isArray(response)) {
          // Respuesta sin paginación (fallback - array directo)
          setData(response);
          setTotalElements(response.length);
          setTotalPages(1);
          setCurrentPage(1);
        } else {
          // Respuesta inesperada
          setData([]);
          setTotalElements(0);
          setTotalPages(1);
          setCurrentPage(1);
        }
      } catch (tablaError) {
        const arr = await listarFacturas();
        setData(Array.isArray(arr) ? arr : []);
        setTotalElements(Array.isArray(arr) ? arr.length : 0);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (e) {
      // Error listando facturas
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sedeId]);

  const fetchClientes = useCallback(async () => {
    try {
      const arr = await listarClientes();
      setClientes(arr);
    } catch (e) {
      // Error listando clientes
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData(1, pageSize);
    fetchClientes();
  }, [isAdmin, sedeId]); // Solo recargar si cambian estos valores

  // Recargar cuando cambie la página o el tamaño
  useEffect(() => {
    if (currentPage > 0 && pageSize > 0) {
      fetchData(currentPage, pageSize);
    }
  }, [currentPage, pageSize, fetchData]);

  // Handler para cambios de página desde FacturasTable
  const handlePageChange = useCallback((newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setCurrentPage(1);
      fetchData(1, newSize); // Resetear a página 1 si cambia el tamaño
    } else {
      setCurrentPage(newPage);
      fetchData(newPage, newSize);
    }
  }, [pageSize, fetchData]);

  // Manejar verificación (marcar como pagada)
  const handleVerificar = async (factura) => {
    try {
      const fechaPago = getTodayLocalDate(); // YYYY-MM-DD
      await marcarFacturaComoPagada(factura.id, fechaPago);
      showSuccess("Factura marcada como pagada.");
      await fetchData(currentPage, pageSize);
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo marcar como pagada.";
      showError(msg);
    }
  };

  // Manejar impresión de factura
  const handleImprimir = (factura) => {
    setFacturaImprimir(factura);
    setIsImprimirModalOpen(true);
  };

  // Manejar edición de factura
  const handleEditar = async () => {
    // Recargar datos después de editar
    await fetchData(currentPage, pageSize);
  };

  // Manejar eliminación de factura
  const handleEliminar = async (factura) => {
    const confirmacion = await confirm({
      title: "Eliminar Factura",
      message: `¿Estás seguro de que deseas eliminar la factura #${factura.numeroFactura || factura.numero || factura.id}?\n\nEsta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger"
    });
    
    if (!confirmacion) return;
    
    try {
      await eliminarFactura(factura.id);
      showSuccess("Factura eliminada exitosamente.");
      await fetchData(currentPage, pageSize);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || "No se pudo eliminar la factura.";
      showError(msg);
    }
  };

  // Manejar confirmación de todas las facturas pendientes
  const handleConfirmarTodas = async () => {
    // Filtrar facturas pendientes
    const facturasPendientes = data.filter(f => {
      const estado = f.estado?.toLowerCase() || 'pendiente';
      return estado === 'pendiente';
    });

    if (facturasPendientes.length === 0) {
      showError("No hay facturas pendientes para confirmar.");
      return;
    }

    const confirmacion = await confirm({
      title: "Confirmar Todas las Facturas",
      message: `¿Estás seguro de que deseas confirmar ${facturasPendientes.length} factura(s) pendiente(s)?\n\nEsta acción marcará todas las facturas pendientes como pagadas.`,
      confirmText: "Confirmar Todas",
      cancelText: "Cancelar",
      type: "info"
    });
    
    if (!confirmacion) return;

    try {
      const fechaPago = getTodayLocalDate(); // YYYY-MM-DD
      let confirmadas = 0;
      let errores = 0;

      // Confirmar todas las facturas pendientes
      for (const factura of facturasPendientes) {
        try {
          await marcarFacturaComoPagada(factura.id, fechaPago);
          confirmadas++;
        } catch (e) {
          errores++;
        }
      }

      if (confirmadas > 0) {
        showSuccess(`Se confirmaron ${confirmadas} factura(s) exitosamente.${errores > 0 ? ` ${errores} factura(s) tuvieron errores.` : ''}`);
        await fetchData(currentPage, pageSize);
      } else {
        showError("No se pudo confirmar ninguna factura.");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron confirmar las facturas.";
      showError(msg);
    }
  };

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <FacturasTable
          data={data}
          loading={loading}
          clientes={clientes}
          onVerificar={handleVerificar}
          onEliminar={handleEliminar}
          onImprimir={handleImprimir}
          onEditar={handleEditar}
          onConfirmarTodas={handleConfirmarTodas}
          // Paginación del servidor
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          serverSidePagination={true}
        />
      </div>
      <ConfirmDialog />
      
      {/* Modal de impresión de factura */}
      <FacturaImprimirModal
        factura={facturaImprimir}
        isOpen={isImprimirModalOpen}
        onClose={() => {
          setIsImprimirModalOpen(false);
          setFacturaImprimir(null);
        }}
      />
    </div>
  );
}
