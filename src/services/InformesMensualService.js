import { api, isApiDebugEnabled } from "../lib/api.js";

/**
 * @typedef {'PREVIEW' | 'CERRADO'} OrigenInformeMensual
 *
 * @typedef {Object} InformeMensualResponseDTO
 * @property {OrigenInformeMensual} origen
 * @property {{ id: number; nombre: string; direccion: string | null; ciudad: string | null }} sede
 * @property {{ year: number; month: number; mesIso: string; mesNombre: string }} periodo
 * @property {number | null} ventasMes
 * @property {number | null} dineroRecogidoMes
 * @property {number | null} deudasMes
 * @property {number | null} deudasActivasTotales
 * @property {number | null} valorInventario
 * @property {{ numeroMin: number | null; numeroMax: number | null; cantidad: number; criterio: string } | null} ordenesVentasMes
 *
 * @typedef {Object} InformeMensualCierreRequestDTO
 * @property {number} sedeId
 * @property {number} year
 * @property {number} month
 * @property {boolean | null} [confirmar]
 *
 * @typedef {Object} InformeMensualCierreListItemDTO
 * @property {number} id
 * @property {number} year
 * @property {number} month
 * @property {string} mesIso
 * @property {number | null} [ventasMes]
 * @property {number | null} [dineroRecogidoMes]
 */

const unwrapData = (raw) => {
  if (raw && typeof raw === "object" && raw.value != null && !Array.isArray(raw.value)) {
    return raw.value;
  }
  return raw;
};

const unwrapArray = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.value)) return raw.value;
  return [];
};

const InformesMensualService = {
  /**
   * Vista previa: cálculo en vivo (no persiste). origen será "PREVIEW".
   * @param {{ sedeId: number; year: number; month: number }} params
   * @returns {Promise<InformeMensualResponseDTO>}
   */
  preview: async ({ sedeId, year, month }) => {
    const response = await api.get("informes/mensual/preview", {
      params: { sedeId, year, month },
    });
    if (isApiDebugEnabled()) {
      console.log("[InformesMensualService] preview →", response.data);
    }
    return unwrapData(response.data);
  },

  /**
   * Cierre guardado para sede + año + mes. origen "CERRADO". 404 si no existe.
   * @param {{ sedeId: number; year: number; month: number }} params
   * @returns {Promise<InformeMensualResponseDTO>}
   */
  obtenerCierre: async ({ sedeId, year, month }) => {
    const response = await api.get("informes/mensual/cierre", {
      params: { sedeId, year, month },
    });
    if (isApiDebugEnabled()) {
      console.log("[InformesMensualService] obtenerCierre →", response.data);
    }
    return unwrapData(response.data);
  },

  /**
   * Persistir snapshot del mes. confirmar debe ser true o null (false → 400 en backend).
   * @param {InformeMensualCierreRequestDTO} body
   * @returns {Promise<InformeMensualResponseDTO>}
   */
  cerrarMes: async (body) => {
    const response = await api.post("informes/mensual/cierre", body);
    if (isApiDebugEnabled()) {
      console.log("[InformesMensualService] cerrarMes ←", response.data);
    }
    return unwrapData(response.data);
  },

  /**
   * Listado de cierres del año para una sede (mes ascendente).
   * @param {{ sedeId: number; year: number }} params
   * @returns {Promise<InformeMensualCierreListItemDTO[]>}
   */
  listarCierresAnio: async ({ sedeId, year }) => {
    const response = await api.get("informes/mensual/cierres", {
      params: { sedeId, year },
    });
    if (isApiDebugEnabled()) {
      console.log("[InformesMensualService] listarCierresAnio →", response.data);
    }
    return unwrapArray(response.data);
  },
};

export default InformesMensualService;
