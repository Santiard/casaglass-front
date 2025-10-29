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
      // Intentar primero con tabla optimizada, fallback a básico
      try {
        const arr = await listarOrdenesTabla();
        setData(arr);
      } catch (tablaError) {
        console.warn("Endpoint /ordenes/tabla no disponible, usando /ordenes básico:", tablaError);
        const arr = await listarOrdenes();
        setData(arr);
      }
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
      
      // Crear factura
      const facturaResponse = await crearFactura(facturaPayload);
      console.log("✅ Factura creada:", facturaResponse);
      
      // Marcar orden como facturada
      console.log(`🔄 Marcando orden ${facturaPayload.ordenId} como facturada...`);
      const ordenResponse = await marcarOrdenComoFacturada(facturaPayload.ordenId, true);
      console.log("✅ Orden marcada como facturada:", ordenResponse);
      
      const numeroFactura = facturaResponse.numeroFactura || ordenResponse.numeroFactura || facturaResponse.numero || "N/A";
      alert(`Factura creada exitosamente\nNúmero: ${numeroFactura}`);
      
      // Refrescar tabla de órdenes
      await fetchData();
    } catch (e) {
      console.error("Error facturando orden", e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || "No se pudo crear la factura.";
      alert(msg);
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
