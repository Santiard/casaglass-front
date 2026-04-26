# API: variante de producto por código + color

Contrato propuesto para que el **backend** exponga una variante concreta (mismo artículo en otro color: otro `id`, otro precio, etc.). El **front** ya incluye `obtenerProductoVariantePorCodigoYColor` en `ProductosService.js` apuntando aquí.

---

## Endpoint

| Método | Ruta |
|--------|------|
| `GET` | `/api/productos/variante` |

*(El prefijo `/api` es el que ya usa Spring en Casaglass; ajustar solo si vuestro `context-path` difiere.)*

---

## Query parameters

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `codigo` | Sí | Código del producto (trim; ideal comparar en BD sin sensibilidad a espacios si así lo guardan). |
| `color` | Sí | Color de la variante. Valores alineados con la app: **MATE**, **BLANCO**, **NEGRO**, **NA** (y **BRONCE** si también existe en catálogo). Normalizar a mayúsculas al comparar. |
| `nombre` | Sí | Tras trim, **igualdad exacta** con el nombre en BD (case-insensitive). Sin contención parcial: separa entero (“VIDRIO X”) de corte (“VIDRIO X CORTE de 50cm” o el texto canónico que use el catálogo). Si falta o va vacío → **400** `PARAMETROS_REQUERIDOS`. El front debe enviar siempre el nombre de la línea; si en órdenes difiere del catálogo → **404** hasta alinear. |

---

## Respuesta exitosa

**`200 OK`** — Cuerpo: **un** objeto producto en el mismo formato que usan hoy otros GET (id, `codigo`, `nombre`, `color`, `precio1`, `precio2`, `precio3`, `categoria`, `tipo`, `tipoUnidad`, etc.), para poder rellenar la línea de la orden y precios por sede.

Ejemplo mínimo esperado por el front:

```json
{
  "id": 12345,
  "codigo": "144",
  "nombre": "ENGANCHE",
  "color": "BLANCO",
  "precio1": 100000,
  "precio2": 105000,
  "precio3": 110000
}
```

*(Los nombres exactos de campos deben coincidir con el DTO que ya devuelve `/inventario-completo` o `GET /productos/{id}`.)*

---

## Errores

| Código | Cuándo |
|--------|--------|
| **400** | Falta `codigo`, `color` o `nombre` (vacío), o `color` no permitido. |
| **404** | No existe ninguna fila `Producto` con código + color + nombre (match exacto). |
| **409** | Más de un registro en catálogo con el mismo código + color + nombre (dato duplicado anómalo). |

---

## Lógica sugerida (backend)

1. Validar `codigo`, `color` y `nombre` no vacíos tras trim; si no → **400** `PARAMETROS_REQUERIDOS`.
2. Normalizar `codigo`, `color` (mayúsculas) y `nombre` (trim; comparar nombre con igualdad exacta ignorando mayúsculas, **sin** contains parcial).
3. Buscar filas donde coincidan código + color + nombre.
4. Si **0** filas → **404**. Si **>1** → **409** (duplicados en catálogo).
5. Entero y corte se distinguen por el nombre canónico en BD, aunque compartan código y color.

---

## Seguridad

Misma autenticación/autorización que `GET /api/productos` o `GET /api/inventario-completo` para usuarios que pueden crear/editar órdenes.

---

## Referencia front

- `src/services/ProductosService.js` → `obtenerProductoVariantePorCodigoYColor`

Cuando el backend esté listo, en **OrdenModal** se puede: al cambiar el `<select>` de color, llamar a esta función y actualizar `productoId`, `color`, `precioUnitario` y totales.
