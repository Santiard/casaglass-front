import {api} from "../lib/api.js";

export const listarCategorias = async () => {
  const { data } = await api.get("/categorias");
  return data;
};
