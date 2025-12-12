# Especificación: Cálculo de Retención de Fuente en Órdenes

## 📋 Resumen Ejecutivo

Este documento explica **qué envía el frontend al backend** al crear/editar una orden y **qué debe calcular el backend** para manejar correctamente el IVA y la retención de fuente.

---

## 🔑 Conceptos Clave

### Supuestos Estándar (Colombia)
- **IVA**: 19% (incluido en el precio del producto)
- **Retención en la Fuente (retefuente)**: 2.5% (NO incluida en el precio, se descuenta al momento del pago)
- **Los precios de los productos ya incluyen IVA**

### Flujo Lógico de Cálculo

1. **Total Facturado** = Suma de (precioUnitario × cantidad) de todos los items
   - Este total **YA incluye IVA** (19%)
   - Este total **NO incluye retención de fuente**

2. **Subtotal (Base sin IVA)** = Total Facturado ÷ 1.19
   - Esta es la base imponible para calcular retención

3. **IVA** = Total Facturado - Subtotal

4. **Retención de Fuente** = Subtotal × % retefuente (solo si aplica)

5. **Total a Pagar** = Total Facturado - Retención de Fuente

---

## 📤 QUÉ ENVÍA EL FRONTEND AL BACKEND

### Al Crear/Editar una Orden

El frontend envía el siguiente payload al endpoint `POST /api/ordenes/venta` o `PUT /api/ordenes/{id}`:

```json
{
  "fecha": "2025-01-15",
  "obra": "Obra X" (opcional, solo para Jairo Velandia),
  "descripcion": "Descripción con métodos de pago" (opcional),
  "venta": true,
  "credito": false,
  "tieneRetencionFuente": false,  // ⚠️ IMPORTANTE: boolean que indica si aplica retefuente
  "descuentos": 0,                 // ⚠️ IMPORTANTE: monto de descuentos en pesos
  "clienteId": 1,
  "sedeId": 1,
  "trabajadorId": 1 (opcional),
  "items": [
    {
      "productoId": 1,
      "cantidad": 2,
      "descripcion": "Descripción del item",
      "precioUnitario": 1000000     // ⚠️ IMPORTANTE: precio CON IVA incluido
    }
  ],
  "cortes": [] (opcional)
}
```

**⚠️ NOTA**: El frontend NO envía el campo `subtotal` explícitamente. El backend debe calcularlo sumando los items.

### ⚠️ Campos Críticos Explicados

#### 1. `subtotal` (NO se envía, debe calcularse en el backend)
- **Tipo**: `number`
- **Descripción**: Suma de `precioUnitario × cantidad` de todos los items
- **Cálculo en Backend**: `subtotal = sum(items.map(item => item.precioUnitario * item.cantidad))`
- **Incluye IVA**: ✅ SÍ (el precio ya incluye IVA)
- **Ejemplo**: Si tienes 2 items de $1,000,000 cada uno → `subtotal = 2,000,000`

#### 2. `descuentos`
- **Tipo**: `number`
- **Descripción**: Monto total de descuentos en pesos
- **Ejemplo**: `descuentos = 100,000`

#### 3. `tieneRetencionFuente`
- **Tipo**: `boolean`
- **Descripción**: Indica si la orden debe tener retención de fuente aplicada
- **Condición**: Solo se marca como `true` si:
  - El usuario marca el checkbox en el modal
  - Y la base imponible (subtotal - descuentos) supera el umbral configurado
- **Valor al crear**: Siempre `false` (se marca al facturar o editar)

#### 4. `precioUnitario` (en items)
- **Tipo**: `number`
- **Descripción**: Precio unitario del producto
- **Incluye IVA**: ✅ SÍ (el precio del producto ya incluye IVA)

---

## 🧮 QUÉ DEBE CALCULAR EL BACKEND

El backend **NO debe confiar** en los cálculos del frontend. Debe recalcular todo desde cero usando los datos enviados.

### Paso 1: Calcular Subtotal (Total Facturado)

```java
// Calcular subtotal sumando todos los items
double subtotal = orden.getItems().stream()
    .mapToDouble(item -> item.getPrecioUnitario() * item.getCantidad())
    .sum(); // 2,000,000

// Este subtotal YA incluye IVA
```

### Paso 2: Calcular Base Imponible (Subtotal sin IVA)

```java
// Base imponible = Total facturado - Descuentos
double descuentos = orden.getDescuentos();   // 0
double baseConIva = subtotal - descuentos;  // 2,000,000

// Extraer el subtotal sin IVA: dividir por (1 + IVA)
double ivaRate = 0.19; // 19%
double subtotalSinIva = baseConIva / (1 + ivaRate); // 2,000,000 / 1.19 = 1,680,672.27
```

### Paso 3: Calcular IVA

```java
double iva = baseConIva - subtotalSinIva; // 2,000,000 - 1,680,672.27 = 319,327.73
```

### Paso 4: Calcular Retención de Fuente (si aplica)

```java
double retencionFuente = 0.0;

if (orden.getTieneRetencionFuente() == true) {
    // Obtener porcentaje de retefuente desde BusinessSettings
    double retefuenteRate = businessSettings.getReteRate(); // 2.5% = 0.025
    
    // Calcular retención sobre el subtotal sin IVA
    retencionFuente = subtotalSinIva * retefuenteRate; // 1,680,672.27 * 0.025 = 42,016.81
}
```

### Paso 5: Calcular Total de la Orden

```java
// El total de la orden es el total facturado (con IVA incluido)
// La retención NO se resta del total de la orden, solo afecta el pago
double totalOrden = baseConIva; // 2,000,000
```

### Paso 6: Guardar en la Entidad Orden

```java
orden.setSubtotal(subtotalSinIva);        // 1,680,672.27
orden.setIva(iva);                        // 319,327.73
orden.setTotal(totalOrden);               // 2,000,000
orden.setRetencionFuente(retencionFuente); // 42,016.81 (si tieneRetencionFuente = true)
```

---

## 📊 Ejemplo Completo

### Datos Enviados por el Frontend

```json
{
  "descuentos": 0,
  "tieneRetencionFuente": true,
  "items": [
    {
      "productoId": 1,
      "cantidad": 2,
      "precioUnitario": 1000000
    }
  ]
}
```

**Nota**: El backend debe calcular `subtotal = 2 × 1,000,000 = 2,000,000`

### Cálculos del Backend

| Concepto | Cálculo | Valor (COP) |
|----------|---------|-------------|
| **Total Facturado** | `subtotal - descuentos` | 2,000,000 |
| **Subtotal (Base sin IVA)** | `2,000,000 / 1.19` | 1,680,672.27 |
| **IVA (19%)** | `2,000,000 - 1,680,672.27` | 319,327.73 |
| **Retención (2.5%)** | `1,680,672.27 × 0.025` | 42,016.81 |
| **Total Orden** | `2,000,000` | 2,000,000 |
| **Valor a Pagar** | `2,000,000 - 42,016.81` | 1,957,983.19 |

---

## ⚠️ IMPORTANTE: Lo que NO debe hacer el Backend

1. **NO debe confiar en el campo `subtotal` enviado como "base sin IVA"**
   - El frontend envía `subtotal` como el total CON IVA incluido
   - El backend debe extraer el subtotal sin IVA dividiendo por 1.19

2. **NO debe calcular IVA como `total × 0.19`**
   - ❌ Incorrecto: `IVA = 2,000,000 × 0.19 = 380,000`
   - ✅ Correcto: `IVA = 2,000,000 - (2,000,000 / 1.19) = 319,327.73`

3. **NO debe calcular retención sobre el total facturado**
   - ❌ Incorrecto: `Retefuente = 2,000,000 × 0.025 = 50,000`
   - ✅ Correcto: `Retefuente = (2,000,000 / 1.19) × 0.025 = 42,016.81`

4. **NO debe restar la retención del total de la orden**
   - El `total` de la orden es el total facturado (2,000,000)
   - La retención solo afecta el valor a pagar, no el total de la orden

---

## 🔄 Flujo Completo

### 1. Creación de Orden
```
Frontend → Backend:
- items: [{precioUnitario: 1,000,000, cantidad: 2}]
- descuentos: 0
- tieneRetencionFuente: false

Backend calcula:
- subtotalFacturado = 1,000,000 × 2 = 2,000,000 (CON IVA)
- subtotalSinIva = 2,000,000 / 1.19 = 1,680,672.27
- iva = 2,000,000 - 1,680,672.27 = 319,327.73
- retencionFuente = 0 (porque tieneRetencionFuente = false)
- total = 2,000,000
```

### 2. Edición de Orden (marcar retefuente)
```
Frontend → Backend:
- tieneRetencionFuente: true (usuario marcó checkbox)
- items: [{precioUnitario: 1,000,000, cantidad: 2}]

Backend recalcula:
- subtotalFacturado = 1,000,000 × 2 = 2,000,000 (CON IVA)
- subtotalSinIva = 2,000,000 / 1.19 = 1,680,672.27
- iva = 319,327.73
- retencionFuente = 1,680,672.27 × 0.025 = 42,016.81
- total = 2,000,000
```

### 3. Facturación
```
Frontend → Backend (al facturar):
- El frontend calcula y envía valores monetarios para la factura
- La orden ya tiene retencionFuente calculada
- La factura usa los valores de la orden
```

---

## 📝 Resumen para el Backend

### Campos que Recibe del Frontend:
- ✅ `descuentos`: Monto de descuentos en pesos
- ✅ `tieneRetencionFuente`: Boolean que indica si aplica retefuente
- ✅ `items[].precioUnitario`: Precio CON IVA incluido
- ✅ `items[].cantidad`: Cantidad del item

### Campos que Debe Calcular:
- ✅ `subtotalFacturado` = `sum(items.map(item => item.precioUnitario * item.cantidad))` (CON IVA incluido)
- ✅ `subtotal` (base sin IVA) = `(subtotalFacturado - descuentos) / 1.19`
- ✅ `iva` = `(subtotalFacturado - descuentos) - subtotalSinIva`
- ✅ `retencionFuente` = `subtotalSinIva × retefuenteRate` (solo si `tieneRetencionFuente = true`)
- ✅ `total` = `subtotalFacturado - descuentos` (total facturado)

### Campos que Debe Persistir:
- `subtotal` (base sin IVA) - **Este es el subtotal que se guarda en la BD**
- `iva`
- `total` (total facturado)
- `retencionFuente`
- `tieneRetencionFuente` (boolean)

---

## ✅ Checklist para el Backend

- [ ] Calcular `subtotalFacturado` sumando `precioUnitario × cantidad` de todos los items
- [ ] Calcular `subtotalSinIva` dividiendo `(subtotalFacturado - descuentos) / 1.19` (NO multiplicando por 0.81)
- [ ] Calcular `iva` como diferencia entre `(subtotalFacturado - descuentos)` y `subtotalSinIva`
- [ ] Calcular `retencionFuente` solo si `tieneRetencionFuente = true`
- [ ] Calcular `retencionFuente` sobre el `subtotalSinIva`, NO sobre el total
- [ ] Guardar `subtotal` (base sin IVA) en la entidad `Orden`
- [ ] Guardar todos los valores calculados en la entidad `Orden`
- [ ] NO confiar en cálculos del frontend, recalcular todo

---

## 📞 Contacto

Si hay dudas sobre esta especificación, revisar:
- `src/modals/OrdenModal.jsx` (líneas 900-965) - Cómo se calcula y envía el subtotal
- `src/services/OrdenesService.js` (líneas 98-170) - Formato del payload enviado
- `src/modals/FacturarOrdenModal.jsx` - Cómo se calcula al facturar

