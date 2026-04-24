/**
 * Insula 1 → 2/3: el detalle debe llevar producto.id = PK del Corte en BD
 * (corteRepository.existsById). El back resuelve/crea el Corte desde el perfil entero.
 */
import { resolverCorteParaTraslado } from "../services/CortesService.js";

function idCorteDesdeRespuesta(data) {
  if (data == null) return NaN;
  const raw = data.id ?? data.corteId ?? data.corte?.id ?? data.productoId;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/**
 * Obtiene el id del Corte vía POST /api/cortes/resolver-para-traslado.
 * No depende de categoria.id en el DTO del catálogo del front.
 *
 * @param {object} productoBase — ítem del catálogo (debe reflejar el perfil entero; usar productoBase.id)
 * @param {number} medidaCm — largo del corte en cm
 * @returns {Promise<number>} id del Corte en BD
 */
export async function resolverOCrearCorteParaTrasladoInsula(productoBase, medidaCm) {
  const med = Number(medidaCm);
  if (!Number.isFinite(med) || med <= 0) {
    throw new Error("Medida de corte inválida.");
  }
  const productoPerfilId = Number(productoBase?.id);
  if (!Number.isFinite(productoPerfilId) || productoPerfilId <= 0) {
    throw new Error("Producto perfil (entero) inválido.");
  }

  const data = await resolverCorteParaTraslado({
    productoPerfilId,
    medidaCm: med,
  });
  const corteBdId = idCorteDesdeRespuesta(data);
  if (!Number.isFinite(corteBdId) || corteBdId <= 0) {
    throw new Error("El servidor no devolvió el id del Corte.");
  }

  console.info("[Traslado] Corte Insula→2/3: resolver-para-traslado", {
    productoPerfilId,
    medidaCm: med,
    corteBdId,
  });
  return corteBdId;
}
