const TIPOS_UNIDAD_VALIDOS = new Set(["UNID", "PERFIL", "MT", "CM"]);

export function esSedeUno(sedeId) {
  return Number(sedeId) === 1;
}

export function esSedeSinControlCortes(sedeId) {
  return Number(sedeId) === 1;
}

export function normalizarTipoUnidad(valor, fallback = "") {
  const tipo = String(valor ?? "").trim().toUpperCase();
  if (TIPOS_UNIDAD_VALIDOS.has(tipo)) {
    return tipo;
  }
  return fallback;
}

export function obtenerTipoUnidadItem(item) {
  return normalizarTipoUnidad(
    item?.tipoUnidad ??
      item?.producto?.tipoUnidad ??
      item?.producto?.tipo ??
      item?.tipo ??
      ""
  );
}

export function obtenerCmBaseItem(item) {
  const valor = item?.cmBase ?? item?.producto?.cmBase ?? null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function tieneDatosUnidadSedeUno(item) {
  return Boolean(obtenerTipoUnidadItem(item) || obtenerCmBaseItem(item) !== null);
}

export function formatearTipoUnidad(item) {
  const tipoUnidad = obtenerTipoUnidadItem(item);
  const cmBase = obtenerCmBaseItem(item);

  if (!tipoUnidad) {
    return "-";
  }

  if (tipoUnidad === "CM" && cmBase) {
    return `${tipoUnidad} (${cmBase} cm)`;
  }

  return tipoUnidad;
}
