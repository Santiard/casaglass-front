import{api} from "../lib/api";

// GET /api/productos?categoria=Vidrio&q=templado
export async function listarProductos(params = {}) {
  const { data } = await api.get("/productos", { params });
  return data;
}

export async function crearProducto(payload) {
  const { data } = await api.post("/productos", payload);
  return data;
}
export async function actualizarProducto(id, payload) {
  const { data } = await api.put(`/productos/${id}`, payload);
  return data;
}
export async function eliminarProducto(id) {
  await api.delete(`/productos/${id}`);
}
