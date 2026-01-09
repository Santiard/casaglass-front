import React, { useEffect, useState, useCallback } from "react";
import OrdenesTable from "../componets/OrdenesTable";
import "../styles/Table.css";
import {
  listarOrdenes,
  listarOrdenesTabla,
  crearOrden,
  actualizarOrden,
  anularOrden,
  marcarOrdenComoFacturada,
  confirmarVenta,
  obtenerOrden,
  obtenerOrdenDetalle,
} from "../services/OrdenesService";
import { crearFactura, marcarFacturaComoPagada, obtenerFacturaPorOrden } from "../services/FacturasService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getTodayLocalDate } from "../lib/dateUtils.js";

export default function OrdenesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = useCallback(async (page = 1, size = 20) => {
    setLoading(true);
    try {
      // Si no es admin, filtrar por sede del usuario
      const params = {
        ...(isAdmin ? {} : { sedeId }),
        page: page,
        size: size
      };
      // Usar SIEMPRE el endpoint de tabla con paginación
      const response = await listarOrdenesTabla(params);
      
      // El backend retorna un objeto con paginación si se envían page y size
      if (response && typeof response === 'object' && 'content' in response) {
        // Respuesta paginada
        const norm = Array.isArray(response.content)
          ? response.content.map((o) => ({
            ...o,
            facturada: Boolean(o.facturada ?? o.factura ?? o.facturaId ?? o.numeroFactura),
          }))
        : [];
      setData(norm);
        setTotalElements(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.page || page);
      } else {
        // Respuesta sin paginación (fallback)
        const arr = Array.isArray(response) ? response : [];
        const norm = arr.map((o) => ({
          ...o,
          facturada: Boolean(o.facturada ?? o.factura ?? o.facturaId ?? o.numeroFactura),
        }));
        setData(norm);
        setTotalElements(arr.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error("Error listando órdenes", e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sedeId]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData(1, pageSize);
  }, [isAdmin, sedeId]); // Solo recargar si cambian estos valores

  //  Guardar (editar o crear)
  const handleGuardar = async (orden, isEdit) => {
    try {
      // Si orden es null, solo refrescar (modal ya guardó)
      if (!orden) {
        await fetchData();
        return;
      }

      let updated;
      if (isEdit) {
        updated = await actualizarOrden(orden.id, orden);
      } else {
        updated = await crearOrden(orden);
      }

      await fetchData(); // refrescar tabla
    } catch (e) {
      console.error("Error guardando orden", e);
      console.error("Response data:", e?.response?.data);
      console.error("Status:", e?.response?.status);
      showError("No se pudo guardar la orden. Revisa consola.");
    }
  };

  //  Confirmar venta (cambiar venta de false a true)
  const handleConfirmarVenta = async (orden) => {
    const esCotizacion = Boolean(orden.venta === false);
    const mensaje = esCotizacion
      ? `¿Estás seguro de que deseas confirmar la cotización #${orden.numero} como venta?\n\nEsta acción marcará la orden como vendida y la convertirá automáticamente en CRÉDITO (ya que no se pueden agregar métodos de pago al confirmar). Luego podrás hacer abonos para pagarla.`
      : `¿Estás seguro de que deseas confirmar la venta de la orden #${orden.numero}?\n\nEsta acción marcará la orden como vendida y permitirá manejarla en contabilidad.`;
    
    const confirmacion = await confirm({
      title: "Confirmar Venta",
      message: mensaje,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      type: "info"
    });
    
    if (!confirmacion) return;
    
    try {
      // Obtener la orden completa antes de confirmarla para asegurar que tenemos todos los datos
      // USAR obtenerOrdenDetalle en lugar de obtenerOrden para tener los productoId completos
      let ordenCompleta = orden;
      try {
        const detalleResponse = await obtenerOrdenDetalle(orden.id);
        // El endpoint detalle puede devolver {orden, items, ...} o directamente la orden
        // Validar la estructura antes de usar
        if (detalleResponse && detalleResponse.orden) {
          ordenCompleta = detalleResponse.orden;
          // Asegurarse de que los items estén en la orden
          if (detalleResponse.items && Array.isArray(detalleResponse.items)) {
            ordenCompleta.items = detalleResponse.items;
          }
        } else if (detalleResponse) {
          // Si la respuesta es directamente la orden
          ordenCompleta = detalleResponse;
        }
      } catch (err) {
        console.warn(" No se pudo obtener la orden completa, usando la de la tabla:", err);
        // Continuar con la orden de la tabla si falla
      }
      
      const response = await confirmarVenta(orden.id, ordenCompleta);
      
      if (esCotizacion) {
        showSuccess(`Cotización #${response.numero || orden.numero} confirmada como venta y convertida a CRÉDITO exitosamente. Ahora puedes hacer abonos para pagarla.`);
      } else {
        showSuccess(`Orden #${response.numero || orden.numero} confirmada como venta exitosamente.`);
      }
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      console.error("Error confirmando venta", e);
      const msg = e?.response?.data?.message || e?.message || "No se pudo confirmar la venta.";
      showError(msg);
    }
  };

  //  Anular orden
  const handleAnular = async (orden) => {
    const confirmacion = await confirm({
      title: "Anular Orden",
      message: `¿Estás seguro de que deseas anular la orden #${orden.numero}?\n\nEsta acción cambiará el estado de la orden a 'Anulada'.`,
      confirmText: "Anular",
      cancelText: "Cancelar",
      type: "warning"
    });
    
    if (!confirmacion) return;
    
    try {
      const response = await anularOrden(orden.id);
      
      // Mostrar mensaje de éxito
      showSuccess(`Orden #${response.numero} anulada correctamente. Estado: ${response.estado}`);
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      console.error("Error anulando orden", e);
      const msg = e?.response?.data?.message || "No se pudo anular la orden.";
      showError(msg);
    }
  };

  //  Facturar orden
  const handleFacturar = async (facturaPayload, isModal = false) => {
    try {
      // Si facturaPayload es null, solo refrescar los datos (caso de facturación múltiple)
      if (!facturaPayload) {
        await fetchData();
        return;
      }
      
      let facturaResponse;
      let yaTeniaFactura = false;

      // Crear factura (manejar caso 400: ya existe)
      try {
        facturaResponse = await crearFactura(facturaPayload);
        // Intentar marcarla como pagada inmediatamente
        try {
          if (facturaResponse?.id) {
            const hoy = getTodayLocalDate(); // YYYY-MM-DD
            await marcarFacturaComoPagada(facturaResponse.id, hoy);
          }
        } catch (pagoErr) {
          console.warn(" No se pudo marcar como pagada inmediatamente:", pagoErr?.response?.data || pagoErr?.message);
        }
      } catch (err) {
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.error || err?.response?.data?.message || "";
        if (status === 400 && /ya tiene una factura/i.test(String(errMsg))) {
          yaTeniaFactura = true;
          // Intentar obtener la factura por orden y marcarla como pagada
          try {
            const facturaExistente = await obtenerFacturaPorOrden(facturaPayload.ordenId);
            if (facturaExistente?.id) {
              const hoy = getTodayLocalDate(); // YYYY-MM-DD
              await marcarFacturaComoPagada(facturaExistente.id, hoy);
            }
          } catch (lookupErr) {
            console.warn(" No se pudo marcar como pagada la factura existente:", lookupErr?.response?.data || lookupErr?.message);
          }
        } else {
          throw err;
        }
      }

      // Marcar como facturada solo si no falló el paso anterior por "ya tenía"
      try {
        const ordenResponse = await marcarOrdenComoFacturada(facturaPayload.ordenId, true);
        const numeroFactura = facturaResponse?.numeroFactura || ordenResponse?.numeroFactura || facturaResponse?.numero || "";
        if (!yaTeniaFactura) {
          showSuccess(`Factura creada exitosamente. Número: ${numeroFactura || "N/A"}`);
        }
      } catch (err) {
        // Si ya tenía factura, podemos ignorar este error; de lo contrario, reportar
        if (!yaTeniaFactura) {
          console.warn(" Error al marcar como facturada:", err?.response?.data || err?.message);
        }
      }

      // Refrescar tabla de órdenes SIEMPRE
      await fetchData();
    } catch (e) {
      console.error("Error facturando orden", e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || "No se pudo crear la factura.";
      if (!/ya tiene una factura/i.test(String(msg))) {
        showError(msg);
      }
    }
  };

  // Handler para cambios de página desde OrdenesTable
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

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <OrdenesTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}
          onAnular={handleAnular}
          onCrear={(o) => handleGuardar(o, false)}
          onFacturar={handleFacturar}
          onConfirmarVenta={handleConfirmarVenta}
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
    </div>
  );
}
