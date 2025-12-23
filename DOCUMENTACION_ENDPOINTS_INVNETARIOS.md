═══════════════════════════════════════════════════════════════════════════════
📦 DOCUMENTACIÓN: ENDPOINTS DE INVENTARIO
═══════════════════════════════════════════════════════════════════════════════

Fecha: 2025-12-22
Versión: 1.0
Backend: Spring Boot + JPA/Hibernate + MariaDB


═══════════════════════════════════════════════════════════════════════════════
📋 ÍNDICE DE ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════

**LECTURA (GET)**
1. GET /api/inventario-completo              - Catálogo completo con filtros y paginación
2. GET /api/productos                        - Productos normales con filtros
3. GET /api/cortes-inventario-completo       - Solo cortes de vidrio
4. GET /api/inventario/agrupado              - Inventario agrupado por producto
5. GET /api/inventario                       - Inventario por sede o producto
6. GET /api/productos-vidrio                 - Solo productos de vidrio

**ESCRITURA (PUT/POST)**
7. PUT /api/inventario/{id}                  - Actualizar por ID de inventario
8. PUT /api/inventario/{productoId}/{sedeId} - Actualizar producto en sede específica
9. PUT /api/inventario/producto/{productoId} - Actualizar producto en todas las sedes


═══════════════════════════════════════════════════════════════════════════════
🔍 ENDPOINTS DE LECTURA (GET)
═══════════════════════════════════════════════════════════════════════════════


───────────────────────────────────────────────────────────────────────────────
1. GET /api/inventario-completo ✅ CON FILTROS Y PAGINACIÓN
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna el catálogo completo de productos (productos normales + vidrios) con 
información de inventario en las 3 sedes.

**Características:**
- ✅ Filtros avanzados disponibles
- ✅ Paginación opcional
- ✅ Incluye productos normales y vidrios
- ✅ Muestra cantidades por sede (Ínsula, Centro, Patios)

**Filtros disponibles (todos opcionales):**

| Parámetro   | Tipo    | Descripción                                           |
|-------------|---------|-------------------------------------------------------|
| categoriaId | Long    | Filtrar por ID de categoría                          |
| categoria   | String  | Filtrar por nombre de categoría (búsqueda parcial)   |
| tipo        | String  | Filtrar por tipo (VIDRIO, ALUMINIO, ACCESORIO, etc.) |
| color       | String  | Filtrar por color (CLARO, BRONCE, GRIS, etc.)        |
| codigo      | String  | Búsqueda parcial por código (case-insensitive)       |
| nombre      | String  | Búsqueda parcial por nombre (case-insensitive)       |
| sedeId      | Long    | Filtrar por sede (1=Ínsula, 2=Centro, 3=Patios)      |
| conStock    | Boolean | true para productos con stock > 0 (requiere sedeId)  |
| sinStock    | Boolean | true para productos sin stock (requiere sedeId)      |
| page        | Integer | Número de página (default: sin paginación)           |
| size        | Integer | Tamaño de página (default: 100, máximo: 500)         |

**Respuesta:**
- **Sin paginación:** `List<ProductoInventarioCompletoDTO>`
- **Con paginación:** `PageResponse<ProductoInventarioCompletoDTO>`

**Estructura de ProductoInventarioCompletoDTO:**
```json
{
  "id": 123,
  "codigo": "VID-TEMP-6MM",
  "nombre": "Vidrio Templado 6mm",
  "descripcion": "Vidrio templado de seguridad",
  "categoria": {
    "id": 1,
    "nombre": "Vidrios"
  },
  "tipo": "VIDRIO",
  "color": "CLARO",
  "esVidrio": true,
  "mm": 6.0,
  "m1": 2.44,
  "m2": 3.66,
  "cantidadInsula": 15,
  "cantidadCentro": 8,
  "cantidadPatios": 22,
  "cantidadTotal": 45,
  "costo": 50000.0,
  "precio1": 80000.0,
  "precio2": 75000.0,
  "precio3": 70000.0
}
```

**Ejemplos de uso:**

```bash
# Todos los productos sin filtros
GET /api/inventario-completo

# Productos con stock en Ínsula
GET /api/inventario-completo?sedeId=1&conStock=true

# Productos de categoría 1 con paginación
GET /api/inventario-completo?categoriaId=1&page=1&size=100

# Búsqueda por nombre con stock en Centro
GET /api/inventario-completo?nombre=templado&sedeId=2&conStock=true&page=1&size=50

# Productos sin stock en Patios
GET /api/inventario-completo?sedeId=3&sinStock=true

# Vidrios tipo VIDRIO, color BRONCE
GET /api/inventario-completo?tipo=VIDRIO&color=BRONCE
```

**Validaciones:**
- ✅ `conStock` o `sinStock` requieren `sedeId` (error 400 si falta)
- ✅ Parámetros tipo y color deben ser valores válidos del enum


───────────────────────────────────────────────────────────────────────────────
2. GET /api/productos ✅ CON FILTROS Y PAGINACIÓN
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna solo productos normales (NO incluye vidrios ni cortes). Ideal para 
gestión de productos estándar.

**Características:**
- ✅ Filtros avanzados disponibles
- ✅ Paginación opcional
- ✅ Ordenamiento configurable
- ❌ NO incluye productos de vidrio

**Filtros disponibles:**

| Parámetro   | Tipo    | Descripción                                           |
|-------------|---------|-------------------------------------------------------|
| categoriaId | Long    | Filtrar por ID de categoría                          |
| categoria   | String  | Filtrar por nombre de categoría (búsqueda parcial)   |
| tipo        | String  | Filtrar por tipo (enum TipoProducto)                 |
| color       | String  | Filtrar por color (enum ColorProducto)               |
| codigo      | String  | Búsqueda parcial por código (case-insensitive)       |
| nombre      | String  | Búsqueda parcial por nombre (case-insensitive)       |
| conStock    | Boolean | true para productos con stock > 0 (requiere sedeId)  |
| sedeId      | Long    | Filtrar por sede para verificar stock                |
| page        | Integer | Número de página (default: sin paginación)           |
| size        | Integer | Tamaño de página (default: 50, máximo: 200)          |
| sortBy      | String  | Campo para ordenar (codigo, nombre, categoria)       |
| sortOrder   | String  | ASC o DESC (default: ASC)                            |
| q           | String  | Búsqueda rápida (compatibilidad hacia atrás)         |

**Respuesta:**
- **Sin paginación:** `List<Producto>`
- **Con paginación:** `PageResponse<Producto>`

**Estructura de Producto:**
```json
{
  "id": 45,
  "codigo": "ACC-001",
  "nombre": "Manija de Aluminio",
  "descripcion": "Manija para puerta de aluminio",
  "categoria": {
    "id": 3,
    "nombre": "Accesorios"
  },
  "tipo": "ACCESORIO",
  "color": "PLATA",
  "posicion": 1,
  "cantidad": 0,
  "costo": 15000.0,
  "precio1": 25000.0,
  "precio2": 23000.0,
  "precio3": 20000.0
}
```

**Ejemplos de uso:**

```bash
# Todos los productos normales
GET /api/productos

# Búsqueda rápida por texto
GET /api/productos?q=manija

# Productos de categoría con paginación
GET /api/productos?categoriaId=3&page=1&size=50

# Productos con stock en Ínsula ordenados por nombre
GET /api/productos?sedeId=1&conStock=true&sortBy=nombre&sortOrder=ASC

# Productos tipo ALUMINIO, color PLATA
GET /api/productos?tipo=ALUMINIO&color=PLATA&page=1&size=100
```


───────────────────────────────────────────────────────────────────────────────
3. GET /api/cortes-inventario-completo ✅ IMPLEMENTADO
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna solo los cortes de vidrio con información completa de inventario 
en las 3 sedes.

**Características:**
- ✅ Solo cortes de vidrio
- ✅ Filtros por categoría, tipo, color, largo
- ✅ Búsqueda por nombre/código
- ❌ Sin paginación (retorna lista completa)

**Endpoints disponibles:**

**3.1. Listar todos los cortes**
```
GET /api/cortes-inventario-completo
```

**3.2. Filtrar por sede**
```
GET /api/cortes-inventario-completo/sede/{sedeId}
```

**3.3. Filtrar por categoría**
```
GET /api/cortes-inventario-completo/categoria/{categoriaId}
```

**3.4. Buscar por nombre o código**
```
GET /api/cortes-inventario-completo/buscar?q={query}
```

**3.5. Filtrar por rango de largo**
```
GET /api/cortes-inventario-completo/largo?min={largoMin}&max={largoMax}
```

**3.6. Filtrar por tipo**
```
GET /api/cortes-inventario-completo/tipo/{tipo}
```

**3.7. Filtrar por color**
```
GET /api/cortes-inventario-completo/color/{color}
```

**Respuesta:** `List<CorteInventarioCompletoDTO>`

**Estructura de CorteInventarioCompletoDTO:**
```json
{
  "id": 89,
  "codigo": "CORTE-001",
  "nombre": "Corte Vidrio 150cm",
  "categoria": "Vidrios",
  "tipo": "VIDRIO",
  "color": "BRONCE",
  "largoCm": 150.5,
  "observacion": "Corte especial para ventana",
  "cantidadInsula": 3,
  "cantidadCentro": 5,
  "cantidadPatios": 2,
  "cantidadTotal": 10,
  "precio1": 45000.0,
  "precio2": 42000.0,
  "precio3": 40000.0
}
```

**Ejemplos de uso:**

```bash
# Todos los cortes
GET /api/cortes-inventario-completo

# Cortes en sede Centro
GET /api/cortes-inventario-completo/sede/2

# Cortes de categoría específica
GET /api/cortes-inventario-completo/categoria/1

# Buscar cortes por nombre
GET /api/cortes-inventario-completo/buscar?q=150

# Cortes entre 100cm y 200cm
GET /api/cortes-inventario-completo/largo?min=100&max=200

# Cortes tipo VIDRIO
GET /api/cortes-inventario-completo/tipo/VIDRIO

# Cortes color BRONCE
GET /api/cortes-inventario-completo/color/BRONCE
```

**Validaciones:**
- ✅ Query `q` no puede estar vacío (error 400)
- ✅ Rango de largo: min >= 0 y max >= min (error 400)


───────────────────────────────────────────────────────────────────────────────
4. GET /api/inventario/agrupado ❌ SIN FILTROS
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna el inventario agrupado por producto con vista especial.

**Características:**
- ❌ No tiene filtros disponibles
- ✅ Agrupación automática por producto
- ✅ Vista especial para análisis de inventario

**Endpoint:**
```
GET /api/inventario/agrupado
```

**Respuesta:** `List<InventarioProductoDTO>`

**Estructura de InventarioProductoDTO:**
```json
{
  "productoId": 123,
  "productoNombre": "Vidrio Templado 6mm",
  "productoCodigo": "VID-TEMP-6MM",
  "inventarios": [
    {
      "sedeId": 1,
      "sedeNombre": "Ínsula",
      "cantidad": 15
    },
    {
      "sedeId": 2,
      "sedeNombre": "Centro",
      "cantidad": 8
    },
    {
      "sedeId": 3,
      "sedeNombre": "Patios",
      "cantidad": 22
    }
  ]
}
```

**Ejemplo de uso:**

```bash
GET /api/inventario/agrupado
```


───────────────────────────────────────────────────────────────────────────────
5. GET /api/inventario ⚠️ FILTRO BÁSICO
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna registros de inventario con filtros básicos por producto y/o sede.

**Características:**
- ✅ Filtros básicos (productoId, sedeId)
- ✅ Retorna registros de la tabla inventario
- ⚠️ Sin paginación

**Filtros disponibles:**

| Parámetro  | Tipo | Descripción                                    |
|------------|------|------------------------------------------------|
| productoId | Long | Filtrar por ID de producto                     |
| sedeId     | Long | Filtrar por ID de sede                         |

**Casos de uso:**

**5.1. Todos los registros de inventario**
```
GET /api/inventario
```

**5.2. Inventario de una sede específica**
```
GET /api/inventario?sedeId={sedeId}
```

**5.3. Inventario de un producto específico**
```
GET /api/inventario?productoId={productoId}
```

**5.4. Inventario de un producto en una sede**
```
GET /api/inventario?productoId={productoId}&sedeId={sedeId}
```

**Respuesta:** `List<Inventario>` o `Inventario` (cuando se especifican ambos IDs)

**Estructura de Inventario:**
```json
{
  "id": 456,
  "producto": {
    "id": 123,
    "codigo": "VID-TEMP-6MM",
    "nombre": "Vidrio Templado 6mm"
  },
  "sede": {
    "id": 1,
    "nombre": "Ínsula"
  },
  "cantidad": 15
}
```

**Ejemplos de uso:**

```bash
# Todo el inventario
GET /api/inventario

# Inventario de Ínsula (sede 1)
GET /api/inventario?sedeId=1

# Inventario del producto 123
GET /api/inventario?productoId=123

# Cantidad del producto 123 en Ínsula
GET /api/inventario?productoId=123&sedeId=1
```


───────────────────────────────────────────────────────────────────────────────
6. GET /api/productos-vidrio ✅ CON FILTROS
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Retorna solo productos de vidrio (ProductoVidrio) con filtros básicos.

**Características:**
- ✅ Solo productos de vidrio
- ✅ Filtros básicos disponibles
- ❌ Sin paginación
- ✅ Incluye campos específicos de vidrio (mm, m1, m2)

**Filtros disponibles:**

| Parámetro   | Tipo   | Descripción                              |
|-------------|--------|------------------------------------------|
| q           | String | Búsqueda por nombre o código             |
| mm          | Double | Filtrar por milímetros                   |
| categoriaId | Long   | Filtrar por ID de categoría              |

**Endpoint:**
```
GET /api/productos-vidrio
```

**Respuesta:** `List<ProductoVidrio>`

**Estructura de ProductoVidrio:**
```json
{
  "id": 123,
  "codigo": "VID-TEMP-6MM",
  "nombre": "Vidrio Templado 6mm",
  "descripcion": "Vidrio templado de seguridad",
  "categoria": {
    "id": 1,
    "nombre": "Vidrios"
  },
  "tipo": "VIDRIO",
  "color": "CLARO",
  "mm": 6.0,
  "m1": 2.44,
  "m2": 3.66,
  "costo": 50000.0,
  "precio1": 80000.0,
  "precio2": 75000.0,
  "precio3": 70000.0
}
```

**Ejemplos de uso:**

```bash
# Todos los productos de vidrio
GET /api/productos-vidrio

# Buscar por nombre/código
GET /api/productos-vidrio?q=templado

# Filtrar por milímetros
GET /api/productos-vidrio?mm=6.0

# Filtrar por categoría
GET /api/productos-vidrio?categoriaId=1
```


═══════════════════════════════════════════════════════════════════════════════
✏️ ENDPOINTS DE ESCRITURA (PUT/POST)
═══════════════════════════════════════════════════════════════════════════════


───────────────────────────────────────────────────────────────────────────────
7. PUT /api/inventario/{id}
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Actualiza la cantidad de un registro de inventario específico usando su ID.

**Método:** `PUT`

**URL:** `/api/inventario/{id}`

**Path Parameter:**
- `id` (Long): ID del registro de inventario

**Request Body:**
```json
{
  "cantidad": 25
}
```

**Estructura del body:**
```json
{
  "id": 456,              // Opcional (se ignora si se envía)
  "producto": {           // Opcional (se ignora si se envía)
    "id": 123
  },
  "sede": {              // Opcional (se ignora si se envía)
    "id": 1
  },
  "cantidad": 25         // REQUERIDO - Nueva cantidad
}
```

**Response (200 OK):**
```json
{
  "id": 456,
  "producto": {
    "id": 123,
    "codigo": "VID-TEMP-6MM",
    "nombre": "Vidrio Templado 6mm"
  },
  "sede": {
    "id": 1,
    "nombre": "Ínsula"
  },
  "cantidad": 25
}
```

**Response (404 Not Found):**
```json
{
  "error": "Inventario no encontrado"
}
```

**Ejemplo de uso:**

```bash
PUT /api/inventario/456
Content-Type: application/json

{
  "cantidad": 25
}
```

**Validaciones:**
- ✅ El ID del inventario debe existir
- ✅ Se puede enviar cantidad negativa (ventas anticipadas)


───────────────────────────────────────────────────────────────────────────────
8. PUT /api/inventario/{productoId}/{sedeId}
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Actualiza la cantidad de un producto en una sede específica usando los IDs 
del producto y la sede.

**Método:** `PUT`

**URL:** `/api/inventario/{productoId}/{sedeId}`

**Path Parameters:**
- `productoId` (Long): ID del producto
- `sedeId` (Long): ID de la sede

**Request Body:**
```json
{
  "cantidad": 30
}
```

**Response (200 OK):**
```json
{
  "id": 456,
  "producto": {
    "id": 123,
    "codigo": "VID-TEMP-6MM",
    "nombre": "Vidrio Templado 6mm"
  },
  "sede": {
    "id": 1,
    "nombre": "Ínsula"
  },
  "cantidad": 30
}
```

**Response (404 Not Found):**
```json
{
  "error": "No se encontró inventario para el producto 123 en la sede 1"
}
```

**Ejemplo de uso:**

```bash
PUT /api/inventario/123/1
Content-Type: application/json

{
  "cantidad": 30
}
```

**Validaciones:**
- ✅ El producto debe existir
- ✅ La sede debe existir
- ✅ Debe existir un registro de inventario para ese producto en esa sede
- ✅ Se puede enviar cantidad negativa (ventas anticipadas)


───────────────────────────────────────────────────────────────────────────────
9. PUT /api/inventario/producto/{productoId}
───────────────────────────────────────────────────────────────────────────────

**Descripción:**
Actualiza el inventario de un producto en las 3 sedes (Ínsula, Centro, Patios) 
en una sola operación.

**Método:** `PUT`

**URL:** `/api/inventario/producto/{productoId}`

**Path Parameter:**
- `productoId` (Long): ID del producto

**Request Body:**
```json
{
  "cantidadInsula": 15,
  "cantidadCentro": 8,
  "cantidadPatios": 22
}
```

**Estructura del body (InventarioActualizarDTO):**
```json
{
  "cantidadInsula": 15,   // Cantidad para sede Ínsula (ID=1)
  "cantidadCentro": 8,    // Cantidad para sede Centro (ID=2)
  "cantidadPatios": 22    // Cantidad para sede Patios (ID=3)
}
```

**Response (200 OK):**
```json
[
  {
    "id": 456,
    "producto": {
      "id": 123,
      "codigo": "VID-TEMP-6MM",
      "nombre": "Vidrio Templado 6mm"
    },
    "sede": {
      "id": 1,
      "nombre": "Ínsula"
    },
    "cantidad": 15
  },
  {
    "id": 457,
    "producto": {
      "id": 123,
      "codigo": "VID-TEMP-6MM",
      "nombre": "Vidrio Templado 6mm"
    },
    "sede": {
      "id": 2,
      "nombre": "Centro"
    },
    "cantidad": 8
  },
  {
    "id": 458,
    "producto": {
      "id": 123,
      "codigo": "VID-TEMP-6MM",
      "nombre": "Vidrio Templado 6mm"
    },
    "sede": {
      "id": 3,
      "nombre": "Patios"
    },
    "cantidad": 22
  }
]
```

**Response (400 Bad Request):**
```json
{
  "error": "Producto con ID 123 no encontrado"
}
```

**Ejemplo de uso:**

```bash
PUT /api/inventario/producto/123
Content-Type: application/json

{
  "cantidadInsula": 15,
  "cantidadCentro": 8,
  "cantidadPatios": 22
}
```

**Características:**
- ✅ Actualiza las 3 sedes en una sola operación
- ✅ Si no existe inventario en alguna sede, lo crea automáticamente
- ✅ Puedes enviar solo los campos que quieras actualizar (los demás se ignoran)
- ✅ Permite valores negativos (ventas anticipadas)
- ✅ Retorna la lista de los 3 inventarios actualizados

**Validaciones:**
- ✅ El producto debe existir
- ✅ Las 3 sedes deben existir (IDs hardcodeados: 1, 2, 3)


═══════════════════════════════════════════════════════════════════════════════
📊 COMPARATIVA DE ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════

| Endpoint                        | Productos | Vidrios | Cortes | Filtros | Paginación |
|---------------------------------|-----------|---------|--------|---------|------------|
| /api/inventario-completo        | ✅        | ✅      | ❌     | ✅      | ✅         |
| /api/productos                  | ✅        | ❌      | ❌     | ✅      | ✅         |
| /api/cortes-inventario-completo | ❌        | ❌      | ✅     | ⚠️      | ❌         |
| /api/inventario/agrupado        | ✅        | ✅      | ✅     | ❌      | ❌         |
| /api/inventario                 | ✅        | ✅      | ✅     | ⚠️      | ❌         |
| /api/productos-vidrio           | ❌        | ✅      | ❌     | ⚠️      | ❌         |


═══════════════════════════════════════════════════════════════════════════════
💡 RECOMENDACIONES DE USO
═══════════════════════════════════════════════════════════════════════════════

**Para catálogo/listado principal:**
→ Usar `/api/inventario-completo` con filtros y paginación

**Para administración de productos normales:**
→ Usar `/api/productos` con filtros

**Para gestión solo de cortes:**
→ Usar `/api/cortes-inventario-completo`

**Para actualizar cantidades:**
→ Si es una sola sede: usar `/api/inventario/{productoId}/{sedeId}`
→ Si son las 3 sedes: usar `/api/inventario/producto/{productoId}`

**Para consultas específicas:**
→ Si necesitas inventario agrupado: usar `/api/inventario/agrupado`
→ Si necesitas solo vidrios: usar `/api/productos-vidrio`


═══════════════════════════════════════════════════════════════════════════════
🔒 VALIDACIONES Y REGLAS DE NEGOCIO
═══════════════════════════════════════════════════════════════════════════════

**Cantidades negativas:**
✅ SE PERMITEN cantidades negativas en inventario (para ventas anticipadas)

**Filtro conStock/sinStock:**
⚠️ REQUIERE especificar sedeId (error 400 si falta)

**Parámetros page y size:**
- Si se envía page sin size, se usa size por defecto
- Si se envía size sin page, se usa page=1 por defecto
- size máximo varía por endpoint (verificar límites)

**Creación automática de inventario:**
- Al crear un producto, se crean automáticamente 3 registros de inventario 
  (uno por cada sede) con cantidad 0
- Al actualizar inventario que no existe, se crea automáticamente


═══════════════════════════════════════════════════════════════════════════════
✅ IMPLEMENTACIÓN COMPLETADA
═══════════════════════════════════════════════════════════════════════════════

**ESTADO: IMPLEMENTADO** ✅

**Fecha de implementación:** 2025-12-22

**Páginas con filtros por categoría implementados:**
1. ✅ InventoryPage (Gestión de inventario)
2. ✅ VenderPage (Punto de venta)

**Cambios realizados en InventoryPage:**

1. **Filtrado por categoría en el backend:**
   - El endpoint GET /api/inventario-completo ahora recibe el parámetro `categoriaId`
   - Solo se traen productos de la categoría seleccionada
   - Reduce significativamente la carga de datos (de 500+ productos a ~50-100 por categoría)

2. **Eliminación de categoría "TODAS":**
   - Se filtran las categorías para excluir "TODAS" y "TODAS LAS CATEGORÍAS"
   - Obliga al usuario a seleccionar una categoría específica
   - Se aplica tanto para productos como para cortes

3. **Selección automática de primera categoría:**
   - Al cargar la página, se selecciona automáticamente la primera categoría disponible
   - Garantiza que siempre haya una categoría activa

4. **Recarga automática:**
   - Cuando se cambia de categoría, se recarga automáticamente el inventario
   - Se usa `filters.categoryId` como dependencia del useCallback

**Cambios realizados en VenderPage:**

1. **Filtrado por categoría en el backend:**
   - Tanto productos como cortes ahora envían `categoriaId` al endpoint
   - Reduce carga inicial y mejora rendimiento en punto de venta
   - Filtros aplicados: GET /api/inventario-completo y GET /api/cortes-inventario-completo

2. **Eliminación de categoría "TODAS":**
   - Mismo comportamiento que InventoryPage
   - Se usa `categoriasParaVenta` filtrada en el CategorySidebar

3. **Selección automática:**
   - Primera categoría disponible se selecciona automáticamente
   - Aplica tanto para vista de productos como cortes

4. **Recarga automática:**
   - `filters.categoryId` y `cortesFilters.categoryId` como dependencias
   - Recarga inmediata al cambiar de categoría

**Código implementado (común a ambas páginas):**
```javascript
// Filtrar categorías (excluir "TODAS")
const categoriasParaInventario = useMemo(() => {
  return categories.filter(cat => {
    const nombre = cat.nombre?.toUpperCase().trim() || "";
    return nombre !== "TODAS" && nombre !== "TODAS LAS CATEGORÍAS";
  });
}, [categories]);

// Llamada al endpoint con filtros
const params = {};
if (filters.categoryId) {
  params.categoriaId = filters.categoryId;
}
const productos = await listarInventarioCompleto(params, isAdmin, sedeId, categoriasMap);
```

**Impacto en rendimiento:**
- ✅ Reducción de datos cargados: ~80-90% (de 500+ a 50-100 productos)
- ✅ Tiempo de carga: Más rápido (menos datos que transferir y procesar)
- ✅ Experiencia de usuario: Mejor organización, fácil navegación entre categorías
- ✅ Punto de venta: Carga inicial mucho más rápida, mejor experiencia para vendedores


═══════════════════════════════════════════════════════════════════════════════
🔄 SINCRONIZACIÓN Y CONSISTENCIA
═══════════════════════════════════════════════════════════════════════════════

**Actualización de inventario:**
- PUT /api/inventario/{id} actualiza solo ese registro
- PUT /api/inventario/{productoId}/{sedeId} busca el registro y lo actualiza
- PUT /api/inventario/producto/{productoId} actualiza 3 registros en una transacción

**Traslados:**
Los traslados entre sedes actualizan automáticamente el inventario:
- Resta cantidad de sede origen
- Suma cantidad a sede destino
- Valida stock suficiente en origen

**Ingresos:**
Los ingresos procesados actualizan automáticamente el inventario del producto.


═══════════════════════════════════════════════════════════════════════════════
📞 SOPORTE Y CONTACTO
═══════════════════════════════════════════════════════════════════════════════

Para más información sobre otros endpoints del sistema:
- Órdenes de venta: ver DOCUMENTACION_ENDPOINT_ORDENES_TABLA.md
- Métodos de pago: ver DOCUMENTACION_CAMBIOS_METODOS_PAGO.txt
- Filtros: ver DOCUMENTACION_CAMBIOS_FILTROS.md

═══════════════════════════════════════════════════════════════════════════════
FIN DE LA DOCUMENTACIÓN
═══════════════════════════════════════════════════════════════════════════════
