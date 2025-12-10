================================================================================
ESPECIFICACIÓN DE ENDPOINTS DE INGRESOS - FRONTEND A BACKEND
================================================================================

FECHA: 2025-01-XX
VERSIÓN: 1.0

================================================================================
RESUMEN EJECUTIVO
================================================================================

El frontend calcula el PROMEDIO PONDERADO de los costos ANTES de enviar el ingreso
al backend. El backend debe usar el campo "costoUnitarioPonderado" para actualizar
el costo del producto en inventario, mientras que "costoUnitario" se mantiene como
el costo original del ingreso para trazabilidad y cálculo del total del ingreso.

================================================================================
ENDPOINT 1: POST /api/ingresos - CREAR INGRESO
================================================================================

MÉTODO: POST
RUTA: /api/ingresos
DESCRIPCIÓN: Crea un nuevo ingreso de productos desde un proveedor.

PAYLOAD ENVIADO:
----------------
{
  "fecha": "2025-01-15",                    // String formato YYYY-MM-DD
  "proveedor": {                             // Objeto con ID del proveedor
    "id": 5
  },
  "numeroFactura": "FAC-001",                // String (puede estar vacío)
  "observaciones": "Observaciones del ingreso", // String (puede estar vacío)
  "detalles": [                              // Array de detalles del ingreso
    {
      "producto": {                          // Objeto con ID del producto
        "id": 10
      },
      "cantidad": 5,                         // Integer, cantidad de productos
      "costoUnitario": 50000,                // Double, costo ORIGINAL del ingreso (lo que se pagó)
      "costoUnitarioPonderado": 45000,       // Double, costo calculado con promedio ponderado
      "totalLinea": 250000                   // Double, cantidad × costoUnitario (ORIGINAL)
    },
    {
      "producto": { "id": 15 },
      "cantidad": 3,
      "costoUnitario": 30000,
      "costoUnitarioPonderado": 32000,
      "totalLinea": 90000
    }
  ],
  "totalCosto": 340000,                     // Double, suma de todos los totalLinea
  "procesado": false                         // Boolean, siempre false al crear
}

CAMPOS IMPORTANTES:
-------------------

1. costoUnitario (OBLIGATORIO):
   - Es el costo ORIGINAL del ingreso (lo que realmente se pagó por cada unidad)
   - Se usa para calcular el totalLinea y el totalCosto del ingreso
   - Se guarda en el detalle del ingreso para trazabilidad histórica
   - NO debe usarse para actualizar el costo del producto en inventario

2. costoUnitarioPonderado (OBLIGATORIO):
   - Es el costo CALCULADO por el frontend usando promedio ponderado
   - Fórmula: (cantidadAntes × costoActual + cantidadNueva × costoNuevo) / (cantidadAntes + cantidadNueva)
   - Se redondea a número entero (sin decimales)
   - DEBE usarse para actualizar el campo "costo" del producto en inventario
   - Si no hay cantidad previa (cantidadAntes = 0), entonces costoUnitarioPonderado = costoUnitario

3. totalLinea (OBLIGATORIO):
   - Calculado como: cantidad × costoUnitario (ORIGINAL)
   - NO debe calcularse con costoUnitarioPonderado
   - Representa el costo total de esa línea del ingreso

4. totalCosto (OBLIGATORIO):
   - Suma de todos los totalLinea de todos los detalles
   - Calculado con costos ORIGINALES (no ponderados)
   - Representa el costo total del ingreso

CÓMO EL BACKEND DEBE PROCESAR:
--------------------------------

1. VALIDAR:
   - Verificar que todos los campos obligatorios estén presentes
   - Validar que cantidad > 0 y costoUnitario > 0
   - Validar que costoUnitarioPonderado > 0 (o igual a costoUnitario si no hay inventario previo)

2. GUARDAR EL INGRESO:
   - Guardar el ingreso con todos los detalles tal como vienen
   - Guardar costoUnitario (original) en el detalle del ingreso
   - Guardar costoUnitarioPonderado en el detalle del ingreso (opcional, para referencia)
   - Guardar totalCosto tal como viene del frontend

3. ACTUALIZAR INVENTARIO:
   - Para cada detalle:
     a. Obtener el producto por ID
     b. Incrementar la cantidad del producto según la sede del ingreso
     c. ACTUALIZAR el campo "costo" del producto con el valor de "costoUnitarioPonderado"
     d. NO usar costoUnitario para actualizar el costo del producto

4. EJEMPLO DE ACTUALIZACIÓN:
   Producto ID 10 antes del ingreso:
   - cantidadInsula: 10
   - cantidadCentro: 5
   - cantidadPatios: 0
   - costo: 40000
   
   Ingreso recibido:
   - cantidad: 5
   - costoUnitario: 50000 (original)
   - costoUnitarioPonderado: 45000 (calculado)
   - sedeId: 1 (Insula)
   
   Después del ingreso:
   - cantidadInsula: 15 (10 + 5)
   - cantidadCentro: 5 (sin cambios)
   - cantidadPatios: 0 (sin cambios)
   - costo: 45000 (actualizado con costoUnitarioPonderado)

================================================================================
ENDPOINT 2: PUT /api/ingresos/{id} - ACTUALIZAR INGRESO
================================================================================

MÉTODO: PUT
RUTA: /api/ingresos/{id}
DESCRIPCIÓN: Actualiza un ingreso existente que NO ha sido procesado.

PAYLOAD ENVIADO:
----------------
{
  "id": 25,                                  // Integer, ID del ingreso a actualizar
  "fecha": "2025-01-15",
  "proveedor": { "id": 5 },
  "numeroFactura": "FAC-001",
  "observaciones": "Observaciones actualizadas",
  "detalles": [
    {
      "producto": { "id": 10 },
      "cantidad": 5,
      "costoUnitario": 50000,                // Costo ORIGINAL del ingreso
      "costoUnitarioPonderado": 45000,       // Costo calculado con promedio ponderado
      "totalLinea": 250000
    }
  ],
  "totalCosto": 250000,
  "procesado": false
}

VALIDACIONES DEL BACKEND:
-------------------------

1. Verificar que el ingreso existe
2. Verificar que procesado = false (no se puede editar un ingreso procesado)
3. Si el ingreso ya fue procesado, retornar error 404 con mensaje "ya procesado"

CÓMO EL BACKEND DEBE PROCESAR:
--------------------------------

1. OBTENER EL INGRESO ACTUAL:
   - Obtener el ingreso con todos sus detalles actuales
   - Obtener los productos afectados ANTES de la actualización

2. REVERTIR CAMBIOS ANTERIORES:
   - Para cada detalle del ingreso ACTUAL:
     a. Decrementar la cantidad del producto según la sede
     b. Recalcular el costo del producto usando el promedio ponderado inverso
     c. O simplemente restaurar el costo anterior si se guardó

3. APLICAR NUEVOS CAMBIOS:
   - Para cada detalle del ingreso NUEVO:
     a. Incrementar la cantidad del producto según la sede
     b. Actualizar el costo del producto con costoUnitarioPonderado
   - Guardar el ingreso actualizado

NOTA: El frontend NO recalcula el promedio ponderado al actualizar, solo al crear.
Si el backend necesita recalcular, debe hacerlo basándose en el estado actual del inventario.

================================================================================
ENDPOINT 3: PUT /api/ingresos/{id}/procesar - PROCESAR INGRESO
================================================================================

MÉTODO: PUT
RUTA: /api/ingresos/{id}/procesar
DESCRIPCIÓN: Marca un ingreso como procesado y aplica los cambios al inventario.

PAYLOAD ENVIADO:
----------------
NINGUNO (solo el ID en la URL)

CÓMO EL BACKEND DEBE PROCESAR:
--------------------------------

1. Verificar que el ingreso existe y no está procesado
2. Si ya está procesado, retornar error
3. Marcar el ingreso como procesado = true
4. Aplicar cambios al inventario (si no se aplicaron al crear):
   - Incrementar cantidades de productos
   - Actualizar costos con costoUnitarioPonderado

NOTA: Si el backend ya aplicó los cambios al crear el ingreso, este endpoint solo
debe marcar como procesado. Si NO aplicó los cambios al crear, debe aplicarlos aquí.

================================================================================
ENDPOINT 4: PUT /api/ingresos/{id}/marcar-procesado - MARCAR COMO PROCESADO
================================================================================

MÉTODO: PUT
RUTA: /api/ingresos/{id}/marcar-procesado
DESCRIPCIÓN: Marca un ingreso como procesado sin aplicar cambios adicionales.

PAYLOAD ENVIADO:
----------------
NINGUNO (solo el ID en la URL)

CÓMO EL BACKEND DEBE PROCESAR:
--------------------------------

1. Verificar que el ingreso existe
2. Marcar procesado = true
3. NO aplicar cambios adicionales al inventario (asume que ya están aplicados)

================================================================================
ENDPOINT 5: PUT /api/ingresos/{id}/reprocesar - REPROCESAR INGRESO
================================================================================

MÉTODO: PUT
RUTA: /api/ingresos/{id}/reprocesar
DESCRIPCIÓN: Reprocesa un ingreso que ya fue procesado.

PAYLOAD ENVIADO:
----------------
NINGUNO (solo el ID en la URL)

CÓMO EL BACKEND DEBE PROCESAR:
--------------------------------

1. Verificar que el ingreso existe y está procesado
2. Revertir cambios anteriores:
   - Decrementar cantidades de productos
   - Recalcular costos anteriores
3. Aplicar cambios nuevamente:
   - Incrementar cantidades de productos
   - Actualizar costos con costoUnitarioPonderado
4. Mantener procesado = true

================================================================================
CÁLCULO DEL PROMEDIO PONDERADO (FRONTEND)
================================================================================

FÓRMULA:
--------
nuevoCosto = (cantidadAntes × costoActual + cantidadNueva × costoNuevo) / (cantidadAntes + cantidadNueva)

EJEMPLO:
--------
Producto antes del ingreso:
- cantidadAntes: 10 unidades
- costoActual: $40,000

Ingreso nuevo:
- cantidadNueva: 5 unidades
- costoNuevo: $50,000

Cálculo:
- totalCostoAntes = 10 × 40,000 = 400,000
- totalCostoNuevo = 5 × 50,000 = 250,000
- cantidadTotal = 10 + 5 = 15
- nuevoCosto = (400,000 + 250,000) / 15 = 650,000 / 15 = 43,333.33
- nuevoCosto redondeado = 43,333 (entero)

CASO ESPECIAL:
--------------
Si cantidadAntes = 0 (producto nuevo sin inventario):
- nuevoCosto = costoNuevo
- No se hace promedio porque no hay costo anterior

REDONDEO:
---------
El frontend redondea el resultado a número entero usando Math.round()
El backend debe aceptar números enteros (sin decimales)

================================================================================
RESUMEN DE CAMPOS POR DETALLE
================================================================================

CAMPO                    | TIPO    | OBLIGATORIO | DESCRIPCIÓN
-------------------------|---------|-------------|------------------------------------------
producto.id              | Integer | SÍ          | ID del producto
cantidad                 | Integer | SÍ          | Cantidad de productos (> 0)
costoUnitario            | Double  | SÍ          | Costo ORIGINAL del ingreso (lo que se pagó)
costoUnitarioPonderado   | Double  | SÍ          | Costo calculado con promedio ponderado
totalLinea               | Double  | SÍ          | cantidad × costoUnitario (ORIGINAL)

================================================================================
RESUMEN DE CAMPOS DEL INGRESO
================================================================================

CAMPO           | TIPO    | OBLIGATORIO | DESCRIPCIÓN
----------------|---------|-------------|------------------------------------------
id              | Integer | SÍ (PUT)    | ID del ingreso (solo en actualización)
fecha           | String  | SÍ          | Fecha formato YYYY-MM-DD
proveedor.id    | Integer | SÍ          | ID del proveedor
numeroFactura   | String  | NO          | Número de factura (puede estar vacío)
observaciones   | String  | NO          | Observaciones (puede estar vacío)
detalles        | Array   | SÍ          | Array de detalles (mínimo 1)
totalCosto      | Double  | SÍ          | Suma de todos los totalLinea
procesado       | Boolean | SÍ          | false al crear, true al procesar

================================================================================
FLUJO COMPLETO DE CREACIÓN DE INGRESO
================================================================================

PASO 1: FRONTEND PREPARA LOS DATOS
------------------------------------
1. Usuario ingresa productos con cantidad y costo unitario
2. Frontend obtiene productos con inventario actual (ANTES del ingreso)
3. Frontend calcula costoUnitarioPonderado para cada producto usando promedio ponderado
4. Frontend calcula totalLinea = cantidad × costoUnitario (ORIGINAL)
5. Frontend calcula totalCosto = suma de todos los totalLinea

PASO 2: FRONTEND ENVÍA AL BACKEND
----------------------------------
POST /api/ingresos con payload completo incluyendo:
- costoUnitario: costo original
- costoUnitarioPonderado: costo calculado
- totalLinea: calculado con costo original
- totalCosto: suma de totalLinea

PASO 3: BACKEND PROCESA
------------------------
1. Valida los datos recibidos
2. Guarda el ingreso con todos los detalles
3. Para cada detalle:
   a. Incrementa cantidad del producto según sede
   b. Actualiza costo del producto con costoUnitarioPonderado
4. Retorna el ingreso creado

PASO 4: RESULTADO
------------------
- Ingreso guardado con costoUnitario (original) para trazabilidad
- Productos actualizados con nuevo costo (costoUnitarioPonderado)
- Inventario incrementado según cantidades

================================================================================
NOTAS IMPORTANTES
================================================================================

1. El frontend SIEMPRE calcula el promedio ponderado antes de enviar
2. El backend DEBE usar costoUnitarioPonderado para actualizar el costo del producto
3. El backend NO debe recalcular el promedio ponderado (ya viene calculado)
4. El costoUnitario se mantiene como costo original para trazabilidad histórica
5. El totalCosto se calcula con costos ORIGINALES, no ponderados
6. Si no hay inventario previo (cantidadAntes = 0), costoUnitarioPonderado = costoUnitario
7. Todos los costos se redondean a números enteros (sin decimales)

================================================================================
EJEMPLO COMPLETO DE PAYLOAD
================================================================================

REQUEST:
--------
POST /api/ingresos
Content-Type: application/json

{
  "fecha": "2025-01-15",
  "proveedor": {
    "id": 5
  },
  "numeroFactura": "FAC-2025-001",
  "observaciones": "Ingreso de productos nuevos",
  "detalles": [
    {
      "producto": {
        "id": 10
      },
      "cantidad": 5,
      "costoUnitario": 50000,
      "costoUnitarioPonderado": 45000,
      "totalLinea": 250000
    },
    {
      "producto": {
        "id": 15
      },
      "cantidad": 3,
      "costoUnitario": 30000,
      "costoUnitarioPonderado": 32000,
      "totalLinea": 90000
    }
  ],
  "totalCosto": 340000,
  "procesado": false
}

RESPUESTA ESPERADA:
-------------------
{
  "id": 25,
  "fecha": "2025-01-15",
  "proveedor": {
    "id": 5,
    "nombre": "Proveedor ABC"
  },
  "numeroFactura": "FAC-2025-001",
  "observaciones": "Ingreso de productos nuevos",
  "detalles": [
    {
      "id": 100,
      "producto": {
        "id": 10,
        "codigo": "PROD-001",
        "nombre": "Producto A"
      },
      "cantidad": 5,
      "costoUnitario": 50000,
      "costoUnitarioPonderado": 45000,
      "totalLinea": 250000
    },
    {
      "id": 101,
      "producto": {
        "id": 15,
        "codigo": "PROD-002",
        "nombre": "Producto B"
      },
      "cantidad": 3,
      "costoUnitario": 30000,
      "costoUnitarioPonderado": 32000,
      "totalLinea": 90000
    }
  ],
  "totalCosto": 340000,
  "procesado": false
}

ESTADO DEL INVENTARIO DESPUÉS:
-------------------------------
Producto ID 10:
- cantidadInsula: +5 (incrementada)
- cantidadCentro: sin cambios
- cantidadPatios: sin cambios
- costo: 45000 (actualizado con costoUnitarioPonderado)

Producto ID 15:
- cantidadInsula: +3 (incrementada)
- cantidadCentro: sin cambios
- cantidadPatios: sin cambios
- costo: 32000 (actualizado con costoUnitarioPonderado)

================================================================================
CONTACTO
================================================================================

Si tienes dudas sobre esta especificación, consulta con el equipo de frontend.

