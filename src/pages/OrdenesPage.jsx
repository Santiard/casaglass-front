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
} from "../services/OrdenesService";
import { crearFactura, marcarFacturaComoPagada, obtenerFacturaPorOrden } from "../services/FacturasService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function OrdenesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Usar SIEMPRE el endpoint de tabla
      const arr = await listarOrdenesTabla();
      const norm = Array.isArray(arr)
        ? arr.map((o) => ({
            ...o,
            facturada: Boolean(o.facturada ?? o.factura ?? o.facturaId ?? o.numeroFactura),
          }))
        : [];
      setData(norm);
    } catch (e) {
      console.error("Error listando órdenes", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🔹 Guardar (editar o crear)
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

  // 🔹 Confirmar venta (cambiar venta de false a true)
  const handleConfirmarVenta = async (orden) => {
    const confirmacion = await confirm({
      title: "Confirmar Venta",
      message: `¿Estás seguro de que deseas confirmar la venta de la orden #${orden.numero}?\n\nEsta acción marcará la orden como vendida y permitirá manejarla en contabilidad.`,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      type: "info"
    });
    
    if (!confirmacion) return;
    
    try {
      const response = await confirmarVenta(orden.id, orden);
      
      showSuccess(`Orden #${response.numero || orden.numero} confirmada como venta exitosamente.`);
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      console.error("Error confirmando venta", e);
      const msg = e?.response?.data?.message || e?.message || "No se pudo confirmar la venta.";
      showError(msg);
    }
  };

  // 🔹 Anular orden
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

  // 🔹 Facturar orden
  const handleFacturar = async (facturaPayload, isModal = false) => {
    try {
      
      let facturaResponse;
      let yaTeniaFactura = false;

      // Crear factura (manejar caso 400: ya existe)
      try {
        facturaResponse = await crearFactura(facturaPayload);
        // Intentar marcarla como pagada inmediatamente
        try {
          if (facturaResponse?.id) {
            const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            await marcarFacturaComoPagada(facturaResponse.id, hoy);
          }
        } catch (pagoErr) {
          console.warn("⚠️ No se pudo marcar como pagada inmediatamente:", pagoErr?.response?.data || pagoErr?.message);
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
              const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              await marcarFacturaComoPagada(facturaExistente.id, hoy);
            }
          } catch (lookupErr) {
            console.warn("⚠️ No se pudo marcar como pagada la factura existente:", lookupErr?.response?.data || lookupErr?.message);
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
          console.warn("⚠️ Error al marcar como facturada:", err?.response?.data || err?.message);
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
        />
      </div>
      <ConfirmDialog />
    </div>
  );
}
