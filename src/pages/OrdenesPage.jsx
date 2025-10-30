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
} from "../services/OrdenesService";
import { crearFactura } from "../services/FacturasService";

export default function OrdenesPage() {
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
        console.log("Refrescando tabla...");
        await fetchData();
        return;
      }

      console.log("Guardando orden con payload:", orden);

      let updated;
      if (isEdit) {
        updated = await actualizarOrden(orden.id, orden);
        console.log("✅ Orden actualizada:", updated);
      } else {
        updated = await crearOrden(orden);
        console.log("✅ Orden creada:", updated);
      }

      await fetchData(); // refrescar tabla
    } catch (e) {
      console.error("Error guardando orden", e);
      console.error("Response data:", e?.response?.data);
      console.error("Status:", e?.response?.status);
      alert("No se pudo guardar la orden. Revisa consola.");
    }
  };

  // 🔹 Anular orden
  const handleAnular = async (orden) => {
    if (!window.confirm(`¿Seguro que deseas anular la orden #${orden.numero}?`)) return;
    try {
      console.log(`🔄 Anulando orden ID: ${orden.id}`);
      const response = await anularOrden(orden.id);
      console.log("✅ Respuesta de anulación:", response);
      
      // Mostrar mensaje de éxito
      alert(`${response.message}\nOrden #${response.numero} - Estado: ${response.estado}`);
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      console.error("Error anulando orden", e);
      const msg = e?.response?.data?.message || "No se pudo anular la orden.";
      alert(msg);
    }
  };

  // 🔹 Facturar orden
  const handleFacturar = async (facturaPayload, isModal = false) => {
    try {
      console.log(`📄 Facturando desde modal:`, facturaPayload);
      
      console.log("📦 Payload de factura:", facturaPayload);
      
      let facturaResponse;
      let yaTeniaFactura = false;

      // Crear factura (manejar caso 400: ya existe)
      try {
        facturaResponse = await crearFactura(facturaPayload);
        console.log("✅ Factura creada:", facturaResponse);
      } catch (err) {
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.error || err?.response?.data?.message || "";
        if (status === 400 && /ya tiene una factura/i.test(String(errMsg))) {
          console.log("ℹ️ La orden ya tenía una factura. Continuando sin alertas...");
          yaTeniaFactura = true;
        } else {
          throw err;
        }
      }

      // Marcar como facturada solo si no falló el paso anterior por "ya tenía"
      try {
        console.log(`🔄 Marcando orden ${facturaPayload.ordenId} como facturada...`);
        const ordenResponse = await marcarOrdenComoFacturada(facturaPayload.ordenId, true);
        console.log("✅ Orden marcada como facturada:", ordenResponse);
        const numeroFactura = facturaResponse?.numeroFactura || ordenResponse?.numeroFactura || facturaResponse?.numero || "";
        if (!yaTeniaFactura) {
          alert(`Factura creada exitosamente\nNúmero: ${numeroFactura || "N/A"}`);
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
        alert(msg);
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
        />
      </div>
    </div>
  );
}
