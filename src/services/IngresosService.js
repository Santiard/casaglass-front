// src/services/ingresos.js
import { api } from "../lib/api";

/* Helpers de fecha (Spring LocalDateTime sin zona "YYYY-MM-DDTHH:mm:ss") */
const pad = (n) => String(n).padStart(2, "0");
export const toLocalDateTimeString = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear(), m = pad(d.getMonth() + 1), day = pad(d.getDate());
  const hh = pad(d.getHours()), mm = pad(d.getMinutes()), ss = pad(d.getSeconds());
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
};
export const toInputLocal = (dateLike) => {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear(), m = pad(d.getMonth() + 1), day = pad(d.getDate());
  const hh = pad(d.getHours()), mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

const base = "/ingresos";

export const ingresosApi = {
  listar:        () => api.get(base).then(r => r.data),
  obtener:       (id) => api.get(`${base}/${id}`).then(r => r.data),
  porProveedor:  (proveedorId) => api.get(`${base}/proveedor/${proveedorId}`).then(r => r.data),
  noProcesados:  () => api.get(`${base}/no-procesados`).then(r => r.data),
  porFecha:      ({ fechaInicio, fechaFin }) =>
    api.get(`${base}/por-fecha`, { params: { fechaInicio, fechaFin } }).then(r => r.data),

  crear:         (payload) => api.post(base, payload).then(r => r.data),
  actualizar:    (id, payload) => api.put(`${base}/${id}`, payload).then(r => r.data),
  eliminar:      (id) => api.delete(`${base}/${id}`),

  procesar:      (id) => api.post(`${base}/${id}/procesar`).then(r => r.data),
  reprocesar:    (id) => api.post(`${base}/${id}/reprocesar`).then(r => r.data),
};
