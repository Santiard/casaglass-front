// src/services/IngresosService.js
import { api } from "../lib/api.js";

/* ===========================
   Utilidades exportadas
=========================== */

/** Convierte un Date a "YYYY-MM-DDTHH:mm" (LocalDateTime sin zona) */
export function toLocalDateTimeString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(date);

  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());

  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/* ===========================
   Endpoints de lectura
=========================== */

export async function listarIngresos() {
  const { data } = await api.get("/ingresos");
  return data;
}

export async function obtenerIngreso(id) {
  const { data } = await api.get(`/ingresos/${id}`);
  return data;
}

/* ===========================
   Endpoints de escritura
   (reciben el "form" del modal)
=========================== */

export async function crearIngresoDesdeForm(form) {
  const payload = mapFormAIngresoAPI(form);
  const { data } = await api.post("/ingresos", payload);
  return data;
}

export async function actualizarIngresoDesdeForm(id, form) {
  const payload = mapFormAIngresoAPI(form, id);
  const { data } = await api.put(`/ingresos/${id}`, payload);
  return data;
}

export async function eliminarIngreso(id) {
  const { data } = await api.delete(`/ingresos/${id}`);
  return data;
}

/* ===========================
   Mapper centralizado
=========================== */

function mapFormAIngresoAPI(form, id) {
  const proveedorIdNum = Number(form.proveedorId);

  const detallesApi = (form.detalles || [])
    .map((d) => ({
      producto: { id: Number(d.producto?.id) },
      cantidad: Number(d.cantidad),
      costoUnitario: Number(d.costoUnitario),
    }))
    .filter(
      (d) =>
        Number.isFinite(d.producto.id) &&
        d.producto.id > 0 &&
        Number.isFinite(d.cantidad) &&
        d.cantidad >= 1 &&
        Number.isFinite(d.costoUnitario) &&
        d.costoUnitario >= 0
    );

  // Asegura que la fecha llegue como LocalDateTime "YYYY-MM-DDTHH:mm"
  // Si te llega con segundos o Z, córtala o normalízala aquí.
  const fecha = (form.fecha || "").length >= 16
    ? (form.fecha || "").slice(0, 16)
    : toLocalDateTimeString(new Date());

  return {
    ...(id ? { id: Number(id) } : {}),
    fecha,
    proveedor: { id: proveedorIdNum }, // el backend espera objeto con id
    numeroFactura: (form.numeroFactura || "").trim(),
    observaciones: (form.observaciones || "").trim(),
    detalles: detallesApi,
    // No enviar totalCosto ni procesado: el backend los calcula/gestiona
  };
}
