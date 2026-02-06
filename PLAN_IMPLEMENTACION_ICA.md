# 📋 Plan de Implementación: ICA en Frontend

## 🎯 Objetivo
Implementar el Impuesto de Industria y Comercio (ICA) en el frontend, similar a la retención en la fuente, permitiendo su configuración y visualización en órdenes y facturas.

---

## 📊 Estructura del Plan

### **FASE 1: Servicios y Endpoints** 🔧
**Prioridad: ALTA** - Base para todo lo demás

#### 1.1 Actualizar `OrdenesService.js`
- [ ] Agregar método `actualizarRetencionIca(ordenId, icaData)` para el nuevo endpoint `PUT /api/ordenes/{id}/retencion-ica`
- [ ] Actualizar `crearOrdenVenta()` para incluir `tieneRetencionIca` y `porcentajeIca` en el payload
- [ ] Actualizar `actualizarOrden()` para incluir `tieneRetencionIca` y `porcentajeIca` en el payload
- [ ] Verificar que los métodos existentes manejen correctamente los nuevos campos en las respuestas

#### 1.2 Actualizar `FacturasService.js`
- [ ] Actualizar `crearFactura()` para incluir `retencionIca` (opcional) en el payload
- [ ] Actualizar `actualizarFactura()` para incluir `retencionIca` en el payload
- [ ] Verificar que `obtenerFactura()` maneje correctamente `retencionIca` en la respuesta

**Archivos a modificar:**
- `src/services/OrdenesService.js`
- `src/services/FacturasService.js`

---

### **FASE 2: Formularios de Orden** 📝
**Prioridad: ALTA** - Permite crear/editar órdenes con ICA

#### 2.1 Modal de Crear Orden
- [ ] Agregar checkbox "Aplicar Retención ICA" (`tieneRetencionIca`)
- [ ] Agregar input numérico "Porcentaje ICA (%)" (`porcentajeIca`) - opcional, solo visible si checkbox está marcado
- [ ] Agregar validación: si `tieneRetencionIca = false`, asegurar que `retencionIca = 0`
- [ ] Agregar helper text: "Opcional: Si no se especifica, se usa el valor por defecto"
- [ ] Incluir campos en el payload al enviar

#### 2.2 Modal de Editar Orden
- [ ] Agregar checkbox "Aplicar Retención ICA" (`tieneRetencionIca`)
- [ ] Agregar input numérico "Porcentaje ICA (%)" (`porcentajeIca`) - opcional
- [ ] Cargar valores existentes de la orden al abrir el modal
- [ ] Mismas validaciones que en crear orden
- [ ] Incluir campos en el payload al actualizar

#### 2.3 Validaciones
- [ ] Validar que si `tieneRetencionIca = false`, entonces `retencionIca = 0.0`
- [ ] Validar rango de `porcentajeIca`: 0-100, con decimales permitidos
- [ ] Mostrar mensajes de error claros

**Archivos a modificar:**
- `src/modals/CrearOrdenModal.jsx` (o similar)
- `src/modals/EditarOrdenModal.jsx` (o similar)
- Buscar modales relacionados con órdenes

---

### **FASE 3: Visualización de Datos** 👁️
**Prioridad: MEDIA** - Muestra ICA en interfaces existentes

#### 3.1 Tabla de Órdenes
- [ ] Agregar columna "Ret. ICA" (opcional, puede ser colapsable)
- [ ] Mostrar valor de `retencionIca` si `tieneRetencionIca = true`, sino mostrar "-"
- [ ] Formatear como moneda COP

#### 3.2 Modal de Detalle de Orden (`OrdenDetalleModal.jsx`)
- [ ] Actualizar sección "Resumen de Impuestos" para incluir ICA
- [ ] Mostrar: "Retención ICA (X%): $Y" si `tieneRetencionIca = true`
- [ ] Mostrar `porcentajeIca` si está configurado, sino mostrar "Default"
- [ ] Actualizar cálculo de totales para incluir ICA
- [ ] Mantener orden lógico: Subtotal → IVA → Ret. ICA → Ret. Fuente → Total

#### 3.3 Modal de Detalle de Factura
- [ ] Mostrar `retencionIca` en la sección de totales
- [ ] Actualizar `FacturaImprimirModal.jsx` para incluir ICA en la impresión
- [ ] Mostrar siempre el monto de ICA (incluso si es 0)

#### 3.4 Impresión de Facturas
- [ ] Agregar línea "Retención ICA: $X" en la sección de totales
- [ ] Mostrar siempre, incluso si es $0.00 (similar a retención en la fuente)

**Archivos a modificar:**
- `src/componets/OrdenesTable.jsx`
- `src/modals/OrdenDetalleModal.jsx`
- `src/modals/FacturaImprimirModal.jsx`
- `src/componets/FacturasTable.jsx` (si es necesario)

---

### **FASE 4: Nuevo Modal de Actualizar ICA** ⭐
**Prioridad: MEDIA** - Funcionalidad adicional

#### 4.1 Crear `ActualizarIcaModal.jsx`
- [ ] Crear nuevo componente modal
- [ ] Incluir checkbox `tieneRetencionIca`
- [ ] Incluir input `porcentajeIca` (opcional)
- [ ] Incluir input `retencionIca` (obligatorio si está activo)
- [ ] Incluir input `iva` (opcional, para recalcular)
- [ ] Validaciones:
  - Si `tieneRetencionIca = false`, `retencionIca` debe ser `0.0`
  - `porcentajeIca` entre 0-100
- [ ] Llamar a `PUT /api/ordenes/{id}/retencion-ica`
- [ ] Manejar errores y mostrar mensajes
- [ ] Cerrar modal y refrescar datos después de éxito

#### 4.2 Integrar en Detalle de Orden
- [ ] Agregar botón "Actualizar Retención ICA" en `OrdenDetalleModal.jsx`
- [ ] Abrir `ActualizarIcaModal` al hacer clic
- [ ] Pasar datos actuales de la orden al modal
- [ ] Refrescar datos de la orden después de actualizar

**Archivos a crear:**
- `src/modals/ActualizarIcaModal.jsx`
- `src/styles/ActualizarIcaModal.css` (si es necesario)

**Archivos a modificar:**
- `src/modals/OrdenDetalleModal.jsx`

---

### **FASE 5: Formularios de Factura** 📄
**Prioridad: BAJA** - Campo opcional

#### 5.1 Modal de Crear/Editar Factura
- [ ] Agregar campo `retencionIca` (opcional) en formulario
- [ ] Si no se envía, el backend calcula desde la orden
- [ ] Mostrar valor calculado como referencia

#### 5.2 Visualización en Tabla de Facturas
- [ ] Evaluar si es necesario agregar columna (probablemente no)
- [ ] Si se agrega, mostrar valor de `retencionIca`

**Archivos a modificar:**
- `src/modals/CrearFacturaModal.jsx` (o similar)
- `src/modals/EditarFacturaModal.jsx` (si existe)
- `src/componets/FacturasTable.jsx` (solo si es necesario)

---

## 🔄 Orden de Implementación Recomendado

### **Sprint 1: Base (FASE 1)**
1. ✅ Actualizar servicios (`OrdenesService.js`, `FacturasService.js`)
2. ✅ Probar endpoints con Postman/Thunder Client
3. ✅ Verificar que las respuestas incluyan los nuevos campos

### **Sprint 2: Formularios (FASE 2)**
1. ✅ Agregar campos ICA en modal de crear orden
2. ✅ Agregar campos ICA en modal de editar orden
3. ✅ Implementar validaciones
4. ✅ Probar creación y edición de órdenes con ICA

### **Sprint 3: Visualización (FASE 3)**
1. ✅ Actualizar tabla de órdenes (columna opcional)
2. ✅ Actualizar modal de detalle de orden
3. ✅ Actualizar impresión de facturas
4. ✅ Probar visualización en diferentes escenarios

### **Sprint 4: Funcionalidad Avanzada (FASE 4)**
1. ✅ Crear modal de actualizar ICA
2. ✅ Integrar en detalle de orden
3. ✅ Probar actualización independiente

### **Sprint 5: Facturas (FASE 5)**
1. ✅ Agregar campo opcional en formularios de factura
2. ✅ Verificar que funcione correctamente

---

## 📝 Notas de Implementación

### Campos a Agregar en Estados/Formularios

```javascript
// En formularios de orden
const [formData, setFormData] = useState({
  // ... campos existentes
  tieneRetencionIca: false,        // boolean
  porcentajeIca: null,              // number | null (opcional)
  // retencionIca se calcula en el backend
});

// En formularios de factura
const [formData, setFormData] = useState({
  // ... campos existentes
  retencionIca: 0.0,                // number (opcional)
});
```

### Validaciones Clave

```javascript
// Validación al enviar orden
if (!formData.tieneRetencionIca && formData.retencionIca !== 0) {
  // Error: Si ICA está desactivado, retención debe ser 0
}

// Validación de porcentaje
if (formData.porcentajeIca !== null && 
    (formData.porcentajeIca < 0 || formData.porcentajeIca > 100)) {
  // Error: Porcentaje debe estar entre 0 y 100
}
```

### Estructura de Payload

```javascript
// Crear/Actualizar Orden
{
  // ... campos existentes
  tieneRetencionIca: true,
  porcentajeIca: 1.5,  // o null para usar default
}

// Actualizar Solo ICA
{
  tieneRetencionIca: true,
  porcentajeIca: 1.5,  // opcional
  retencionIca: 15000.0,  // obligatorio
  iva: 190000.0  // opcional
}

// Crear/Actualizar Factura
{
  // ... campos existentes
  retencionIca: 15000.0  // opcional
}
```

---

## ✅ Checklist Final

### Servicios
- [ ] `OrdenesService.js` actualizado
- [ ] `FacturasService.js` actualizado
- [ ] Nuevo método `actualizarRetencionIca` implementado

### Formularios de Orden
- [ ] Checkbox `tieneRetencionIca` en crear orden
- [ ] Input `porcentajeIca` en crear orden
- [ ] Checkbox `tieneRetencionIca` en editar orden
- [ ] Input `porcentajeIca` en editar orden
- [ ] Validaciones implementadas

### Visualización
- [ ] Columna ICA en tabla de órdenes (opcional)
- [ ] ICA en detalle de orden
- [ ] ICA en detalle de factura
- [ ] ICA en impresión de factura

### Nuevo Modal
- [ ] `ActualizarIcaModal.jsx` creado
- [ ] Integrado en detalle de orden
- [ ] Funcionalidad probada

### Facturas
- [ ] Campo `retencionIca` en formularios (opcional)
- [ ] Visualización en facturas

### Testing
- [ ] Crear orden con ICA funciona
- [ ] Editar orden con ICA funciona
- [ ] Actualizar solo ICA funciona
- [ ] Visualización correcta en todos los lugares
- [ ] Impresión de factura incluye ICA
- [ ] Validaciones funcionan correctamente

---

## 🚀 Inicio de Implementación

**Recomendación:** Comenzar con FASE 1 (Servicios) ya que es la base para todo lo demás.

**Tiempo estimado total:** 2-3 días de desarrollo + 1 día de testing

**Dependencias:** Ninguna - los cambios son aditivos y no rompen funcionalidad existente.

