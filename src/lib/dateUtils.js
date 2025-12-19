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
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  
  // Si es un objeto Date, extraer componentes usando métodos locales
  if (val instanceof Date) {
    const año = val.getFullYear();
    const mes = String(val.getMonth() + 1).padStart(2, '0');
    const dia = String(val.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }
  
  // Para cualquier otro caso (string en otro formato, timestamp, etc.)
  // NO usar new Date(val) porque causa problemas de timezone
  // En su lugar, usar la fecha de hoy para evitar errores
  console.warn('toLocalDateOnly: formato de fecha no reconocido, usando fecha actual:', val);
  return getTodayLocalDate();
}

/**
 * Parsear un string de fecha en formato YYYY-MM-DD a objeto Date
 * Evita problemas de timezone usando el constructor de Date con componentes
 * @param {string} s - String en formato YYYY-MM-DD
 * @returns {Date|null} Objeto Date o null si el string es inválido
 */
export function parseLocalDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/**
 * Calcular diferencia en días entre una fecha y hoy
 * @param {Date} dateObj - Objeto Date a comparar
 * @returns {number} Número de días de diferencia (positivo si es en el pasado)
 */
export function diffDaysFromToday(dateObj) {
  if (!dateObj || isNaN(dateObj)) return Infinity;
  const ms = Date.now() - dateObj.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}





