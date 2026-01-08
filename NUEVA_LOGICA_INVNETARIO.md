# 📋 Documentación: Cambio de Inventario a Valores Decimales (Double)

**Fecha**: 8 de Enero, 2026  
**Cambio**: Soporte para cantidades decimales en inventario (ej: vidrios en m²)  
**Impacto**: Backend y Frontend

---

## 🎯 Resumen del Cambio

Se modificó el sistema de inventario para soportar **cantidades decimales** (tipo `Double`), permitiendo manejar productos que se venden en fracciones como vidrios en metros cuadrados (2.5 m², 3.75 m², etc.).

### Antes:
```java
private Integer cantidad;  // Solo enteros: 1, 2, 3, 5, 10
```

### Después:
```java
private Double cantidad;   // Enteros y decimales: 1.0, 2.5, 3.75, 10.25
```

---

## 💾 Cambios en Base de Datos

### Tabla `inventario` - Desarrollo y Producción

**ANTES:**
```sql
`cantidad` int(11) NOT NULL CHECK (`cantidad` >= 0)
```

**DESPUÉS:**
```sql
`cantidad` decimal(10,2) NOT NULL
```

**Características:**
- ✅ Soporta decimales con 2 dígitos de precisión (ej: 2.50, 3.75)
- ✅ Soporta valores negativos para ventas anticipadas (ej: -2.50)
- ✅ Compatible con enteros (5 se guarda como 5.00)
- ✅ Rango: -99,999,999.99 a +99,999,999.99

**Comando ejecutado:**
```sql
ALTER TABLE inventario MODIFY COLUMN cantidad DECIMAL(10,2) NOT NULL;
```

---

## 🔧 Cambios en Backend (Java)

### 1. Entidad Principal

**Archivo:** `Inventario.java`

```java
@Column(nullable = false)
// Permite valores negativos para ventas anticipadas
// Permite valores decimales para productos en fracciones (ej: vidrios en m²)
private Double cantidad;
```

---

### 2. DTOs Modificados (12 archivos)

Todos los DTOs que manejan cantidades de inventario fueron actualizados:

#### 📦 **InventarioProductoDTO**
```java
private Double cantidadInsula;
private Double cantidadCentro;
private Double cantidadPatios;
```

#### 📦 **ProductoInventarioCompletoDTO**
```java
private Double cantidadInsula;
private Double cantidadCentro;
private Double cantidadPatios;
private Double cantidadTotal;  // suma de las 3 sedes
```

#### 📦 **InventarioActualizarDTO**
```java
private Double cantidadInsula;
private Double cantidadCentro;
private Double cantidadPatios;
```

#### 📦 **InventarioCorteDTO**
```java
private Double cantidadInsula;
private Double cantidadCentro;
private Double cantidadPatios;
```

#### 📦 **OrdenVentaDTO**
```java
// Clase ItemVentaDTO
private Double cantidad;  // Cantidad a vender

// Clase CorteDTO  
private Double cantidad;  // Cantidad de cortes

// Clase CantidadPorSedeDTO
private Double cantidad;  // Cantidad en esa sede
```

#### 📦 **IngresoCreateDTO.IngresoDetalleCreateDTO**
```java
private Double cantidad;  // Cantidad de productos ingresados
```

#### 📦 **TrasladoDetalleResponseDTO**
```java
private Double cantidad;  // Cantidad trasladada
```

#### 📦 **TrasladoMovimientoDTO.TrasladoDetalleSimpleDTO**
```java
private Double cantidad;  // Cantidad en movimiento
```

#### 📦 **ReembolsoVentaCreateDTO.ReembolsoVentaDetalleDTO**
```java
private Double cantidad;  // Cantidad a devolver
```

#### 📦 **ReembolsoVentaResponseDTO.ReembolsoVentaDetalleResponseDTO**
```java
private Double cantidad;  // Cantidad devuelta
```

#### 📦 **ReembolsoIngresoCreateDTO.ReembolsoIngresoDetalleDTO**
```java
private Double cantidad;  // Cantidad a devolver al proveedor
```

---

## 🌐 Cambios Requeridos en Frontend

### 1. Tipos TypeScript/JavaScript

**ANTES:**
```typescript
interface InventarioProducto {
  id: number;
  nombre: string;
  cantidadInsula: number;    // ❌ Integer
  cantidadCentro: number;    // ❌ Integer
  cantidadPatios: number;    // ❌ Integer
}
```

**DESPUÉS:**
```typescript
interface InventarioProducto {
  id: number;
  nombre: string;
  cantidadInsula: number;    // ✅ Double (JavaScript number soporta decimales)
  cantidadCentro: number;    // ✅ Double
  cantidadPatios: number;    // ✅ Double
}
```

**NOTA:** En JavaScript/TypeScript, el tipo `number` soporta tanto enteros como decimales, **NO es necesario cambiar tipos**.

---

### 2. Validaciones de Formularios

**Productos normales (enteros):**
```typescript
// Validación para productos normales (ej: tornillos, marcos)
cantidad: [5, [Validators.required, Validators.min(1)]]  // ✅ Enviar enteros: 5
```

**Vidrios (decimales):**
```typescript
// Validación para vidrios (ej: m²)
cantidad: [2.5, [
  Validators.required, 
  Validators.min(0.01),
  Validators.pattern(/^\d+(\.\d{1,2})?$/)  // Permite decimales con 2 dígitos
]]
```

---

### 3. Ejemplos de Peticiones HTTP

#### **POST /api/ordenes/venta** (Crear orden de venta)

**Productos normales (enviar enteros):**
```json
{
  "items": [
    {
      "producto": { "id": 1 },
      "cantidad": 5,        // ✅ Entero válido
      "precio": 25000.00
    }
  ]
}
```

**Vidrios (enviar decimales):**
```json
{
  "items": [
    {
      "producto": { "id": 10 },
      "cantidad": 2.5,      // ✅ Decimal válido (2.5 m²)
      "precio": 50000.00
    },
    {
      "producto": { "id": 11 },
      "cantidad": 3.75,     // ✅ Decimal válido (3.75 m²)
      "precio": 75000.00
    }
  ]
}
```

**Mixto (enteros y decimales):**
```json
{
  "items": [
    {
      "producto": { "id": 1 },
      "cantidad": 10,       // ✅ Producto normal (10 unidades)
      "precio": 25000.00
    },
    {
      "producto": { "id": 10 },
      "cantidad": 2.5,      // ✅ Vidrio (2.5 m²)
      "precio": 50000.00
    }
  ]
}
```

---

#### **POST /api/ingresos** (Registrar ingreso de productos)

```json
{
  "proveedor": { "id": 5 },
  "numeroFactura": "F-12345",
  "detalles": [
    {
      "producto": { "id": 1 },
      "cantidad": 100,           // ✅ Producto normal (100 unidades)
      "costoUnitario": 5000.00
    },
    {
      "producto": { "id": 10 },
      "cantidad": 15.5,          // ✅ Vidrio (15.5 m²)
      "costoUnitario": 30000.00
    }
  ]
}
```

---

#### **PUT /api/productos/{id}/inventario** (Actualizar inventario)

```json
{
  "cantidadInsula": 50.25,    // ✅ Decimales permitidos
  "cantidadCentro": 30.5,     // ✅ Decimales permitidos
  "cantidadPatios": 20.0      // ✅ Enteros también válidos (20.0 = 20)
}
```

---

### 4. Mostrar Cantidades en UI

**Formateo recomendado:**

```typescript
// Función para formatear cantidades
function formatearCantidad(cantidad: number, esVidrio: boolean = false): string {
  if (esVidrio) {
    return cantidad.toFixed(2) + ' m²';  // "2.50 m²"
  } else {
    // Para productos normales, mostrar sin decimales si es entero
    return cantidad % 1 === 0 
      ? cantidad.toFixed(0)       // "5"
      : cantidad.toFixed(2);      // "5.50"
  }
}

// Ejemplos:
formatearCantidad(5, false)     // "5"
formatearCantidad(5.0, false)   // "5"
formatearCantidad(5.5, false)   // "5.50"
formatearCantidad(2.5, true)    // "2.50 m²"
formatearCantidad(10, true)     // "10.00 m²"
```

**Ejemplo en tabla HTML:**
```html
<td>{{ producto.esVidrio ? (producto.cantidadInsula | number:'1.2-2') + ' m²' 
                          : (producto.cantidadInsula | number:'1.0-2') }}</td>
```

---

## 🔍 Validaciones Backend

El backend **NO valida** si un producto debe ser entero o decimal. Acepta ambos formatos:

- ✅ `5` → Se guarda como `5.00`
- ✅ `5.0` → Se guarda como `5.00`
- ✅ `2.5` → Se guarda como `2.50`
- ✅ `3.75` → Se guarda como `3.75`

**Responsabilidad del Frontend:**
- Productos normales → Enviar enteros (5, 10, 100)
- Vidrios → Enviar decimales según necesidad (2.5, 3.75)

---

## ⚙️ Operaciones Matemáticas

El backend realiza operaciones con `Double`:

```java
// Restar inventario (venta)
inventario.setCantidad(inventario.getCantidad() - cantidadVendida);
// Ejemplo: 10.0 - 2.5 = 7.5 ✅

// Sumar inventario (ingreso)
inventario.setCantidad(inventario.getCantidad() + cantidadIngresada);
// Ejemplo: 5.25 + 3.75 = 9.0 ✅

// Valores negativos (ventas anticipadas)
inventario.setCantidad(inventario.getCantidad() - cantidadVendida);
// Ejemplo: 2.0 - 5.0 = -3.0 ✅ (vendiste 3 unidades que aún no tienes)
```

---

## 📊 Ejemplos de Respuestas del Backend

### GET /api/productos (Listar productos con inventario)

```json
{
  "content": [
    {
      "id": 1,
      "codigo": "P-001",
      "nombre": "Marco de Aluminio",
      "cantidadInsula": 50.0,      // ✅ Entero mostrado como decimal
      "cantidadCentro": 30.0,
      "cantidadPatios": 20.0,
      "cantidadTotal": 100.0
    },
    {
      "id": 10,
      "codigo": "V-001",
      "nombre": "Vidrio Templado 6mm",
      "esVidrio": true,
      "cantidadInsula": 15.5,      // ✅ Decimal real
      "cantidadCentro": 8.25,
      "cantidadPatios": 12.75,
      "cantidadTotal": 36.5
    },
    {
      "id": 15,
      "codigo": "P-015",
      "nombre": "Bisagra Premium",
      "cantidadInsula": -5.0,      // ✅ Negativo (venta anticipada)
      "cantidadCentro": 10.0,
      "cantidadPatios": 5.0,
      "cantidadTotal": 10.0
    }
  ]
}
```

---

## 🧪 Testing

### Casos de Prueba Recomendados

1. **Vender producto normal (entero):**
   - Cantidad: `5`
   - Inventario antes: `10.0`
   - Inventario después: `5.0` ✅

2. **Vender vidrio (decimal):**
   - Cantidad: `2.5`
   - Inventario antes: `10.0`
   - Inventario después: `7.5` ✅

3. **Venta anticipada (negativo):**
   - Cantidad: `5.0`
   - Inventario antes: `2.0`
   - Inventario después: `-3.0` ✅

4. **Ingreso con decimales:**
   - Cantidad: `15.75`
   - Inventario antes: `5.25`
   - Inventario después: `21.0` ✅

5. **Traslado entre sedes (decimal):**
   - Cantidad trasladada: `3.5`
   - Sede origen antes: `10.0` → después: `6.5` ✅
   - Sede destino antes: `5.0` → después: `8.5` ✅

---

## ⚠️ Consideraciones Importantes

### Precisión de Decimales
- **Base de datos:** `DECIMAL(10,2)` → 2 dígitos decimales
- **Java:** `Double` → Mayor precisión, pero se redondea al guardar
- **Frontend:** Limitar input a 2 decimales para consistencia

### Redondeo
```javascript
// Redondear a 2 decimales antes de enviar
function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

// Ejemplo:
redondear(2.567)  // 2.57 ✅
redondear(2.564)  // 2.56 ✅
```

### Comparaciones
```javascript
// ❌ INCORRECTO (problemas de punto flotante)
if (cantidad === 2.5) { }

// ✅ CORRECTO
if (Math.abs(cantidad - 2.5) < 0.01) { }
```

---

## 🚀 Pasos para Implementar en Frontend

### 1. **Actualizar Interfaces TypeScript**
No requiere cambios (tipo `number` ya soporta decimales).

### 2. **Actualizar Validadores de Formularios**
```typescript
// Para vidrios, agregar validación de decimales
this.form = this.fb.group({
  cantidad: ['', [
    Validators.required,
    Validators.min(0.01),
    Validators.pattern(/^\d+(\.\d{1,2})?$/)  // Máximo 2 decimales
  ]]
});
```

### 3. **Actualizar Formateo de Cantidades**
```typescript
// Mostrar cantidades correctamente en tablas
formatearCantidad(cantidad: number, esVidrio: boolean): string {
  return esVidrio 
    ? cantidad.toFixed(2) + ' m²'
    : (cantidad % 1 === 0 ? cantidad.toFixed(0) : cantidad.toFixed(2));
}
```

### 4. **Validar Inputs de Usuario**
```html
<!-- Input para productos normales -->
<input type="number" 
       [(ngModel)]="cantidad" 
       step="1" 
       min="1">

<!-- Input para vidrios -->
<input type="number" 
       [(ngModel)]="cantidad" 
       step="0.01" 
       min="0.01" 
       max="999999.99">
```

### 5. **Redondear antes de Enviar**
```typescript
// Antes de enviar al backend
enviarOrden() {
  const orden = {
    items: this.items.map(item => ({
      ...item,
      cantidad: Math.round(item.cantidad * 100) / 100  // Redondear a 2 decimales
    }))
  };
  this.api.post('/api/ordenes/venta', orden).subscribe(...);
}
```

---

## 📁 Archivos Modificados

### Backend (Java)
1. `Inventario.java` (entidad)
2. `InventarioProductoDTO.java`
3. `ProductoInventarioCompletoDTO.java`
4. `InventarioActualizarDTO.java`
5. `InventarioCorteDTO.java`
6. `OrdenVentaDTO.java`
7. `IngresoCreateDTO.java`
8. `TrasladoDetalleResponseDTO.java`
9. `TrasladoMovimientoDTO.java`
10. `ReembolsoVentaCreateDTO.java`
11. `ReembolsoVentaResponseDTO.java`
12. `ReembolsoIngresoCreateDTO.java`

### Base de Datos
- Tabla `inventario` en **Desarrollo** y **Producción**

---

## ✅ Checklist de Implementación

### Backend
- [x] Modificar tabla `inventario` → `DECIMAL(10,2)`
- [x] Cambiar `Inventario.java` → `Double cantidad`
- [x] Actualizar DTOs → `Double cantidad`
- [ ] Compilar y desplegar backend

### Frontend
- [ ] Actualizar validadores de formularios (agregar soporte decimal)
- [ ] Implementar formateo de cantidades en UI
- [ ] Agregar validación de 2 decimales en inputs
- [ ] Actualizar tests unitarios
- [ ] Probar ventas con decimales
- [ ] Probar ingresos con decimales
- [ ] Probar traslados con decimales

---

## 📞 Contacto

Para dudas o problemas con la implementación, contactar al equipo de backend.

---

**Última actualización:** 8 de Enero, 2026  
**Versión:** 1.0
