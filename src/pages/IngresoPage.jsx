// src/pages/IngresosPage.jsx
import { useEffect, useState } from "react";
import IngresosTable from "../componets/IngresoTable.jsx";
import IngresoDetalleModal from "../modals/IngresoDetalleModal.jsx";
import { listarIngresos, crearIngresoDesdeForm, actualizarIngresoDesdeForm, eliminarIngreso, procesarIngreso } from "../services/IngresosService.js";
import { listarProveedores } from "../services/ProveedoresService.js";
import { listarProductos } from "../services/ProductosService.js";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function IngresosPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const [seleccionado, setSeleccionado] = useState(null);
  const [ingresos, setIngresos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadIngresos = async () => {
    setLoading(true);
    try {
      const list = await listarIngresos();
      setIngresos(list || []);
    } catch (e) {
      console.error("Error listar ingresos:", {
        status: e?.response?.status,
        data: e?.response?.data,
        url: e?.config?.url,
        params: e?.config?.params,
      });
      showError(e?.response?.data?.message || "No se pudieron cargar los ingresos.");
    } finally {
      setLoading(false);
    }
  };

  const loadAux = async () => {
    try {
      const [prov, prods] = await Promise.all([
        listarProveedores(),
        listarProductos(),
      ]);
      

      
      setProveedores(prov || []);
      // Filtrar cortes: excluir productos que tengan largoCm (son cortes)
      // Solo incluir productos regulares (sin largoCm)
      setCatalogo(
        (prods || [])
          .filter(p => p.largoCm === undefined || p.largoCm === null) // Excluir cortes
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo ?? "",
            categoria: p.categoria?.nombre ?? p.categoria ?? "", // ✅ Extraemos el nombre si es objeto
            largoCm: p.largoCm, // Incluir para que el filtro del modal funcione
          }))
      );
    } catch (e) {
      console.error(e);
      showError("No se pudieron cargar proveedores / catálogo.");
    }
  };

  useEffect(() => {
    loadIngresos();
    loadAux();
  }, []);

  const onCrear = async (payload) => {
    try {
      await crearIngresoDesdeForm(payload);
      await loadIngresos();
    } catch (e) {
      console.error("Error en onCrear:", e);
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onActualizar = async (id, payload) => {
    try {
      await actualizarIngresoDesdeForm(id, payload);
      await loadIngresos();
    } catch (e) {
      console.error("Error en onActualizar:", e);
      throw e; // Re-lanza el error para que lo maneje el componente padre
    }
  };
  const onEliminar = async (id) => {
    await eliminarIngreso(id);
    await loadIngresos();
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
      await loadIngresos(); // Recargar la tabla
      showSuccess(`Ingreso #${id} marcado como procesado correctamente`);
      console.log("✅ Resultado del procesamiento:", resultado);
    } catch (e) {
      console.error("Error al procesar ingreso:", e);
      console.error("📋 Detalle del error:", e?.response?.data);
      
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

  return (
    <div
      className="page-ingresos"
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <IngresosTable
        data={ingresos}
        loading={loading}
        proveedores={proveedores}
        catalogoProductos={catalogo}
        onVerDetalles={(ing) => setSeleccionado(ing)} // 👈 abre modal
        onCrear={onCrear}
        onActualizar={onActualizar}
        onEliminar={onEliminar}
        onProcesar={onProcesar}
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