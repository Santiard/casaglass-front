/**
 * Utilidades UI alineadas con DOCUMETNACION_TRASLADOS.md (respuestas GET, errores 409).
 */

/**
 * Texto para mostrar el producto entero a descontar en Insula (si aplica).
 * @param {object} d - Elemento de detalles[] del traslado
 */
export function etiquetaProductoDescInsula(d) {
  if (!d) return "—";
  const nested = d.productoInventarioADescontarSede1;
  const idPlano = d.productoInventarioADescontarSede1Id ?? nested?.id;
  if (idPlano == null && !nested?.nombre) return "—";
  const nom = nested?.nombre;
  const cod = nested?.codigo;
  if (nom) return cod ? `${nom} (${cod})` : String(nom);
  return `#${idPlano}`;
}

export function trasladoDetallesTienenDescInsula(detalles) {
  if (!Array.isArray(detalles)) return false;
  return detalles.some(
    (d) =>
      d?.productoInventarioADescontarSede1Id != null ||
      d?.productoInventarioADescontarSede1 != null
  );
}

/**
 * Mensaje legible para errores de API de traslados (409 INVENTARIO_INSUFICIENTE, 400 texto, etc.).
 * @param {{ response?: { status?: number, data?: unknown }, message?: string }} error - Típico error de axios
 */
export function formatMensajeErrorTraslado(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (data == null || data === "") {
    return error?.message || "Error al procesar la solicitud.";
  }

  if (typeof data === "string") {
    if (data.startsWith("INVENTARIO_INSUFICIENTE:")) {
      return "⚠️ " + data.replace(/^INVENTARIO_INSUFICIENTE:\s*/i, "").trim();
    }
    return data;
  }

  if (typeof data === "object") {
    const esInv =
      data.error === "INVENTARIO_INSUFICIENTE" ||
      status === 409 ||
      (typeof data.message === "string" &&
        data.message.toUpperCase().includes("INVENTARIO_INSUFICIENTE"));

    if (esInv) {
      let msg =
        (typeof data.message === "string" && data.message) ||
        "Inventario insuficiente.";
      if (msg.startsWith("INVENTARIO_INSUFICIENTE:")) {
        msg = msg.replace(/^INVENTARIO_INSUFICIENTE:\s*/i, "").trim();
      }
      const disp = data.cantidadDisponible;
      const req = data.cantidadRequerida;
      if (disp != null && req != null) {
        msg += ` Disponible: ${disp}, requerida: ${req}.`;
      }
      if (data.productoId != null) msg += ` Producto #${data.productoId}.`;
      if (data.sedeId != null) msg += ` Sede ${data.sedeId}.`;
      return "⚠️ " + msg.trim();
    }

    if (typeof data.message === "string") return data.message;
  }

  try {
    return typeof data === "object" ? JSON.stringify(data) : String(data);
  } catch {
    return "Error al procesar la respuesta del servidor.";
  }
}
