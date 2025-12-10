# DOCUMENTACIÓN DE CAMBIOS - FILTROS Y PAGINACIÓN

## FECHA: 2025-01-XX
## VERSIÓN: 1.0

---

## ✅ ENDPOINTS IMPLEMENTADOS - FASE 1 (CRÍTICO) ✅

**COMPLETADO:** 7/7 endpoints

### 1. GET /api/ordenes/tabla ✅

**Filtros agregados:**
- `clienteId` (Long, opcional)
- `sedeId` (Long, opcional)
- `estado` (String, opcional): "ACTIVA", "ANULADA"
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `venta` (Boolean, opcional)
- `credito` (Boolean, opcional)
- `facturada` (Boolean, opcional)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "numero", "total" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<OrdenTablaDTO>`
- Si no están presentes: `List<OrdenTablaDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/ordenes/tabla?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=ACTIVA&page=1&size=20
```

---

### 2. GET /api/ordenes ✅

**Filtros agregados:** (Mismos que `/tabla`)

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Orden>`
- Si no están presentes: `List<Orden>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/ordenes?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&page=1&size=20
```

---

### 3. GET /api/ordenes/credito ✅

**Filtros agregados:**
- `clienteId` (Long, **OBLIGATORIO**)
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `estado` (String, opcional): "ABIERTO", "CERRADO", "ANULADO" (estado del crédito)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<OrdenCreditoDTO>`
- Si no están presentes: `List<OrdenCreditoDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/ordenes/credito?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=ABIERTO&page=1&size=50
```

---

### 4. GET /api/ingresos ✅

**Filtros agregados:**
- `proveedorId` (Long, opcional)
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `procesado` (Boolean, opcional)
- `numeroFactura` (String, opcional): Búsqueda parcial (case-insensitive)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "numeroFactura", "totalCosto" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Nota:** El parámetro `sedeId` se mantiene por compatibilidad pero actualmente los ingresos no tienen campo sede (todos se procesan en sede principal).

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Ingreso>`
- Si no están presentes: `List<Ingreso>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/ingresos?proveedorId=3&fechaDesde=2025-01-01&fechaHasta=2025-01-31&procesado=false&page=1&size=20
```

---

### 5. GET /api/traslados-movimientos ✅

**Filtros agregados:**
- `sedeOrigenId` (Long, opcional)
- `sedeDestinoId` (Long, opcional)
- `sedeId` (Long, opcional): Filtrar por sede origen O destino
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `estado` (String, opcional): "PENDIENTE", "CONFIRMADO" (se convierte a `confirmado` boolean)
- `confirmado` (Boolean, opcional): true para confirmados, false para pendientes
- `trabajadorId` (Long, opcional): Filtrar por trabajador que confirmó
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "id" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Nota:** El estado "CANCELADO" no está implementado en el modelo actual.

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<TrasladoMovimientoDTO>`
- Si no están presentes: `List<TrasladoMovimientoDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/traslados-movimientos?sedeId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PENDIENTE&page=1&size=20
```

---

### 6. GET /api/creditos ✅

**Filtros agregados:**
- `clienteId` (Long, opcional): **Recomendado** para mejorar rendimiento
- `sedeId` (Long, opcional): Filtrar por sede (a través de la orden)
- `estado` (String, opcional): "ABIERTO", "CERRADO", "VENCIDO", "ANULADO"
- `fechaDesde` (YYYY-MM-DD, opcional): Fecha inicio del crédito
- `fechaHasta` (YYYY-MM-DD, opcional): Fecha inicio del crédito
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)
- `sortBy` (String, opcional): "fecha", "montoTotal", "saldoPendiente" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Nota:** Si no se proporciona `clienteId`, se retornan TODOS los créditos (puede ser lento).

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<CreditoResponseDTO>`
- Si no están presentes: `List<CreditoResponseDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/creditos?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=ABIERTO&page=1&size=50
```

---

### 7. GET /api/abonos ✅ (NUEVO ENDPOINT)

**Filtros disponibles:**
- `clienteId` (Long, opcional)
- `creditoId` (Long, opcional)
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `metodoPago` (String, opcional): Búsqueda parcial (case-insensitive)
- `sedeId` (Long, opcional): Filtrar por sede (a través de la orden)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)
- `sortBy` (String, opcional): "fecha", "total" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<AbonoSimpleDTO>`
- Si no están presentes: `List<AbonoSimpleDTO>`

**Ejemplo:**
```
GET /api/abonos?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&page=1&size=50
```

---

## 📋 ESTRUCTURA DE RESPUESTA PAGINADA

Todos los endpoints que soportan paginación retornan esta estructura cuando se proporcionan `page` y `size`:

```json
{
  "content": [...],           // Array con los registros de la página actual
  "totalElements": 1000,      // Total de registros que cumplen los filtros
  "totalPages": 50,           // Total de páginas
  "page": 1,                  // Página actual (1-indexed)
  "size": 20,                 // Tamaño de página
  "hasNext": true,            // Si hay página siguiente
  "hasPrevious": false        // Si hay página anterior
}
```

**Si NO se proporcionan `page` y `size`**, el endpoint retorna un array simple (compatibilidad hacia atrás):
```json
[...]  // Array directo de objetos
```

---

## 🔄 COMPATIBILIDAD HACIA ATRÁS

**Todos los endpoints mantienen compatibilidad hacia atrás:**
- Si no se envían filtros nuevos, funcionan igual que antes
- Si no se envían `page` y `size`, retornan lista completa
- Los filtros antiguos siguen funcionando

**Ejemplos de compatibilidad:**
- `GET /api/ordenes?clienteId=5` → Funciona igual que antes
- `GET /api/ordenes?clienteId=5&fechaDesde=2025-01-01&page=1&size=20` → Usa nuevos filtros + paginación

---

## ⚠️ CAMBIOS QUE REQUIEREN ACTUALIZACIÓN EN EL FRONTEND

### 1. GET /api/creditos
**ANTES:**
```javascript
GET /api/creditos  // Retornaba TODOS los créditos
```

**AHORA:**
```javascript
// Opción 1: Sin filtros (retorna todos, puede ser lento)
GET /api/creditos

// Opción 2: Con filtros (recomendado)
GET /api/creditos?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&page=1&size=50
```

**ACCIÓN REQUERIDA EN FRONTEND:**
- Actualizar llamadas a `/api/creditos` para incluir `clienteId` cuando sea posible
- Implementar paginación si se esperan muchos resultados

---

### 2. GET /api/abonos (NUEVO)
**ANTES:**
```javascript
// No existía este endpoint
// Se usaba GET /api/abonos/cliente/{clienteId}
```

**AHORA:**
```javascript
// Nuevo endpoint con filtros completos
GET /api/abonos?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&page=1&size=50
```

**ACCIÓN REQUERIDA EN FRONTEND:**
- Evaluar si se puede migrar de `/api/abonos/cliente/{clienteId}` a `/api/abonos?clienteId={clienteId}`
- El nuevo endpoint es más flexible y soporta más filtros

---

### 3. GET /api/ordenes/tabla
**ANTES:**
```javascript
GET /api/ordenes/tabla?sedeId=1  // Filtro básico
```

**AHORA:**
```javascript
// Mismo endpoint pero con más filtros disponibles
GET /api/ordenes/tabla?sedeId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=ACTIVA&page=1&size=20
```

**ACCIÓN REQUERIDA EN FRONTEND:**
- Opcional: Agregar filtros de fecha, estado, etc. para mejorar rendimiento
- Opcional: Implementar paginación si hay muchas órdenes

---

### 4. GET /api/ingresos
**ANTES:**
```javascript
GET /api/ingresos?sedeId=1  // Filtro básico (nota: actualmente no filtra por sede)
```

**AHORA:**
```javascript
// Más filtros disponibles
GET /api/ingresos?proveedorId=3&fechaDesde=2025-01-01&fechaHasta=2025-01-31&procesado=false&page=1&size=20
```

**ACCIÓN REQUERIDA EN FRONTEND:**
- Opcional: Agregar filtros de fecha, proveedor, etc. para mejorar rendimiento
- Opcional: Implementar paginación si hay muchos ingresos

---

### 5. GET /api/traslados-movimientos
**ANTES:**
```javascript
GET /api/traslados-movimientos?sedeId=1  // Filtro básico
```

**AHORA:**
```javascript
// Más filtros disponibles
GET /api/traslados-movimientos?sedeId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PENDIENTE&page=1&size=20
```

**ACCIÓN REQUERIDA EN FRONTEND:**
- Opcional: Agregar filtros de fecha, estado, etc. para mejorar rendimiento
- Opcional: Implementar paginación si hay muchos traslados

---

## 📊 VALIDACIONES IMPLEMENTADAS

### Validaciones de Fechas:
- Si se proporcionan `fechaDesde` y `fechaHasta`, se valida que `fechaDesde <= fechaHasta`
- Si la validación falla, se retorna error 400 con mensaje descriptivo

### Validaciones de Paginación:
- `page` mínimo: 1 (se ajusta automáticamente si es menor)
- `size` mínimo: 1 (se ajusta automáticamente si es menor)
- `size` máximo según endpoint:
  - Órdenes, Ingresos, Traslados: 100
  - Créditos, Abonos: 200

### Validaciones de Ordenamiento:
- `sortOrder` se convierte a mayúsculas automáticamente
- Si `sortOrder` no es "ASC" ni "DESC", se usa "DESC" por defecto
- Si `sortBy` no es válido, se usa el campo por defecto del endpoint

### Validaciones de Estado:
- Los valores de `estado` se validan contra los enums correspondientes
- Si el estado es inválido, se retorna error 400 con valores válidos

---

## 🔍 DIFERENCIAS CON EL DOCUMENTO PROPUESTO

### 1. Estados de Orden
**Documento propone:** "ACTIVA", "ANULADA", "COMPLETADA", "PENDIENTE"
**Implementado:** "ACTIVA", "ANULADA" (según enum `EstadoOrden`)

**ACCIÓN REQUERIDA:** Si el frontend necesita "COMPLETADA" o "PENDIENTE", se debe agregar al enum.

---

### 2. Estados de Traslado
**Documento propone:** "PENDIENTE", "CONFIRMADO", "CANCELADO"
**Implementado:** "PENDIENTE", "CONFIRMADO" (basado en `fechaConfirmacion`)
**No implementado:** "CANCELADO" (no existe en el modelo actual)

**ACCIÓN REQUERIDA:** Si se necesita "CANCELADO", se debe agregar al modelo `Traslado`.

---

### 3. Estados de Crédito
**Documento propone:** "ACTIVO", "PAGADO", "VENCIDO"
**Implementado:** "ABIERTO", "CERRADO", "VENCIDO", "ANULADO" (según enum `EstadoCredito`)

**ACCIÓN REQUERIDA:** El frontend debe usar los valores del enum: "ABIERTO" (no "ACTIVO"), "CERRADO" (no "PAGADO").

---

### 4. Filtro de Fecha en Créditos
**Documento propone:** Filtro por "fecha desde del abono"
**Implementado:** Filtro por "fecha inicio del crédito" (`fechaInicio`)

**ACCIÓN REQUERIDA:** Si el frontend necesita filtrar por fecha del abono, se debe implementar una query más compleja que una los abonos.

---

### 5. SedeId en Ingresos
**Documento propone:** Filtro por `sedeId`
**Implementado:** El parámetro se acepta pero actualmente los ingresos no tienen campo sede (todos se procesan en sede principal)

**ACCIÓN REQUERIDA:** Si se necesita filtrar por sede, se debe agregar el campo `sedeId` al modelo `Ingreso`.

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad:** Todos los cambios son retrocompatibles. El código existente seguirá funcionando.

2. **Rendimiento:** Los filtros se aplican en la base de datos, no en memoria. Esto mejora significativamente el rendimiento.

3. **Paginación:** La paginación es opcional. Si no se proporciona, se retorna la lista completa (comportamiento anterior).

4. **Ordenamiento:** El ordenamiento por defecto es por fecha DESC (más recientes primero).

5. **Búsquedas de texto:** Las búsquedas de texto (como `numeroFactura`, `metodoPago`) son parciales y case-insensitive.

---

---

## ✅ ENDPOINTS IMPLEMENTADOS - FASE 2 (IMPORTANTE) ✅

**COMPLETADO:** 4/4 endpoints disponibles (1 cancelado porque no existe)

### 8. GET /api/facturas ✅

**Filtros agregados:**
- `clienteId` (Long, opcional)
- `sedeId` (Long, opcional)
- `estado` (String, opcional): "PENDIENTE", "PAGADA", "ANULADA", "EN_PROCESO"
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `numeroFactura` (String, opcional): Búsqueda parcial (case-insensitive)
- `ordenId` (Long, opcional)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "numeroFactura", "total" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Factura>`
- Si no están presentes: `List<Factura>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/facturas?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PAGADA&page=1&size=20
```

---

### 9. GET /api/facturas/tabla ✅

**Filtros agregados:** (Mismos que `/facturas` pero sin `numeroFactura` y `ordenId`)

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<FacturaTablaDTO>`
- Si no están presentes: `List<FacturaTablaDTO>` (compatibilidad hacia atrás)

---

### 10. GET /api/reembolsos-venta ✅

**Filtros agregados:**
- `ordenId` (Long, opcional)
- `clienteId` (Long, opcional)
- `sedeId` (Long, opcional)
- `estado` (String, opcional): "PENDIENTE", "PROCESADO", "ANULADO"
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `procesado` (Boolean, opcional)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "monto" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<ReembolsoVentaResponseDTO>`
- Si no están presentes: `List<ReembolsoVentaResponseDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/reembolsos-venta?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PENDIENTE&page=1&size=20
```

---

### 11. GET /api/reembolsos-ingreso ✅

**Filtros agregados:**
- `ingresoId` (Long, opcional)
- `proveedorId` (Long, opcional)
- `sedeId` (Long, opcional): **No implementado actualmente** (los ingresos no tienen campo sede)
- `estado` (String, opcional): "PENDIENTE", "PROCESADO", "ANULADO"
- `fechaDesde` (YYYY-MM-DD, opcional)
- `fechaHasta` (YYYY-MM-DD, opcional)
- `procesado` (Boolean, opcional)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "monto" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<ReembolsoIngresoResponseDTO>`
- Si no están presentes: `List<ReembolsoIngresoResponseDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/reembolsos-ingreso?proveedorId=3&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PENDIENTE&page=1&size=20
```

---

### 12. GET /api/entregas-dinero ✅

**Filtros agregados:**
- `sedeId` (Long, opcional)
- `empleadoId` (Long, opcional)
- `estado` (String, opcional): "PENDIENTE", "ENTREGADA", "VERIFICADA", "RECHAZADA"
- `desde` (YYYY-MM-DD, opcional)
- `hasta` (YYYY-MM-DD, opcional)
- `conDiferencias` (Boolean, opcional): **No implementado actualmente** (requiere cálculo adicional)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 20, máximo: 100)
- `sortBy` (String, opcional): "fecha", "id" (default: "fecha")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "DESC")

**Nota:** Los estados son diferentes a los propuestos: "ENTREGADA", "VERIFICADA", "RECHAZADA" (no "CONFIRMADA", "CANCELADA")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<EntregaDineroResponseDTO>`
- Si no están presentes: `List<EntregaDineroResponseDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/entregas-dinero?sedeId=1&desde=2025-01-01&hasta=2025-01-31&estado=ENTREGADA&page=1&size=20
```

---

## ✅ ENDPOINTS IMPLEMENTADOS - FASE 3 (MEJORAS) ✅

**COMPLETADO:** 4/4 endpoints

### 13. GET /api/productos ✅

**Filtros agregados:**
- `categoriaId` (Long, opcional)
- `categoria` (String, opcional): Búsqueda parcial por nombre de categoría
- `tipo` (String, opcional): Enum TipoProducto
- `color` (String, opcional): Enum ColorProducto
- `codigo` (String, opcional): Búsqueda parcial por código (case-insensitive)
- `nombre` (String, opcional): Búsqueda parcial por nombre (case-insensitive)
- `conStock` (Boolean, opcional): true para productos con stock > 0 (requiere `sedeId`)
- `sedeId` (Long, opcional): Requerido si `conStock=true`
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)
- `sortBy` (String, opcional): "codigo", "nombre", "categoria" (default: "codigo")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "ASC")

**Nota:** El parámetro `q` (query) sigue funcionando para compatibilidad hacia atrás.

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Producto>`
- Si no están presentes: `List<Producto>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/productos?categoriaId=1&tipo=UNID&conStock=true&sedeId=1&page=1&size=50
```

---

### 14. GET /api/inventario-completo ✅

**Filtros agregados:**
- `categoriaId` (Long, opcional)
- `categoria` (String, opcional): Búsqueda parcial por nombre de categoría
- `tipo` (String, opcional): Enum TipoProducto
- `color` (String, opcional): Enum ColorProducto
- `codigo` (String, opcional): Búsqueda parcial por código (case-insensitive)
- `nombre` (String, opcional): Búsqueda parcial por nombre (case-insensitive)
- `sedeId` (Long, opcional): Requerido si `conStock=true` o `sinStock=true`
- `conStock` (Boolean, opcional): true para productos con stock > 0 (requiere `sedeId`)
- `sinStock` (Boolean, opcional): true para productos sin stock (requiere `sedeId`)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 100, máximo: 500)

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<ProductoInventarioCompletoDTO>`
- Si no están presentes: `List<ProductoInventarioCompletoDTO>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/inventario-completo?categoriaId=1&conStock=true&sedeId=1&page=1&size=100
```

---

### 15. GET /api/clientes ✅

**Filtros agregados:**
- `nombre` (String, opcional): Búsqueda parcial por nombre (case-insensitive)
- `nit` (String, opcional): Búsqueda parcial por NIT (case-insensitive)
- `correo` (String, opcional): Búsqueda parcial por correo (case-insensitive)
- `ciudad` (String, opcional): Búsqueda parcial por ciudad (case-insensitive)
- `activo` (Boolean, opcional): **No implementado** (el modelo no tiene campo activo)
- `conCredito` (Boolean, opcional): true para clientes con crédito habilitado
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)
- `sortBy` (String, opcional): "nombre", "nit", "ciudad" (default: "nombre")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "ASC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Cliente>`
- Si no están presentes: `List<Cliente>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/clientes?nombre=Juan&conCredito=true&page=1&size=50
```

---

### 16. GET /api/proveedores ✅

**Filtros agregados:**
- `nombre` (String, opcional): Búsqueda parcial por nombre (case-insensitive)
- `nit` (String, opcional): Búsqueda parcial por NIT (case-insensitive)
- `ciudad` (String, opcional): Búsqueda parcial por ciudad (case-insensitive)
- `correo` (String, opcional): **No implementado** (el modelo no tiene campo correo)
- `activo` (Boolean, opcional): **No implementado** (el modelo no tiene campo activo)
- `page` (Integer, opcional): Número de página (default: sin paginación)
- `size` (Integer, opcional): Tamaño de página (default: 50, máximo: 200)
- `sortBy` (String, opcional): "nombre", "nit" (default: "nombre")
- `sortOrder` (String, opcional): "ASC", "DESC" (default: "ASC")

**Respuesta:**
- Si `page` y `size` están presentes: `PageResponse<Proveedor>`
- Si no están presentes: `List<Proveedor>` (compatibilidad hacia atrás)

**Ejemplo:**
```
GET /api/proveedores?nombre=Proveedor&ciudad=Bogotá&page=1&size=50
```

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Para el Frontend:
1. Actualizar servicios para usar los nuevos filtros
2. Implementar paginación en las tablas principales
3. Agregar filtros de fecha en los modales de historial
4. Migrar de `/api/abonos/cliente/{id}` a `/api/abonos?clienteId={id}` si es conveniente

### Para el Backend (Futuro):
1. Optimizar queries con índices en base de datos
2. Implementar caché para consultas frecuentes
3. Agregar campo `sedeId` a `Ingreso` si se necesita
4. Implementar estado "CANCELADO" en `Traslado` si se necesita
5. Implementar estados "COMPLETADA" y "PENDIENTE" en `Orden` si se necesitan
6. Agregar campo `activo` a `Cliente` y `Proveedor` si se necesita
7. Agregar campo `correo` a `Proveedor` si se necesita
8. Implementar filtro `conDiferencias` en `EntregaDinero` si se necesita

---

## 📞 CONTACTO

Si tienes dudas sobre estos cambios, consulta con el equipo de desarrollo.

