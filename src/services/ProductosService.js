// src/services/ProductosService.js
import{api} from "../lib/api";

const base = "/productos";

export async function getCategorias() {
  const { data } = await api.get(`${base}/categorias`);
  return data || [];
}

// GET /api/productos?categoria=Vidrio&q=templado
export async function listarProductos(params = {}) {
  const { data } = await api.get("/productos", { params });
  return data;
}

export async function crearProducto(payload) {
  try {
    const { data } = await api.post("/productos", payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return data;
  } catch (error) {
    console.error("Error en crearProducto:", error);
    console.error("Response data:", error.response?.data);
    throw error;
  }
}
export async function actualizarProducto(id, payload) {
  console.log("=== ACTUALIZANDO PRODUCTO ===");
  console.log("ID:", id);
  console.log("Payload completo:", JSON.stringify(payload, null, 2));
  try {
    const { data } = await api.put(`/productos/${id}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log("Actualización exitosa:", data);
    return data;
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    console.error("Response data:", error.response?.data);
    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    throw error;
  }
}
export async function eliminarProducto(id) {
  await api.delete(`/productos/${id}`);
}
