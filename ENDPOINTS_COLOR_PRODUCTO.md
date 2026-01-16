# 📋 ENDPOINTS QUE DEBEN RETORNAR EL CAMPO `color` DEL PRODUCTO

**Fecha:** 2025-01-16  
**Objetivo:** Asegurar que todos los endpoints que retornan detalles con productos incluyan el campo `color` del producto.

---

## 🎯 RESUMEN

Todos los endpoints que retornan detalles (items) con información de productos deben incluir el campo `producto.color` en sus DTOs de respuesta.

---

## 📦 1. ÓRDENES

### Endpoints que retornan detalles con productos:

#### ✅ GET `/api/ordenes/tabla`
- **DTO:** `OrdenTablaDTO` → `ItemOrdenTablaDTO`
- **Uso:** Listado paginado de órdenes en la tabla principal
- **Archivo Frontend:** `src/pages/OrdenesPage.jsx` (línea 48)
- **Función:** `listarOrdenesTabla(params)`
- **Campo requerido:** `item.producto.color`

#### ✅ GET `/api/ordenes/{id}`
- **DTO:** `OrdenDTO` → `ItemOrdenDTO`
- **Uso:** Obtener orden completa (usado como fallback en modales)
- **Archivo Frontend:** `src/modals/FacturarOrdenModal.jsx` (línea 63)
- **Función:** `obtenerOrden(id)`
- **Campo requerido:** `item.producto.color`

#### ✅ GET `/api/ordenes/{id}/detalle`
- **DTO:** `OrdenDetalleDTO` → `ItemOrdenDetalleDTO`
- **Uso:** Obtener detalles de orden (más ligero, sin relaciones circulares)
- **Archivo Frontend:** `src/services/OrdenesService.js` (línea 36)
- **Función:** `obtenerOrdenDetalle(id)`
- **Campo requerido:** `item.producto.color`

#### ✅ GET `/api/ordenes/{ordenId}/items`
- **DTO:** `ItemOrdenDTO` (array)
- **Uso:** Listar items de una orden específica
- **Archivo Frontend:** `src/services/OrdenesService.js` (línea 440)
- **Función:** `listarItems(ordenId)`
- **Campo requerido:** `item.producto.color`

---

## 📥 2. INGRESOS

### Endpoints que retornan detalles con productos:

#### ✅ GET `/api/ingresos` (paginado)
- **DTO:** `IngresoListadoDTO` (puede no incluir detalles, pero si los incluye)
- **Uso:** Listado paginado de ingresos
- **Archivo Frontend:** `src/services/IngresosService.js` (línea 85)
- **Función:** `listarIngresos(params)`
- **Nota:** Si retorna detalles, debe incluir `detalle.producto.color`

#### ✅ GET `/api/ingresos/{id}`
- **DTO:** `IngresoDTO` → `IngresoDetalleDTO`
- **Uso:** Obtener ingreso completo con detalles
- **Archivo Frontend:** `src/services/IngresosService.js` (línea 101)
- **Función:** `obtenerIngreso(id)`
- **Campo requerido:** `detalle.producto.color`
- **Evidencia Frontend:** `src/modals/IngresoDetalleModal.jsx` (línea 100) ya usa `d.producto?.color`

---

## 🔄 3. TRASLADOS

### Endpoints que retornan detalles con productos:

#### ✅ GET `/api/traslados/{id}`
- **DTO:** `TrasladoDTO` → `TrasladoDetalleDTO` (si incluye detalles)
- **Uso:** Obtener traslado completo
- **Archivo Frontend:** `src/services/TrasladosService.js` (línea 15)
- **Función:** `obtenerTraslado(id)`
- **Campo requerido:** `detalle.producto.color` (si incluye detalles)

#### ✅ GET `/api/traslados/{trasladoId}/detalles`
- **DTO:** `TrasladoDetalleDTO` (array)
- **Uso:** Listar detalles de un traslado específico
- **Archivo Frontend:** `src/services/TrasladosService.js` (línea 68)
- **Función:** `listarDetalles(trasladoId)`
- **Campo requerido:** `detalle.producto.color`
- **Evidencia Frontend:** `src/modals/MovimientoDetalleModal.jsx` (línea 92) ya usa `d.producto?.color`

#### ✅ GET `/api/traslados-movimientos` (paginado)
- **DTO:** `TrasladoMovimientoDTO` (puede no incluir detalles completos)
- **Uso:** Listado paginado de traslados
- **Archivo Frontend:** `src/services/TrasladosService.js` (línea 10)
- **Función:** `listarTraslados(params)`
- **Nota:** Si retorna detalles, debe incluir `detalle.producto.color`

---

## 🔙 4. REEMBOLSOS DE VENTA

### Endpoints que retornan detalles con productos:

#### ✅ GET `/api/reembolsos-venta` (paginado)
- **DTO:** `ReembolsoVentaListadoDTO` (puede no incluir detalles completos)
- **Uso:** Listado paginado de reembolsos de venta
- **Archivo Frontend:** `src/services/ReembolsosVentaService.js` (línea 7)
- **Función:** `listarReembolsos(params)`
- **Nota:** Si retorna detalles, debe incluir `detalle.producto.color`

#### ✅ GET `/api/reembolsos-venta/{id}`
- **DTO:** `ReembolsoVentaDTO` → `ReembolsoVentaDetalleDTO`
- **Uso:** Obtener reembolso completo con detalles
- **Archivo Frontend:** `src/services/ReembolsosVentaService.js` (línea 17)
- **Función:** `obtenerReembolso(id)`
- **Campo requerido:** `detalle.producto.color`
- **Evidencia Frontend:** `src/modals/ReembolsoVentaDetalleModal.jsx` muestra detalles pero no color actualmente

#### ✅ GET `/api/reembolsos-venta/orden/{ordenId}`
- **DTO:** `ReembolsoVentaDTO` (array) → `ReembolsoVentaDetalleDTO`
- **Uso:** Obtener reembolsos de una orden específica
- **Archivo Frontend:** `src/services/ReembolsosVentaService.js` (línea 27)
- **Función:** `obtenerReembolsosPorOrden(ordenId)`
- **Campo requerido:** `detalle.producto.color`

---

## 🔙 5. REEMBOLSOS DE INGRESO

### Endpoints que retornan detalles con productos:

#### ✅ GET `/api/reembolsos-ingreso` (paginado)
- **DTO:** `ReembolsoIngresoListadoDTO` (puede no incluir detalles completos)
- **Uso:** Listado paginado de reembolsos de ingreso
- **Archivo Frontend:** `src/services/ReembolsosIngresoService.js` (línea 7)
- **Función:** `listarReembolsos(params)`
- **Nota:** Si retorna detalles, debe incluir `detalle.producto.color`

#### ✅ GET `/api/reembolsos-ingreso/{id}`
- **DTO:** `ReembolsoIngresoDTO` → `ReembolsoIngresoDetalleDTO`
- **Uso:** Obtener reembolso completo con detalles
- **Archivo Frontend:** `src/services/ReembolsosIngresoService.js` (línea 17)
- **Función:** `obtenerReembolso(id)`
- **Campo requerido:** `detalle.producto.color`
- **Evidencia Frontend:** `src/modals/ReembolsoIngresoDetalleModal.jsx` muestra detalles pero no color actualmente

#### ✅ GET `/api/reembolsos-ingreso/ingreso/{ingresoId}`
- **DTO:** `ReembolsoIngresoDTO` (array) → `ReembolsoIngresoDetalleDTO`
- **Uso:** Obtener reembolsos de un ingreso específico
- **Archivo Frontend:** `src/services/ReembolsosIngresoService.js` (línea 27)
- **Función:** `obtenerReembolsosPorIngreso(ingresoId)`
- **Campo requerido:** `detalle.producto.color`

---

## 📊 ESTRUCTURA ESPERADA EN LOS DTOs

### Para Items/Detalles de Orden:
```java
public class ItemOrdenDTO {
    private Long id;
    private ProductoDTO producto; // Debe incluir color
    private Integer cantidad;
    private Double precioUnitario;
    private Double totalLinea;
    // ... otros campos
}

public class ProductoDTO {
    private Long id;
    private String codigo;
    private String nombre;
    private String color; // ✅ REQUERIDO
    // ... otros campos
}
```

### Para Detalles de Ingreso:
```java
public class IngresoDetalleDTO {
    private Long id;
    private ProductoDTO producto; // Debe incluir color
    private Integer cantidad;
    private Double costoUnitario;
    private Double totalLinea;
    // ... otros campos
}
```

### Para Detalles de Traslado:
```java
public class TrasladoDetalleDTO {
    private Long id;
    private ProductoDTO producto; // Debe incluir color
    private Integer cantidad;
    // ... otros campos
}
```

### Para Detalles de Reembolso:
```java
public class ReembolsoVentaDetalleDTO {
    private Long id;
    private ProductoDTO producto; // Debe incluir color
    private Integer cantidad;
    private Double precioUnitario;
    private Double totalLinea;
    // ... otros campos
}

public class ReembolsoIngresoDetalleDTO {
    private Long id;
    private ProductoDTO producto; // Debe incluir color
    private Integer cantidad;
    private Double costoUnitario;
    private Double totalLinea;
    // ... otros campos
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Órdenes:
- [ ] `ItemOrdenTablaDTO.producto.color`
- [ ] `ItemOrdenDTO.producto.color`
- [ ] `ItemOrdenDetalleDTO.producto.color`

### Ingresos:
- [ ] `IngresoDetalleDTO.producto.color`
- [ ] `IngresoListadoDTO` (si incluye detalles) → `detalle.producto.color`

### Traslados:
- [ ] `TrasladoDetalleDTO.producto.color`
- [ ] `TrasladoMovimientoDTO` (si incluye detalles) → `detalle.producto.color`

### Reembolsos de Venta:
- [ ] `ReembolsoVentaDetalleDTO.producto.color`
- [ ] `ReembolsoVentaListadoDTO` (si incluye detalles) → `detalle.producto.color`

### Reembolsos de Ingreso:
- [ ] `ReembolsoIngresoDetalleDTO.producto.color`
- [ ] `ReembolsoIngresoListadoDTO` (si incluye detalles) → `detalle.producto.color`

---

## 🔍 VERIFICACIÓN EN FRONTEND

El frontend ya está preparado para mostrar el color en varios lugares:

1. ✅ **FacturarOrdenModal.jsx** - Agregada columna "Color" en tabla de ítems
2. ✅ **IngresoDetalleModal.jsx** - Ya muestra `d.producto?.color` (línea 100)
3. ✅ **MovimientoDetalleModal.jsx** - Ya muestra `d.producto?.color` (línea 92)
4. ⚠️ **ReembolsoVentaDetalleModal.jsx** - Muestra detalles pero NO color (necesita actualización)
5. ⚠️ **ReembolsoIngresoDetalleModal.jsx** - Muestra detalles pero NO color (necesita actualización)

---

## 📝 NOTAS IMPORTANTES

1. **ProductoDTO común:** Si hay un `ProductoDTO` común usado en todos los DTOs, asegurarse de que incluya el campo `color`.

2. **Endpoints paginados:** Algunos endpoints paginados pueden no incluir detalles completos por rendimiento. Si es así, verificar si hay endpoints específicos de detalle que sí deben incluir el color.

3. **Consistencia:** Todos los DTOs que incluyen información de producto deben tener el mismo nivel de detalle (incluyendo color).

4. **Valores nulos:** El campo `color` puede ser `null` o `String` vacío si el producto no tiene color asignado. El frontend maneja esto mostrando "-" o "N/A".

---

**Última actualización:** 2025-01-16  
**Versión del documento:** 1.0

