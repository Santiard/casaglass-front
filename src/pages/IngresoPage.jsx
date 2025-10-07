// src/pages/IngresosPage.jsx
import { useEffect, useState } from "react";
import IngresosTable from "../componets/IngresoTable.jsx";
import IngresoDetalleModal from "../modals/IngresoDetalleModal.jsx";
import { listarIngresos, crearIngresoDesdeForm, actualizarIngresoDesdeForm, eliminarIngreso } from "../services/IngresosService.js";
import { listarProveedores } from "../services/ProveedoresService.js";
import { listarProductos } from "../services/ProductosService.js";

export default function IngresosPage() {
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
      alert(e?.response?.data?.message || "No se pudieron cargar los ingresos.");
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
      setCatalogo(
        (prods || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo ?? "",
        }))
      );
    } catch (e) {
      console.error(e);
      alert("No se pudieron cargar proveedores / catálogo.");
    }
  };

  useEffect(() => {
    loadIngresos();
    loadAux();
  }, []);

  const onCrear = async (payload) => {
    await crearIngresoDesdeForm(payload);
    await loadIngresos();
  };
  const onActualizar = async (id, payload) => {
    await actualizarIngresoDesdeForm(id, payload);
    await loadIngresos();
  };
  const onEliminar = async (id) => {
    await eliminarIngreso(id);
    await loadIngresos();
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
      />

      {/* Modal de detalles */}
      {seleccionado && (
        <IngresoDetalleModal
          ingreso={seleccionado}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </div>
  );
}