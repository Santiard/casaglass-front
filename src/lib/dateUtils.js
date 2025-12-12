/**
 * Utilidades para manejo de fechas sin problemas de zona horaria
 * Todas las funciones usan métodos locales para evitar conversiones a UTC
 */

/**
 * Obtener la fecha de hoy en formato YYYY-MM-DD (zona horaria local)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function getTodayLocalDate() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * Convertir cualquier valor de fecha a formato YYYY-MM-DD (zona horaria local)
 * Asegura que la fecha se envíe sin conversión de zona horaria
 * @param {string|Date} val - Valor de fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function toLocalDateOnly(val) {
  if (!val) {
    // Si no hay valor, usar la fecha de hoy en formato local
    return getTodayLocalDate();
  }
  
  // Si ya está en formato YYYY-MM-DD, devolverlo directamente (sin conversión)
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  
  // Si es un objeto Date u otro formato, convertir a fecha local sin zona horaria
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    // Si la conversión falla, usar la fecha de hoy
    return getTodayLocalDate();
  }
  
  // Usar métodos de fecha local para evitar problemas de zona horaria
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

