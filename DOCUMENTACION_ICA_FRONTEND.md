# 📋 Documentación: Cambios en Frontend por Implementación de ICA

## 📌 Resumen

Se ha implementado el **Impuesto de Industria y Comercio (ICA)** como un impuesto adicional similar a la Retención en la Fuente. El ICA funciona de manera independiente y puede configurarse con un porcentaje personalizado desde el frontend.

---

## 🔄 Cambios en Endpoints y DTOs

### 1. **Crear Orden de Venta** 
**Endpoint:** `POST /api/ordenes/venta`

#### ✅ Campos Nuevos a Enviar:

```json
{
  "fecha": "2026-01-15",
  "obra": "Obra ejemplo",
  "descripcion": "Descripción",
  "venta": true,
  "credito": false,
  "incluidaEntrega": false,
  "tieneRetencionFuente": true,        // ← Existente
  "tieneRetencionIca": true,            // ← NUEVO (boolean)
  "porcentajeIca": 1.0,                 // ← NUEVO (opcional, número 0-100)
  "montoEfectivo": 0.0,
  "montoTransferencia": 0.0,
  "montoCheque": 0.0,
  "clienteId": 123,
  "sedeId": 1,
  "trabajadorId": 5,
  "items": [...]
}
```

#### 📝 Notas Importantes:
- **`tieneRetencionIca`**: `boolean` - Indica si la orden tiene retención ICA aplicada
- **`porcentajeIca`**: `Double` (opcional) - Porcentaje de retención ICA (0-100)
  - Si **NO se envía** o es `null`: El backend usa el valor por defecto de `BusinessSettings` (1.0%)
  - Si **se envía**: El backend usa ese porcentaje para calcular la retención ICA
- El cálculo de ICA se hace automáticamente en el backend sobre el **subtotal sin IVA**
- Solo aplica si el subtotal sin IVA supera el umbral configurado (por defecto: 1,000,000 COP)

---

### 2. **Actualizar Orden**
**Endpoint:** `PUT /api/ordenes/{id}`

#### ✅ Campos Nuevos a Enviar:

```json
{
  "id": 1221,
  "fecha": "2026-01-15",
  "obra": "Obra ejemplo",
  "descripcion": "Descripción",
  "venta": true,
  "credito": false,
  "tieneRetencionFuente": true,        // ← Existente
  "tieneRetencionIca": true,            // ← NUEVO (boolean)
  "porcentajeIca": 1.5,                 // ← NUEVO (opcional)
  "clienteId": 123,
  "sedeId": 1,
  "trabajadorId": 5,
  "items": [...]
}
```

#### 📝 Notas:
- Mismos campos que en crear orden
- El backend recalcula automáticamente `retencionIca` cuando se actualiza la orden

---

### 3. **Actualizar Solo Retención ICA** ⭐ NUEVO ENDPOINT
**Endpoint:** `PUT /api/ordenes/{id}/retencion-ica`

#### 📍 Cuándo Usar:
- Cuando solo necesitas actualizar los campos de ICA sin modificar items, cliente, etc.
- Útil para formularios específicos de configuración de impuestos

#### ✅ Request Body:

```json
{
  "tieneRetencionIca": true,            // OBLIGATORIO (boolean)
  "porcentajeIca": 1.0,                 // OPCIONAL (número 0-100)
  "retencionIca": 10000.50,             // OBLIGATORIO (número, debe ser 0.0 si tieneRetencionIca = false)
  "iva": 47500.00                       // OPCIONAL (se calcula automáticamente si no se envía)
}
```

#### ✅ Response 200 OK:

```json
{
  "mensaje": "Retención ICA actualizada exitosamente",
  "orden": {
    "id": 1221,
    "numero": 1221,
    "tieneRetencionIca": true,
    "porcentajeIca": 1.0,
    "retencionIca": 10000.50,
    "iva": 47500.00,
    "total": 297500.50,
    ...
  }
}
```

#### ⚠️ Validaciones:
- Si `tieneRetencionIca = false`, entonces `retencionIca` **DEBE** ser `0.0`
- Si `tieneRetencionIca = true` y `retencionIca = 0.0`, el backend recalcula automáticamente
- `porcentajeIca` es opcional: si no se envía, se usa el valor de `BusinessSettings`

---

### 4. **Obtener Detalle de Orden**
**Endpoint:** `GET /api/ordenes/{id}/detalle`

#### ✅ Campos Nuevos en Response:

```json
{
  "id": 1221,
  "numero": 1221,
  "fecha": "2026-01-15",
  "tieneRetencionFuente": true,        // ← Existente
  "retencionFuente": 25000.0,          // ← Existente
  "tieneRetencionIca": true,            // ← NUEVO
  "porcentajeIca": 1.0,                 // ← NUEVO
  "retencionIca": 10000.0,              // ← NUEVO
  "subtotal": 1000000.0,
  "iva": 190000.0,
  "total": 1190000.0,
  ...
}
```

---

### 5. **Obtener Detalle de Factura**
**Endpoint:** `GET /api/facturas/{id}`

#### ✅ Campos Nuevos en Response:

```json
{
  "id": 86,
  "numeroFactura": "45tm5",
  "fecha": "2026-01-15",
  "subtotal": 1000000.0,
  "iva": 190000.0,
  "retencionFuente": 25000.0,          // ← Existente
  "retencionIca": 10000.0,              // ← NUEVO
  "total": 1190000.0,
  "orden": {
    "id": 1221,
    "tieneRetencionIca": true,          // ← NUEVO
    "porcentajeIca": 1.0,               // ← NUEVO
    "retencionIca": 10000.0,            // ← NUEVO
    ...
  }
}
```

---

### 6. **Crear Factura**
**Endpoint:** `POST /api/facturas`

#### ✅ Campo Nuevo a Enviar (Opcional):

```json
{
  "ordenId": 1221,
  "clienteId": 123,
  "fecha": "2026-01-15",
  "subtotal": 1000000.0,
  "iva": 190000.0,
  "retencionFuente": 25000.0,          // ← Existente
  "retencionIca": 10000.0,             // ← NUEVO (opcional)
  "total": 1190000.0,
  "formaPago": "EFECTIVO",
  "observaciones": "..."
}
```

#### 📝 Notas:
- **`retencionIca`**: Opcional en el DTO
- Si **NO se envía**: El backend calcula automáticamente desde la orden relacionada
- Si **se envía**: El backend usa ese valor (útil para ajustes manuales)

---

### 7. **Actualizar Factura**
**Endpoint:** `PUT /api/facturas/{id}`

#### ✅ Campo Nuevo a Enviar:

```json
{
  "ordenId": 1221,
  "subtotal": 1000000.0,
  "iva": 190000.0,
  "retencionFuente": 25000.0,          // ← Existente
  "retencionIca": 10000.0,             // ← NUEVO
  "total": 1190000.0,
  ...
}
```

---

### 8. **Listar Órdenes (Tabla)**
**Endpoint:** `GET /api/ordenes` (con filtros)

#### ✅ Campos Nuevos en Response:

```json
[
  {
    "id": 1221,
    "numero": 1221,
    "fecha": "2026-01-15",
    "tieneRetencionFuente": true,      // ← Existente
    "retencionFuente": 25000.0,        // ← Existente
    "tieneRetencionIca": true,         // ← NUEVO
    "porcentajeIca": 1.0,              // ← NUEVO
    "retencionIca": 10000.0,           // ← NUEVO
    "subtotal": 1000000.0,
    "iva": 190000.0,
    "total": 1190000.0,
    ...
  }
]
```

---

## 🎯 Lógica de Cálculo de ICA

### Cómo Funciona:

1. **Base de Cálculo**: El ICA se calcula sobre el **subtotal sin IVA** (igual que la retención de fuente)

2. **Porcentaje**:
   - Si el frontend envía `porcentajeIca`: Se usa ese valor
   - Si el frontend NO envía `porcentajeIca` o es `null`: Se usa el valor de `BusinessSettings.icaRate` (por defecto: 1.0%)

3. **Umbral Mínimo**:
   - El ICA solo se aplica si el subtotal sin IVA **supera el umbral** configurado en `BusinessSettings.icaThreshold` (por defecto: 1,000,000 COP)
   - Si no supera el umbral, `retencionIca = 0.0` aunque `tieneRetencionIca = true`

4. **Fórmula**:
   ```
   Si (subtotalSinIva >= icaThreshold) Y (tieneRetencionIca = true):
     retencionIca = subtotalSinIva × (porcentajeIca / 100)
   Sino:
     retencionIca = 0.0
   ```

5. **Redondeo**: Se redondea a 2 decimales (formato contable)

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Crear Orden con ICA (Porcentaje desde Frontend)

```javascript
const crearOrdenConIca = async () => {
  const ordenData = {
    fecha: "2026-01-15",
    obra: "Proyecto ABC",
    venta: true,
    credito: false,
    tieneRetencionFuente: true,
    tieneRetencionIca: true,           // ← Activar ICA
    porcentajeIca: 1.5,                // ← Enviar porcentaje personalizado
    clienteId: 123,
    sedeId: 1,
    items: [
      {
        productoId: 456,
        cantidad: 10,
        precioUnitario: 100000
      }
    ]
  };
  
  const response = await fetch('/api/ordenes/venta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ordenData)
  });
  
  const orden = await response.json();
  // orden.retencionIca será calculado automáticamente
};
```

### Ejemplo 2: Crear Orden con ICA (Usar Porcentaje por Defecto)

```javascript
const crearOrdenConIcaDefault = async () => {
  const ordenData = {
    fecha: "2026-01-15",
    venta: true,
    tieneRetencionIca: true,           // ← Activar ICA
    // porcentajeIca: NO se envía      // ← Backend usará BusinessSettings.icaRate
    clienteId: 123,
    sedeId: 1,
    items: [...]
  };
  
  // El backend calculará con el porcentaje por defecto (1.0%)
};
```

### Ejemplo 3: Actualizar Solo Retención ICA

```javascript
const actualizarIca = async (ordenId) => {
  const icaData = {
    tieneRetencionIca: true,
    porcentajeIca: 2.0,                // ← Cambiar porcentaje
    retencionIca: 20000.0,              // ← Valor calculado o manual
    iva: 190000.0                       // ← Opcional
  };
  
  const response = await fetch(`/api/ordenes/${ordenId}/retencion-ica`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(icaData)
  });
  
  const resultado = await response.json();
  // resultado.orden contiene la orden actualizada
};
```

### Ejemplo 4: Desactivar ICA

```javascript
const desactivarIca = async (ordenId) => {
  const icaData = {
    tieneRetencionIca: false,          // ← Desactivar
    porcentajeIca: null,               // ← Opcional
    retencionIca: 0.0,                 // ← DEBE ser 0.0
    iva: 190000.0                      // ← Opcional
  };
  
  await fetch(`/api/ordenes/${ordenId}/retencion-ica`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(icaData)
  });
};
```

---

## 🔧 Cambios Necesarios en el Frontend

### 1. **Formulario de Crear/Editar Orden**

#### Campos a Agregar:

```jsx
// Checkbox para activar ICA
<FormControlLabel
  control={
    <Checkbox
      checked={formData.tieneRetencionIca}
      onChange={(e) => setFormData({
        ...formData,
        tieneRetencionIca: e.target.checked
      })}
    />
  }
  label="Aplicar Retención ICA"
/>

// Input para porcentaje ICA (opcional)
{formData.tieneRetencionIca && (
  <TextField
    label="Porcentaje ICA (%)"
    type="number"
    value={formData.porcentajeIca || ''}
    onChange={(e) => setFormData({
      ...formData,
      porcentajeIca: e.target.value ? parseFloat(e.target.value) : null
    })}
    helperText="Opcional: Si no se especifica, se usa el valor por defecto"
    inputProps={{ min: 0, max: 100, step: 0.1 }}
  />
)}
```

### 2. **Tabla de Órdenes**

#### Columnas a Agregar (Opcional):

```jsx
<TableHead>
  <TableRow>
    <TableCell>N° Orden</TableCell>
    <TableCell>Cliente</TableCell>
    <TableCell>Total</TableCell>
    <TableCell>Ret. Fuente</TableCell>
    <TableCell>Ret. ICA</TableCell>      {/* ← NUEVA COLUMNA */}
    <TableCell>Estado</TableCell>
  </TableRow>
</TableHead>

<TableBody>
  {ordenes.map(orden => (
    <TableRow key={orden.id}>
      <TableCell>{orden.numero}</TableCell>
      <TableCell>{orden.cliente?.nombre}</TableCell>
      <TableCell>${orden.total.toLocaleString()}</TableCell>
      <TableCell>
        {orden.tieneRetencionFuente ? `$${orden.retencionFuente.toLocaleString()}` : '-'}
      </TableCell>
      <TableCell>
        {orden.tieneRetencionIca ? `$${orden.retencionIca.toLocaleString()}` : '-'}
      </TableCell>
      <TableCell>{orden.estado}</TableCell>
    </TableRow>
  ))}
</TableBody>
```

### 3. **Modal de Detalle de Orden/Factura**

#### Sección de Impuestos a Actualizar:

```jsx
<div className="impuestos-section">
  <h3>Resumen de Impuestos</h3>
  
  <div className="impuesto-item">
    <span>Subtotal (sin IVA):</span>
    <span>${orden.subtotal.toLocaleString()}</span>
  </div>
  
  <div className="impuesto-item">
    <span>IVA (19%):</span>
    <span>${orden.iva.toLocaleString()}</span>
  </div>
  
  {/* ← NUEVA SECCIÓN */}
  {orden.tieneRetencionIca && (
    <div className="impuesto-item">
      <span>Retención ICA ({orden.porcentajeIca || 'Default'}%):</span>
      <span>${orden.retencionIca.toLocaleString()}</span>
    </div>
  )}
  
  <div className="impuesto-item">
    <span>Retención en la Fuente:</span>
    <span>
      {orden.tieneRetencionFuente 
        ? `$${orden.retencionFuente.toLocaleString()}` 
        : '$0'}
    </span>
  </div>
  
  <div className="impuesto-item total">
    <span>Total Facturado:</span>
    <span>${orden.total.toLocaleString()}</span>
  </div>
</div>
```

### 4. **Formulario de Actualizar Retención ICA** ⭐ NUEVO

```jsx
const ActualizarIcaModal = ({ ordenId, ordenActual, onClose }) => {
  const [formData, setFormData] = useState({
    tieneRetencionIca: ordenActual?.tieneRetencionIca || false,
    porcentajeIca: ordenActual?.porcentajeIca || null,
    retencionIca: ordenActual?.retencionIca || 0.0,
    iva: ordenActual?.iva || null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación
    if (!formData.tieneRetencionIca && formData.retencionIca !== 0.0) {
      alert('Si desactiva ICA, el valor debe ser 0.0');
      return;
    }
    
    try {
      const response = await fetch(`/api/ordenes/${ordenId}/retencion-ica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tieneRetencionIca: formData.tieneRetencionIca,
          porcentajeIca: formData.porcentajeIca || null,
          retencionIca: formData.retencionIca,
          iva: formData.iva || null
        })
      });
      
      if (response.ok) {
        const resultado = await response.json();
        alert('Retención ICA actualizada exitosamente');
        onClose();
        // Refrescar datos de la orden
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Error al actualizar retención ICA');
    }
  };

  return (
    <Modal open={true} onClose={onClose}>
      <Box>
        <h2>Actualizar Retención ICA</h2>
        <form onSubmit={handleSubmit}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.tieneRetencionIca}
                onChange={(e) => setFormData({
                  ...formData,
                  tieneRetencionIca: e.target.checked,
                  retencionIca: e.target.checked ? formData.retencionIca : 0.0
                })}
              />
            }
            label="Aplicar Retención ICA"
          />
          
          {formData.tieneRetencionIca && (
            <>
              <TextField
                label="Porcentaje ICA (%)"
                type="number"
                value={formData.porcentajeIca || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  porcentajeIca: e.target.value ? parseFloat(e.target.value) : null
                })}
                helperText="Opcional: Si no se especifica, se usa el valor por defecto"
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
              
              <TextField
                label="Valor Retención ICA"
                type="number"
                value={formData.retencionIca}
                onChange={(e) => setFormData({
                  ...formData,
                  retencionIca: parseFloat(e.target.value) || 0.0
                })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </>
          )}
          
          <Button type="submit">Guardar</Button>
          <Button onClick={onClose}>Cancelar</Button>
        </form>
      </Box>
    </Modal>
  );
};
```

---

## 📋 Checklist de Cambios en Frontend

### ✅ Formularios de Orden
- [ ] Agregar checkbox `tieneRetencionIca` en formulario de crear orden
- [ ] Agregar input `porcentajeIca` (opcional) en formulario de crear orden
- [ ] Agregar checkbox `tieneRetencionIca` en formulario de editar orden
- [ ] Agregar input `porcentajeIca` (opcional) en formulario de editar orden
- [ ] Validar que si `tieneRetencionIca = false`, entonces `retencionIca = 0.0`

### ✅ Visualización de Datos
- [ ] Mostrar `retencionIca` en tabla de órdenes (opcional)
- [ ] Mostrar `retencionIca` en detalle de orden
- [ ] Mostrar `retencionIca` en detalle de factura
- [ ] Mostrar `porcentajeIca` en detalle de orden (si está configurado)
- [ ] Actualizar sección de "Resumen de Impuestos" para incluir ICA

### ✅ Nuevos Endpoints
- [ ] Implementar llamada a `PUT /api/ordenes/{id}/retencion-ica`
- [ ] Crear modal/formulario para actualizar solo retención ICA
- [ ] Agregar botón "Actualizar ICA" en detalle de orden (opcional)

### ✅ Formularios de Factura
- [ ] Agregar campo `retencionIca` en formulario de crear factura (opcional)
- [ ] Agregar campo `retencionIca` en formulario de editar factura (opcional)
- [ ] Mostrar `retencionIca` en detalle de factura

### ✅ Tipos/Interfaces TypeScript (si aplica)
```typescript
interface OrdenVentaDTO {
  // ... campos existentes
  tieneRetencionIca?: boolean;      // ← NUEVO
  porcentajeIca?: number;            // ← NUEVO
}

interface OrdenDetalleDTO {
  // ... campos existentes
  tieneRetencionIca: boolean;        // ← NUEVO
  porcentajeIca?: number;            // ← NUEVO
  retencionIca: number;               // ← NUEVO
}

interface FacturaDetalleDTO {
  // ... campos existentes
  retencionIca: number;               // ← NUEVO
  orden: OrdenDetalleDTO;             // ← Ya incluye ICA
}

interface RetencionIcaDTO {
  tieneRetencionIca: boolean;        // ← OBLIGATORIO
  porcentajeIca?: number;            // ← OPCIONAL
  retencionIca: number;              // ← OBLIGATORIO
  iva?: number;                       // ← OPCIONAL
}
```

---

## 🎯 Flujo Recomendado

### Flujo 1: Crear Orden con ICA

1. Usuario llena formulario de orden
2. Usuario marca checkbox "Aplicar Retención ICA"
3. Usuario puede (opcionalmente) ingresar porcentaje personalizado
4. Frontend envía:
   ```json
   {
     "tieneRetencionIca": true,
     "porcentajeIca": 1.5,  // o null si no se especifica
     ...
   }
   ```
5. Backend calcula automáticamente `retencionIca`
6. Frontend muestra el valor calculado en el resumen

### Flujo 2: Actualizar Solo ICA (Sin Modificar Orden)

1. Usuario abre detalle de orden
2. Usuario hace clic en "Actualizar Retención ICA"
3. Se abre modal con campos de ICA
4. Usuario modifica valores
5. Frontend envía a `PUT /api/ordenes/{id}/retencion-ica`
6. Backend actualiza solo campos de ICA
7. Frontend refresca datos de la orden

---

## ⚠️ Validaciones Importantes

### En el Frontend:

1. **Si `tieneRetencionIca = false`**:
   - `retencionIca` **DEBE** ser `0.0`
   - `porcentajeIca` puede ser `null` o no enviarse

2. **Si `tieneRetencionIca = true`**:
   - `retencionIca` puede ser calculado automáticamente o enviado manualmente
   - `porcentajeIca` es opcional (si no se envía, backend usa default)

3. **Rango de `porcentajeIca`**:
   - Debe estar entre `0` y `100`
   - Puede tener decimales (ej: `1.5`, `2.75`)

---

## 🔍 Endpoints Resumen

| Endpoint | Método | Cambios |
|----------|--------|---------|
| `/api/ordenes/venta` | POST | ✅ Agregar `tieneRetencionIca`, `porcentajeIca` |
| `/api/ordenes/{id}` | PUT | ✅ Agregar `tieneRetencionIca`, `porcentajeIca` |
| `/api/ordenes/{id}/retencion-ica` | PUT | ⭐ **NUEVO** - Actualizar solo ICA |
| `/api/ordenes/{id}/detalle` | GET | ✅ Response incluye `tieneRetencionIca`, `porcentajeIca`, `retencionIca` |
| `/api/ordenes` | GET | ✅ Response incluye campos ICA |
| `/api/facturas` | POST | ✅ Agregar `retencionIca` (opcional) |
| `/api/facturas/{id}` | PUT | ✅ Agregar `retencionIca` |
| `/api/facturas/{id}` | GET | ✅ Response incluye `retencionIca` |

---

## 📝 Notas Finales

1. **Compatibilidad**: Los campos de ICA son opcionales en la mayoría de endpoints, por lo que el código existente seguirá funcionando
2. **Cálculo Automático**: El backend calcula `retencionIca` automáticamente si `tieneRetencionIca = true`
3. **Independencia**: ICA y Retención de Fuente son independientes - una orden puede tener ambas, ninguna, o solo una
4. **Umbral**: El ICA solo se aplica si el subtotal sin IVA supera el umbral configurado
5. **Porcentaje Personalizado**: El frontend puede enviar un porcentaje diferente al default, útil para casos especiales

---

## 🆘 Soporte

Si tienes dudas sobre la implementación, revisa:
- Los DTOs en el backend: `RetencionIcaDTO.java`, `OrdenVentaDTO.java`, `OrdenDetalleDTO.java`
- Los servicios: `OrdenService.java` (método `calcularValoresMonetariosOrden`)
- El controller: `OrdenController.java` (endpoint `PUT /api/ordenes/{id}/retencion-ica`)

