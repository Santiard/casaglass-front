// Configuración de kits por categoría
// Cada kit contiene los códigos de los productos que lo componen
// Estos productos se agregarán todos al carrito cuando se haga clic en "Kit"

export const KITS_POR_CATEGORIA = {
  // Categoría 5020
  "5020": [
    "144",
    "194",
    "193",
    "192",
    "147",
    "349"
  ],
  
  // Categoría 744
  "744": [
"144",
    "392",
    "387",
    "393",
    "388",
    "391",
    "389",
    "390"
  ],
  
  // Categoría 7038
  "7038": [
    "700",
    "775",
    "702",
    "704",
    "705",
    "703"
  ],
  
  // Categoría 8025
  "8025": [
    "151",
    "150",
    "152",
    "190",
    "191",
    "156",
    "157"
  ]
};

/**
 * Obtiene los códigos de productos que componen el kit para una categoría
 * @param {string} categoriaNombre - Nombre de la categoría
 * @returns {string[]} Array de códigos de productos
 */
export const obtenerCodigosKit = (categoriaNombre) => {
  return KITS_POR_CATEGORIA[categoriaNombre] || [];
};

