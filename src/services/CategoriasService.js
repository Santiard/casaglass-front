import {api} from "../lib/api.js";

export const listarCategorias = async () => {
  const { data } = await api.get("/categorias");
  return data;
};

export const crearCategoria = async (nombre) => {
  const { data } = await api.post("/categorias", { nombre });
  return data;
};