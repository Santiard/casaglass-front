# CAMBIO PENDIENTE EN BACKEND - INGRESOS

## FECHA: 2025-12-19
## PRIORIDAD: MEDIA

---

## 📋 PROBLEMA ACTUAL

El endpoint paginado `GET /api/ingresos?page=X&size=Y` NO incluye los detalles (`detalles`) en la respuesta por rendimiento.

**Respuesta actual:**
```json
{
  "content": [
    {
      "id": 42,
      "fecha": "2025-12-19",
      "numeroFactura": "43434",
      "observaciones": "44",
      "totalCosto": 165000,
      "procesado": true,
      "proveedor": { "id": 1, "nombre": "Proveedor X" }
      // ❌ NO TIENE: detalles
      // ❌ NO TIENE: cantidadTotal
    }
  ],
  "totalElements": 31,
  "totalPages": 2,
  "page": 1,
  "size": 20
}
```

Esto causa que en la columna **"Total Productos"** de la tabla de ingresos se muestre "-" porque no tenemos forma de calcular la cantidad total de productos.

---

## ✅ SOLUCIÓN REQUERIDA

Agregar un campo calculado `cantidadTotal` en el DTO de respuesta del listado paginado.

### Opción 1: Agregar campo calculado en el DTO (RECOMENDADO)

Crear/modificar el DTO `IngresoListadoDTO.java`:

```java
public class IngresoListadoDTO {
    private Long id;
    private LocalDate fecha;
    private String numeroFactura;
    private String observaciones;
    private BigDecimal totalCosto;
    private Boolean procesado;
    private ProveedorSimpleDTO proveedor;
    private Integer cantidadTotal; // ✅ NUEVO CAMPO
    
    // Constructor que calcula cantidadTotal
    public IngresoListadoDTO(Ingreso ingreso) {
        this.id = ingreso.getId();
        this.fecha = ingreso.getFecha();
        this.numeroFactura = ingreso.getNumeroFactura();
        this.observaciones = ingreso.getObservaciones();
        this.totalCosto = ingreso.getTotalCosto();
        this.procesado = ingreso.getProcesado();
        this.proveedor = new ProveedorSimpleDTO(ingreso.getProveedor());
        
        // ✅ Calcular cantidad total de productos
        this.cantidadTotal = ingreso.getDetalles().stream()
            .mapToInt(detalle -> detalle.getCantidad())
            .sum();
    }
    
    // Getters y Setters...
}
```

### Opción 2: Agregar en query nativa (si usas @Query)

Si el endpoint usa una query nativa, agregar el campo calculado:

```java
@Query(value = """
    SELECT 
        i.id,
        i.fecha,
        i.numero_factura,
        i.observaciones,
        i.total_costo,
        i.procesado,
        p.id as proveedor_id,
        p.nombre as proveedor_nombre,
        (SELECT COALESCE(SUM(d.cantidad), 0) 
         FROM ingreso_detalle d 
         WHERE d.ingreso_id = i.id) as cantidad_total
    FROM ingreso i
    LEFT JOIN proveedor p ON i.proveedor_id = p.id
    WHERE (:proveedorId IS NULL OR i.proveedor_id = :proveedorId)
      AND (:fechaDesde IS NULL OR i.fecha >= :fechaDesde)
      AND (:fechaHasta IS NULL OR i.fecha <= :fechaHasta)
      AND (:procesado IS NULL OR i.procesado = :procesado)
    ORDER BY i.fecha DESC
    """, 
    nativeQuery = true)
Page<IngresoProjection> findAllWithFilters(...);
```

---

## 🎯 RESPUESTA ESPERADA

Después del cambio:

```json
{
  "content": [
    {
      "id": 42,
      "fecha": "2025-12-19",
      "numeroFactura": "43434",
      "observaciones": "44",
      "totalCosto": 165000,
      "procesado": true,
      "proveedor": { "id": 1, "nombre": "Proveedor X" },
      "cantidadTotal": 35  // ✅ NUEVO CAMPO: suma de todas las cantidades de los detalles
    }
  ],
  "totalElements": 31,
  "totalPages": 2,
  "page": 1,
  "size": 20
}
```

---

## 📝 NOTAS ADICIONALES

- El frontend ya está preparado para usar `ing.cantidadTotal` si existe
- Mientras no esté implementado, el frontend muestra "-" en la columna
- Este cambio NO afecta el endpoint individual `GET /api/ingresos/{id}` que sí trae los detalles completos
- Es importante para la UX ya que permite ver rápidamente cuántos productos entraron en cada ingreso sin tener que abrir los detalles

---

## ✅ VERIFICACIÓN

Una vez implementado, verificar:

1. La respuesta del endpoint incluye `cantidadTotal`
2. El valor coincide con la suma de cantidades de los detalles
3. La columna "Total Productos" en la tabla muestra números en lugar de "-"

---

## 📍 ARCHIVOS FRONTEND AFECTADOS

- `src/componets/IngresoTable.jsx` - Líneas 315-325
- Lógica actual: `const cantidadMostrar = ing.cantidadTotal ?? (dets.length > 0 ? totalProductos : null);`
