// src/services/IngresosService.js
import { api } from "../lib/api.js";

// === Utils ===
export function toLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Convierte el form del modal al payload que espera el backend
function mapFormAIngresoAPI(form = {}) {
  console.log("🔍 mapFormAIngresoAPI - Formulario recibido:", form);
  
  if (!form || typeof form !== "object") {
    throw new Error("Formulario vacío o inválido.");
  }

  console.log("🔍 proveedorId del form:", form.proveedorId, "tipo:", typeof form.proveedorId);
  const proveedorIdNum = Number(form.proveedorId);
  console.log("🔍 proveedorIdNum convertido:", proveedorIdNum);
  
  if (!Number.isFinite(proveedorIdNum) || proveedorIdNum <= 0) {
    console.error("❌ Proveedor inválido:", { proveedorId: form.proveedorId, proveedorIdNum });
    throw new Error("Proveedor inválido. Debes seleccionar un proveedor.");
  }

  const fecha = form.fecha
    ? toLocalDateString(form.fecha.length === 16 ? new Date(form.fecha) : new Date(form.fecha))
    : toLocalDateString(new Date());

  const detalles = Array.isArray(form.detalles) ? form.detalles : [];
  if (detalles.length === 0) throw new Error("Debes agregar al menos un producto.");

  const mappedDetalles = detalles.map((d, idx) => {
    const prodId = Number(d?.producto?.id);
    const cantidad = Number(d?.cantidad);
    const costoUnitario = Number(d?.costoUnitario);

    if (!Number.isFinite(prodId) || prodId <= 0) {
      throw new Error(`Detalle #${idx + 1}: producto inválido.`);
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      throw new Error(`Detalle #${idx + 1}: cantidad debe ser ≥ 1.`);
    }
    if (!Number.isFinite(costoUnitario) || costoUnitario <= 0) {
      throw new Error(`Detalle #${idx + 1}: costo unitario debe ser > 0.`);
    }

    return {
      producto: { id: prodId },
      cantidad,
      costoUnitario,
    };
  });

  const payload = {
    fecha,
    proveedor: { id: proveedorIdNum },
    numeroFactura: (form.numeroFactura || "").trim(),
    observaciones: (form.observaciones || "").trim(),
    detalles: mappedDetalles,
    // totalCosto/procesado los calcula/gestiona el backend
  };

  console.log("✅ Payload final para enviar al backend:", payload);
  return payload;
}

// === API CRUD ===
export async function listarIngresos() {
  const { data } = await api.get("/ingresos");
  return data;
}

export async function obtenerIngreso(id) {
  const { data } = await api.get(`/ingresos/${id}`);
  return data;
}

export async function crearIngresoDesdeForm(form) {
  const payload = mapFormAIngresoAPI(form);
  const { data } = await api.post("/ingresos", payload);
  return data;
}

export async function actualizarIngresoDesdeForm(id, form) {
  const payload = mapFormAIngresoAPI(form);
  const { data } = await api.put(`/ingresos/${id}`, payload);
  return data;
}

export async function eliminarIngreso(id) {
  await api.delete(`/ingresos/${id}`);
}
