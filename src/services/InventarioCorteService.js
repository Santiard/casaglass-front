import { api } from "../lib/api";

/**
 * Obtiene inventario de cortes agrupado por sede
 * GET /api/inventario-cortes/agrupado
 */
export async function listarInventarioCortesAgrupado() {
  const { data } = await api.get("/inventario-cortes/agrupado");
  return data;
}
