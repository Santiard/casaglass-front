# 📋 DOCUMENTACIÓN COMPLETA DE ENDPOINTS - ENTREGAS DE DINERO

## 📌 ÍNDICE
1. [Endpoints de Entregas de Dinero](#1-endpoints-de-entregas-de-dinero)
2. [Endpoints de Reembolsos de Ventas](#2-endpoints-de-reembolsos-de-ventas)
3. [Problema Detectado - Campo tipoMovimiento](#3-problema-detectado-campo-tipomovimiento)

---

## 1. ENDPOINTS DE ENTREGAS DE DINERO

### 1.1. Listar Entregas con Filtros Completos
```
GET /api/entregas-dinero
```

**Descripción**: Lista todas las entregas de dinero con filtros opcionales y soporte de paginación.

**Parámetros de Query (todos opcionales)**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sedeId` | Long | Filtrar por sede específica |
| `empleadoId` | Long | Filtrar por empleado que realiza la entrega |
| `estado` | String | Valores: `PENDIENTE`, `ENTREGADA`, `VERIFICADA`, `RECHAZADA` |
| `desde` | LocalDate | Fecha desde (formato: `YYYY-MM-DD`, inclusive) |
| `hasta` | LocalDate | Fecha hasta (formato: `YYYY-MM-DD`, inclusive) |
| `conDiferencias` | Boolean | Filtrar entregas con diferencias de monto |
| `page` | Integer | Número de página (sin paginación si se omite) |
| `size` | Integer | Tamaño de página (default: 20, máximo: 100) |
| `sortBy` | String | Campo para ordenar (`fecha`, `id`) - default: `fecha` |
| `sortOrder` | String | Orden: `ASC` o `DESC` - default: `DESC` |

**Respuesta**:
- Si hay paginación (`page` y `size`): `PageResponse<EntregaDineroResponseDTO>`
- Si no hay paginación: `List<EntregaDineroResponseDTO>`

**Usado en**: `EntregaPage` para cargar el listado principal

**Ejemplo**:
```
GET /api/entregas-dinero?sedeId=1&estado=PENDIENTE&desde=2026-01-01&hasta=2026-01-31&page=1&size=20
```

---

### 1.2. Obtener una Entrega Específica
```
GET /api/entregas-dinero/{id}
```

**Descripción**: Obtiene los detalles completos de una entrega por su ID.

**Parámetros**:
- `id` (Path): ID de la entrega

**Respuesta**: `EntregaDineroResponseDTO`

**Usado en**: Ver detalle de entrega, auditoría

---

### 1.3. Obtener Entregas por Sede
```
GET /api/entregas-dinero/sede/{sedeId}
```

**Descripción**: Lista todas las entregas de una sede específica.

**Parámetros**:
- `sedeId` (Path): ID de la sede

**Respuesta**: `List<EntregaDineroResponseDTO>`

**Usado en**: Filtrar por sede específica

---

### 1.4. Obtener Entregas por Empleado
```
GET /api/entregas-dinero/empleado/{empleadoId}
```

**Descripción**: Lista todas las entregas realizadas por un empleado.

**Parámetros**:
- `empleadoId` (Path): ID del empleado

**Respuesta**: `List<EntregaDineroResponseDTO>`

**Usado en**: Reportes por empleado

---

### 1.5. ⚠️ CRÍTICO - Obtener Órdenes Disponibles para Entrega
```
GET /api/entregas-dinero/ordenes-disponibles
```

**Descripción**: Obtiene las órdenes a contado y abonos de crédito disponibles para incluir en una entrega.

**Parámetros de Query (obligatorios)**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sedeId` | Long | ID de la sede |
| `desde` | LocalDate | Fecha desde (formato: `YYYY-MM-DD`) |
| `hasta` | LocalDate | Fecha hasta (formato: `YYYY-MM-DD`) |

**Respuesta**:
```json
{
  "ordenesContado": [
    {
      "id": 130,
      "numero": 1105,
      "fecha": "2026-01-05",
      "clienteNombre": "Juan Pérez",
      "clienteNit": "123456789",
      "total": 549800.0,
      "obra": "Proyecto Casa Blanca",
      "descripcion": "TRANSFERENCIA: 549.800 (BANCOLOMBIA)",
      "sedeNombre": "Sede Principal",
      "trabajadorNombre": "Carlos Gómez",
      "montoEfectivo": 0.0,
      "montoTransferencia": 549800.0,
      "montoCheque": 0.0,
      "yaEntregada": false,
      "esContado": true,
      "estado": "ACTIVA",
      "venta": true
    }
  ],
  "abonosDisponibles": [
    {
      "id": 27,
      "fechaAbono": "2026-01-05",
      "montoAbono": 2555168.07,
      "metodoPago": "TRANSFERENCIA: 2.555.168,07 (BANCOLOMBIA) | RETEFUENTE: 54.831,93",
      "factura": "F-2026-001",
      "montoEfectivo": 0.0,
      "montoTransferencia": 2555168.07,
      "montoCheque": 0.0,
      "montoRetencion": 54831.93,
      "ordenId": 125,
      "numeroOrden": 1102,
      "fechaOrden": "2025-12-15",
      "montoOrden": 2610000.0,
      "obra": "Proyecto Norte",
      "sedeNombre": "Sede Principal",
      "trabajadorNombre": "María López",
      "yaEntregado": false,
      "estadoOrden": "ACTIVA",
      "ventaOrden": true,
      "clienteNombre": "María López",
      "clienteNit": "987654321"
    }
  ],
  "totales": {
    "contado": 1,
    "credito": 1,
    "total": 2
  }
}
```

**Lógica**:
- **Órdenes A CONTADO**: Se muestran las órdenes completas con `esContado = true`
- **Órdenes A CRÉDITO**: Se muestran los ABONOS individuales (no las órdenes), cada abono representa un pago parcial

**Usado en**: `CrearEntregaModal` para cargar órdenes y abonos disponibles

**⚠️ PROBLEMA DETECTADO**: Ver sección 3 sobre `tipoMovimiento`

---

### 1.6. Crear Entrega
```
POST /api/entregas-dinero
```

**Descripción**: Crea una nueva entrega de dinero.

**Body** (`EntregaDineroCreateDTO`):
```json
{
  "sedeId": 1,
  "empleadoId": 3,
  "fechaEntrega": "2026-01-05",
  "modalidadEntrega": "EFECTIVO",
  "monto": 3104968.07,
  "montoEfectivo": 0.0,
  "montoTransferencia": 3104968.07,
  "montoCheque": 0.0,
  "montoDeposito": 0.0,
  "ordenesIds": [130],
  "abonosIds": [27],
  "reembolsosIds": []
}
```

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sedeId` | Long | ID de la sede (obligatorio) |
| `empleadoId` | Long | ID del empleado que realiza la entrega (obligatorio) |
| `fechaEntrega` | LocalDate | Fecha de la entrega (obligatorio) |
| `modalidadEntrega` | String | `EFECTIVO`, `TRANSFERENCIA`, `CHEQUE`, `DEPOSITO`, `MIXTO` |
| `monto` | Double | Monto total de la entrega |
| `montoEfectivo` | Double | Monto en efectivo |
| `montoTransferencia` | Double | Monto en transferencia |
| `montoCheque` | Double | Monto en cheque |
| `montoDeposito` | Double | Monto en depósito |
| `ordenesIds` | List\<Long\> | IDs de órdenes a contado a incluir |
| `abonosIds` | List\<Long\> | IDs de abonos de crédito a incluir |
| `reembolsosIds` | List\<Long\> | IDs de reembolsos a incluir (egresos) |

**Respuesta**:
```json
{
  "mensaje": "Entrega creada exitosamente",
  "entrega": { /* EntregaDineroResponseDTO */ }
}
```

**Validaciones**:
- La suma de montos por método debe coincidir con el monto total
- No se pueden incluir órdenes/abonos ya entregados
- Los IDs proporcionados deben existir

**Usado en**: `CrearEntregaModal` al guardar nueva entrega

---

### 1.7. Actualizar Entrega
```
PUT /api/entregas-dinero/{id}
```

**Descripción**: Actualiza los detalles de una entrega existente (solo si está en estado `PENDIENTE`).

**Parámetros**:
- `id` (Path): ID de la entrega

**Body**: Mismo que crear entrega (`EntregaDineroCreateDTO`)

**Respuesta**:
```json
{
  "mensaje": "Entrega actualizada exitosamente",
  "entrega": { /* EntregaDineroResponseDTO */ }
}
```

**Usado en**: Editar desgloses antes de confirmar

---

### 1.8. Confirmar Entrega
```
PUT /api/entregas-dinero/{id}/confirmar
```

**Descripción**: Cambia el estado de la entrega a `ENTREGADA`.

**Parámetros**:
- `id` (Path): ID de la entrega

**Respuesta**:
```json
{
  "mensaje": "Entrega confirmada exitosamente",
  "entrega": { /* EntregaDineroResponseDTO */ }
}
```

**Efecto**:
- Marca las órdenes/abonos como `incluidaEntrega = true`
- Cambia el estado de la entrega a `ENTREGADA`
- Registra la fecha de confirmación

**Usado en**: `ConfirmarEntregaModal`

---

### 1.9. Cancelar Entrega
```
PUT /api/entregas-dinero/{id}/cancelar
```

**Descripción**: Cambia el estado de la entrega a `RECHAZADA`.

**Parámetros**:
- `id` (Path): ID de la entrega
- `motivo` (Query, opcional): Motivo de la cancelación

**Respuesta**:
```json
{
  "mensaje": "Entrega cancelada exitosamente",
  "entrega": { /* EntregaDineroResponseDTO */ }
}
```

**Efecto**:
- Desmarca las órdenes/abonos como `incluidaEntrega = false`
- Cambia el estado de la entrega a `RECHAZADA`

**Usado en**: `CancelarEntregaModal`

---

### 1.10. Eliminar Entrega
```
DELETE /api/entregas-dinero/{id}
```

**Descripción**: Elimina una entrega (solo si está en estado `PENDIENTE`).

**Parámetros**:
- `id` (Path): ID de la entrega

**Respuesta**:
```json
{
  "mensaje": "Entrega eliminada exitosamente"
}
```

**Usado en**: Eliminar entrega borrador

---

### 1.11. Validar si Entrega está Completa
```
GET /api/entregas-dinero/{id}/validar
```

**Descripción**: Valida si una entrega está completa y lista para confirmar.

**Parámetros**:
- `id` (Path): ID de la entrega

**Respuesta**: `Boolean`

**Usado en**: Validación antes de confirmar

---

### 1.12. Obtener Total Entregado por Sede en Período
```
GET /api/entregas-dinero/sede/{sedeId}/total-entregado
```

**Descripción**: Calcula el total entregado por una sede en un período.

**Parámetros**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sedeId` | Long (Path) | ID de la sede |
| `desde` | LocalDate (Query) | Fecha desde (formato: `YYYY-MM-DD`) |
| `hasta` | LocalDate (Query) | Fecha hasta (formato: `YYYY-MM-DD`) |

**Respuesta**: `Double` (monto total)

**Usado en**: Reportes de entregas por sede

---

### 1.13. Obtener Resumen por Empleado
```
GET /api/entregas-dinero/resumen/empleado
```

**Descripción**: Obtiene un resumen de entregas agrupadas por empleado.

**Parámetros de Query**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sedeId` | Long | ID de la sede |
| `desde` | LocalDate | Fecha desde (formato: `YYYY-MM-DD`) |
| `hasta` | LocalDate | Fecha hasta (formato: `YYYY-MM-DD`) |

**Respuesta**: `List<Object[]>` con resumen por empleado

**Usado en**: Reportes de empleados

---

## 2. ENDPOINTS DE REEMBOLSOS DE VENTAS

### 2.1. Listar Reembolsos con Filtros Completos
```
GET /api/reembolsos-venta
```

**Descripción**: Lista todos los reembolsos de venta con filtros opcionales.

**Parámetros de Query (todos opcionales)**:
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `ordenId` | Long | Filtrar por orden específica |
| `clienteId` | Long | Filtrar por cliente |
| `sedeId` | Long | Filtrar por sede |
| `estado` | String | Valores: `PENDIENTE`, `PROCESADO`, `ANULADO` |
| `fechaDesde` | LocalDate | Fecha desde (formato: `YYYY-MM-DD`) |
| `fechaHasta` | LocalDate | Fecha hasta (formato: `YYYY-MM-DD`) |
| `procesado` | Boolean | true = procesados, false = pendientes |
| `page` | Integer | Número de página |
| `size` | Integer | Tamaño de página (default: 20, máximo: 100) |
| `sortBy` | String | Campo para ordenar (`fecha`, `monto`) - default: `fecha` |
| `sortOrder` | String | Orden: `ASC` o `DESC` - default: `DESC` |

**Respuesta**:
- Si hay paginación: `PageResponse<ReembolsoVentaResponseDTO>`
- Si no hay paginación: `List<ReembolsoVentaResponseDTO>`

**Usado en**: `CrearEntregaModal` para cargar reembolsos disponibles (con `sedeId`)

---

### 2.2. Obtener Reembolso Específico
```
GET /api/reembolsos-venta/{id}
```

**Descripción**: Obtiene los detalles de un reembolso específico.

**Parámetros**:
- `id` (Path): ID del reembolso

**Respuesta**: `ReembolsoVentaResponseDTO`

**Usado en**: Ver detalle de reembolso

---

### 2.3. Obtener Reembolsos por Orden
```
GET /api/reembolsos-venta/orden/{ordenId}
```

**Descripción**: Lista todos los reembolsos asociados a una orden específica.

**Parámetros**:
- `ordenId` (Path): ID de la orden

**Respuesta**: `List<ReembolsoVentaResponseDTO>`

**Usado en**: Ver reembolsos de una orden

---

### 2.4. Crear Reembolso
```
POST /api/reembolsos-venta
```

**Descripción**: Crea un nuevo reembolso de venta.

**Body** (`ReembolsoVentaCreateDTO`):
```json
{
  "ordenId": 130,
  "clienteId": 7,
  "fecha": "2026-01-05",
  "totalReembolso": 100000.0,
  "motivo": "Producto defectuoso",
  "observaciones": "Cliente solicita cambio"
}
```

**Respuesta**: `ReembolsoVentaResponseDTO`

**Usado en**: Crear nuevo reembolso

---

### 2.5. Procesar Reembolso
```
PUT /api/reembolsos-venta/{id}/procesar
```

**Descripción**: Marca el reembolso como procesado (cambia estado a `PROCESADO`).

**Parámetros**:
- `id` (Path): ID del reembolso

**Respuesta**:
```json
{
  "mensaje": "Reembolso procesado exitosamente",
  "reembolsoId": 27,
  "estado": "PROCESADO"
}
```

**Usado en**: Confirmar que el reembolso fue entregado al cliente

---

### 2.6. Anular Reembolso
```
PUT /api/reembolsos-venta/{id}/anular
```

**Descripción**: Anula un reembolso (cambia estado a `ANULADO`).

**Parámetros**:
- `id` (Path): ID del reembolso

**Respuesta**:
```json
{
  "mensaje": "Reembolso anulado exitosamente",
  "reembolsoId": 27,
  "estado": "ANULADO"
}
```

**Usado en**: Anular un reembolso incorrecto

---

### 2.7. Eliminar Reembolso
```
DELETE /api/reembolsos-venta/{id}
```

**Descripción**: Elimina un reembolso (solo si está en estado `PENDIENTE`).

**Parámetros**:
- `id` (Path): ID del reembolso

**Respuesta**:
```json
{
  "mensaje": "Reembolso eliminado exitosamente",
  "reembolsoId": 27
}
```

**Usado en**: Eliminar reembolso borrador

---

## 3. 🔴 PROBLEMA DETECTADO - CAMPO `tipoMovimiento`

### 3.1. Descripción del Problema

**Endpoint afectado**: `GET /api/entregas-dinero/ordenes-disponibles`

El backend está asignando incorrectamente el campo `tipoMovimiento` en los detalles de entrega.

### 3.2. Comportamiento Actual (INCORRECTO)

```java
// EntregaDetalle.java - Línea 48
private TipoMovimiento tipoMovimiento = TipoMovimiento.INGRESO;
```

**Problema**: Por defecto, todos los detalles se crean con `tipoMovimiento = INGRESO`, incluso los reembolsos que deberían ser `EGRESO`.

### 3.3. Comportamiento Esperado (CORRECTO)

| Tipo de Movimiento | Cuando Aplicar | Descripción |
|-------------------|----------------|-------------|
| **INGRESO** | Órdenes a contado | Dinero que entra de ventas completas |
| **INGRESO** | Abonos de crédito | Dinero que entra de pagos parciales |
| **EGRESO** | Reembolsos de ventas | Dinero que sale (devoluciones al cliente) |

### 3.4. Campo Confiable Actual

**Campo**: `reembolsoId`

**Lógica**:
```javascript
// Frontend debe usar esta validación temporal
if (detalle.reembolsoId != null) {
  tipoMovimiento = 'EGRESO';  // Es una devolución
} else {
  tipoMovimiento = 'INGRESO'; // Es un ingreso normal
}
```

### 3.5. Ubicación del Código del Problema

**Archivo**: `src/main/java/com/casaglass/casaglass_backend/model/EntregaDetalle.java`

**Métodos afectados**:

#### Línea 82-100: `inicializarDesdeOrden()`
```java
public void inicializarDesdeOrden() {
    if (this.orden != null) {
        // ... código ...
        this.tipoMovimiento = TipoMovimiento.INGRESO; // ⚠️ SIEMPRE INGRESO
        // ... código ...
    }
}
```

**Problema**: Asigna `INGRESO` sin verificar si es un reembolso.

#### Línea 103-118: `inicializarDesdeAbono()`
```java
public void inicializarDesdeAbono(Abono abono) {
    if (abono != null && abono.getOrden() != null) {
        // ... código ...
        this.tipoMovimiento = TipoMovimiento.INGRESO; // ✅ CORRECTO
        // ... código ...
    }
}
```

**Estado**: Correcto, los abonos siempre son ingresos.

#### Línea 121-135: `inicializarDesdeReembolso()`
```java
public void inicializarDesdeReembolso(ReembolsoVenta reembolso) {
    if (reembolso != null && reembolso.getOrdenOriginal() != null) {
        this.reembolsoVenta = reembolso;
        this.orden = reembolso.getOrdenOriginal();
        // Monto negativo para representar egreso
        this.montoOrden = -Math.abs(reembolso.getTotalReembolso());
        // ... código ...
        this.tipoMovimiento = TipoMovimiento.EGRESO; // ✅ CORRECTO
        // ... código ...
    }
}
```

**Estado**: Correcto, los reembolsos se marcan como `EGRESO`.

### 3.6. Solución Propuesta

El problema principal está en que el código ya tiene la lógica correcta en los métodos `inicializarDesdeReembolso()` y `inicializarDesdeAbono()`, pero si se usa `inicializarDesdeOrden()` para crear un detalle de reembolso, asignará incorrectamente `INGRESO`.

**Recomendación**: Asegurar que siempre se use el método correcto:
- Para órdenes a contado → `inicializarDesdeOrden()`
- Para abonos de crédito → `inicializarDesdeAbono()`
- Para reembolsos → `inicializarDesdeReembolso()`

### 3.7. DTO que Maneja el Campo

**Archivo**: `src/main/java/com/casaglass/casaglass_backend/dto/EntregaDetalleSimpleDTO.java`

**Línea 58-66**:
```java
// ✅ MAPEAR TIPO DE MOVIMIENTO
// Si el campo tipoMovimiento está establecido, usarlo
// Si no, inferir: si tiene reembolsoVenta = EGRESO, de lo contrario = INGRESO
if (detalle.getTipoMovimiento() != null) {
    this.tipoMovimiento = detalle.getTipoMovimiento().name();
} else if (detalle.getReembolsoVenta() != null) {
    this.tipoMovimiento = "EGRESO";
} else {
    this.tipoMovimiento = "INGRESO";
}
```

**Nota**: El DTO tiene lógica de respaldo que infiere el tipo correcto basándose en si existe `reembolsoVenta`. Esto funciona como workaround temporal.

### 3.8. Impacto en el Frontend

**Cálculos de Totales**:
```javascript
// Frontend debe calcular totales considerando el tipo
detalles.forEach(detalle => {
  if (detalle.tipoMovimiento === 'INGRESO') {
    totalIngresos += detalle.montoOrden;
  } else if (detalle.tipoMovimiento === 'EGRESO') {
    totalEgresos += detalle.montoOrden; // Ya debería venir negativo
  }
});

montoNeto = totalIngresos - Math.abs(totalEgresos);
```

**Validación Temporal**:
```javascript
// Mientras el backend no esté corregido, usar:
const tipoReal = detalle.reembolsoId ? 'EGRESO' : 'INGRESO';
```

---

## 4. RESUMEN DE ESTADOS

### Estados de Entrega
| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Entrega creada pero no confirmada |
| `ENTREGADA` | Entrega confirmada y dinero entregado |
| `VERIFICADA` | Entrega verificada por administración |
| `RECHAZADA` | Entrega cancelada |

### Estados de Reembolso
| Estado | Descripción |
|--------|-------------|
| `PENDIENTE` | Reembolso solicitado pero no procesado |
| `PROCESADO` | Reembolso entregado al cliente |
| `ANULADO` | Reembolso cancelado |

---

## 5. FLUJO COMPLETO DE ENTREGA

1. **Crear Entrega** → `POST /api/entregas-dinero`
   - Estado inicial: `PENDIENTE`
   - Se obtienen órdenes y abonos disponibles de `/ordenes-disponibles`
   - Se incluyen IDs de órdenes, abonos y reembolsos

2. **Editar Entrega** (opcional) → `PUT /api/entregas-dinero/{id}`
   - Solo si estado es `PENDIENTE`
   - Ajustar montos, agregar/quitar detalles

3. **Confirmar Entrega** → `PUT /api/entregas-dinero/{id}/confirmar`
   - Cambia estado a `ENTREGADA`
   - Marca órdenes/abonos como `incluidaEntrega = true`
   - Ya no se puede editar

4. **Cancelar Entrega** (alternativo) → `PUT /api/entregas-dinero/{id}/cancelar`
   - Cambia estado a `RECHAZADA`
   - Libera órdenes/abonos para otra entrega

---

## 6. NOTAS IMPORTANTES

1. **Diferencia entre Órdenes y Abonos**:
   - Las órdenes a **CONTADO** se incluyen completas en la entrega
   - Las órdenes a **CRÉDITO** NO se incluyen, solo sus ABONOS individuales
   - Cada abono representa un pago parcial del cliente

2. **Reembolsos**:
   - Los reembolsos son **EGRESOS** (dinero que sale)
   - Se restan del total de la entrega
   - Deben tener `tipoMovimiento = 'EGRESO'` (ver problema en sección 3)

3. **Montos por Método de Pago**:
   - Todas las entidades tienen campos: `montoEfectivo`, `montoTransferencia`, `montoCheque`
   - La suma debe coincidir con el `total`
   - Los abonos también tienen `montoRetencion` (informativo, no suma al total)

4. **Campo `incluidaEntrega`**:
   - Orden: `incluidaEntrega = true` cuando se confirma la entrega
   - Abono: No tiene este campo directamente, se maneja a través de la orden
   - Reembolso: Se marca como procesado al incluirse en entrega

---

## 7. EJEMPLOS DE USO COMPLETOS

### Ejemplo 1: Crear Entrega con Orden de Contado y Abono de Crédito

```bash
# 1. Obtener órdenes disponibles
GET /api/entregas-dinero/ordenes-disponibles?sedeId=1&desde=2026-01-01&hasta=2026-01-05

# 2. Crear entrega
POST /api/entregas-dinero
{
  "sedeId": 1,
  "empleadoId": 3,
  "fechaEntrega": "2026-01-05",
  "modalidadEntrega": "TRANSFERENCIA",
  "monto": 3104968.07,
  "montoEfectivo": 0.0,
  "montoTransferencia": 3104968.07,
  "montoCheque": 0.0,
  "montoDeposito": 0.0,
  "ordenesIds": [130],      // Orden a contado
  "abonosIds": [27],        // Abono de crédito
  "reembolsosIds": []
}

# 3. Confirmar entrega
PUT /api/entregas-dinero/42/confirmar
```

### Ejemplo 2: Crear Entrega con Reembolso (Egreso)

```bash
# 1. Listar reembolsos pendientes
GET /api/reembolsos-venta?sedeId=1&procesado=false

# 2. Crear entrega con orden y reembolso
POST /api/entregas-dinero
{
  "sedeId": 1,
  "empleadoId": 3,
  "fechaEntrega": "2026-01-05",
  "modalidadEntrega": "EFECTIVO",
  "monto": 449800.0,        // Ingreso - Egreso = 549800 - 100000
  "montoEfectivo": 449800.0,
  "montoTransferencia": 0.0,
  "montoCheque": 0.0,
  "montoDeposito": 0.0,
  "ordenesIds": [130],      // Ingreso: 549800
  "abonosIds": [],
  "reembolsosIds": [15]     // Egreso: 100000
}
```

---

## 8. CONTACTO Y SOPORTE

Para dudas o problemas con los endpoints de entregas:
- Revisar logs del backend con el prefijo `🔍 DEBUG:`
- Validar que los IDs proporcionados existen
- Verificar que las órdenes/abonos no estén ya incluidos en otra entrega
- Consultar la sección 3 para el problema del `tipoMovimiento`

---

**Última actualización**: 2026-01-05
**Versión del documento**: 1.0
