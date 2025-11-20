# Lógica de Créditos en el Frontend

## Resumen General

El sistema de créditos en el frontend funciona en dos niveles:
1. **Atributo `credito` del Cliente**: Indica si un cliente **puede** tener créditos (permiso)
2. **Créditos de Órdenes**: Representan las deudas reales que tiene un cliente por órdenes a crédito

---

## 1. Atributo `credito` del Cliente

### Ubicación
- **Modal de Cliente**: `src/modals/ClienteModal.jsx`
- **Tabla de Clientes**: `src/componets/ClientesTable.jsx`

### Funcionamiento

#### 1.1. Creación/Edición de Cliente
- El atributo `credito` es un **checkbox** booleano (`true`/`false`)
- Se guarda en la base de datos como parte del objeto Cliente
- **NO crea créditos automáticamente**, solo indica si el cliente **tiene permiso** para comprar a crédito

```javascript
// En ClienteModal.jsx
<div className="checkbox">
  <input 
    type="checkbox" 
    name="credito" 
    id="credito-checkbox"
    checked={!!formData.credito} 
    onChange={handleChange} 
  />
  <label htmlFor="credito-checkbox" className="checkbox-text">
    ¿Tiene crédito?
  </label>
</div>
```

#### 1.2. Visualización en Tabla de Clientes
- Se muestra como "Sí" o "No" en la columna "Crédito"
- Es solo informativo, no afecta directamente la creación de órdenes

```javascript
// En ClientesTable.jsx
const formatoBool = (b) => (b ? "Sí" : "No");
// ...
<td>{formatoBool(!!cli.credito)}</td>
```

---

## 2. Créditos de Órdenes

### 2.1. Creación de Órdenes a Crédito

#### Ubicación
- **Modal de Orden**: `src/modals/OrdenModal.jsx`

#### Funcionamiento
1. Al crear una orden, hay un checkbox "Crédito" que se puede marcar
2. **IMPORTANTE**: El checkbox de crédito en la orden es **independiente** del atributo `credito` del cliente
3. Si se marca "Crédito" en la orden:
   - La orden se crea con `credito: true`
   - El backend crea automáticamente un registro de crédito asociado
   - El crédito queda en estado "ABIERTO"

```javascript
// En OrdenModal.jsx - Inicialización
const base = {
  id: null,
  fecha: new Date().toISOString().split('T')[0],
  obra: "",
  venta: true,
  credito: false, // Por defecto es false
  // ...
};

// Checkbox en el formulario
<label>
  Crédito
  <input
    type="checkbox"
    checked={form.credito}
    onChange={(e) => handleChange("credito", e.target.checked)}
  />
</label>
```

#### Payload al Crear Orden
```javascript
const payload = {
  fecha: toLocalDateOnly(form.fecha),
  obra: form.obra,
  venta: form.venta || true,
  credito: form.credito, // true o false
  clienteId: Number(form.clienteId),
  trabajadorId: Number(form.trabajadorId),
  sedeId: Number(form.sedeId),
  items: form.items.map(/* ... */),
};
```

---

### 2.2. Página de Créditos

#### Ubicación
- **Página**: `src/pages/CreditosPage.jsx`
- **Tabla**: `src/componets/CreditosTable.jsx`

#### Funcionamiento
1. **Carga de Créditos**: Se obtienen todos los créditos desde `/api/creditos`
2. **Estructura de un Crédito**:
   ```javascript
   {
     id: number,
     cliente: { id, nombre },
     orden: { numero },
     fechaInicio: string,
     fechaCierre: string | null,
     totalCredito: number,      // Monto total del crédito
     totalAbonado: number,       // Suma de todos los abonos
     saldoPendiente: number,     // totalCredito - totalAbonado
     estado: "ABIERTO" | "CERRADO" | "VENCIDO" | "ANULADO",
     abonos: [                    // Array de abonos realizados
       {
         id: number,
         fecha: string,
         metodoPago: string,
         factura: string,
         total: number,
         saldo: number
       }
     ]
   }
   ```

3. **Filtros Disponibles**:
   - Por cliente
   - Por estado (ABIERTO, CERRADO, VENCIDO, ANULADO)
   - Por rango de total de crédito
   - Por rango de saldo pendiente

4. **Acciones**:
   - **Ver Detalles**: Expande la fila para mostrar los abonos realizados
   - **Abonar**: Solo disponible si el crédito está en estado "ABIERTO"

---

### 2.3. Modal de Abono

#### Ubicación
- `src/modals/AbonoModal.jsx`

#### Funcionamiento
1. Se abre desde la tabla de créditos cuando se hace clic en "Abonar"
2. Permite registrar un pago parcial o total del crédito
3. **Validaciones**:
   - El monto debe ser > 0
   - El monto no puede exceder el saldo pendiente
   - La fecha no puede ser futura
   - Debe seleccionar un método de pago

```javascript
// Validaciones en AbonoModal.jsx
const total = parseFloat(formData.total);
if (isNaN(total) || total <= 0) {
  setError('El monto del abono debe ser mayor a 0.');
  return;
}
if (credito && total > credito.saldoPendiente) {
  setError(`El abono no puede ser mayor al saldo pendiente ($${credito.saldoPendiente?.toLocaleString()}).`);
  return;
}
```

4. **Payload al Crear Abono**:
```javascript
const abonoData = {
  total: total,
  fecha: formData.fecha,
  metodoPago: formData.metodoPago,
  factura: formData.factura
};

// POST /api/creditos/{creditoId}/abonos
await api.post(`/creditos/${credito?.id}/abonos`, abonoData);
```

5. **Después de crear un abono**:
   - Se recarga la lista de créditos
   - El saldo pendiente se actualiza automáticamente
   - Si el saldo llega a 0, el crédito cambia a estado "CERRADO" (backend)

---

### 2.4. Facturación de Órdenes a Crédito

#### Ubicación
- `src/modals/FacturarOrdenModal.jsx`

#### Funcionamiento
1. **Validación de Crédito Pendiente**:
   ```javascript
   const creditoPendiente = Boolean(orden?.credito) && 
                            Number(orden?.creditoDetalle?.saldoPendiente || 0) > 0;
   ```

2. **Restricción**:
   - Si una orden es a crédito (`orden.credito === true`) Y tiene saldo pendiente (`saldoPendiente > 0`), **NO se puede facturar**
   - Se muestra un mensaje de error:
     ```javascript
     if (creditoPendiente) {
       showError("Esta orden es a crédito y tiene saldo pendiente. No se puede facturar hasta completar el pago.");
       return;
     }
     ```

3. **Lógica**:
   - Una orden a crédito debe ser pagada completamente (mediante abonos) antes de poder facturarse
   - Esto asegura que no se facturen órdenes con deuda pendiente

---

## 3. Flujo Completo de un Crédito

### Escenario: Cliente compra a crédito

1. **Cliente tiene `credito: true`** (permiso para comprar a crédito)
   - Se configura en el modal de cliente

2. **Se crea una Orden con `credito: true`**
   - En `OrdenModal.jsx`, se marca el checkbox "Crédito"
   - Se envía al backend con `credito: true`
   - El backend crea automáticamente un registro de crédito

3. **El crédito aparece en la página de Créditos**
   - Estado: "ABIERTO"
   - `saldoPendiente = totalCredito` (aún no hay abonos)

4. **Se registran abonos**
   - Desde `CreditosPage.jsx` → botón "Abonar"
   - Se abre `AbonoModal.jsx`
   - Cada abono reduce el `saldoPendiente`

5. **Cuando `saldoPendiente = 0`**
   - El backend cambia el estado a "CERRADO"
   - Ya se puede facturar la orden (si es necesario)

---

## 4. Diferencias Clave

| Concepto | Descripción | Ubicación |
|----------|-------------|-----------|
| **`cliente.credito`** | Permiso del cliente para comprar a crédito (booleano) | `ClienteModal.jsx` |
| **`orden.credito`** | Indica si una orden específica es a crédito (booleano) | `OrdenModal.jsx` |
| **Registro de Crédito** | Entidad que representa la deuda real del cliente | `CreditosPage.jsx` |
| **Abono** | Pago parcial o total de un crédito | `AbonoModal.jsx` |

---

## 5. Endpoints Utilizados

```javascript
// Obtener todos los créditos
GET /api/creditos

// Crear un abono para un crédito
POST /api/creditos/{creditoId}/abonos

// Crear una orden (puede incluir credito: true)
POST /api/ordenes

// Actualizar una orden (puede cambiar credito)
PUT /api/ordenes/{ordenId}
```

---

## 6. Notas Importantes

1. **El atributo `credito` del cliente NO es obligatorio** para crear órdenes a crédito
   - Es solo informativo/permisivo
   - El checkbox en la orden funciona independientemente

2. **Los créditos se crean automáticamente** cuando se crea una orden con `credito: true`
   - No hay un endpoint explícito para crear créditos
   - El backend los crea al procesar la orden

3. **El estado del crédito se gestiona en el backend**
   - "ABIERTO": Tiene saldo pendiente
   - "CERRADO": Saldo pendiente = 0
   - "VENCIDO": Pasó la fecha de vencimiento (si aplica)
   - "ANULADO": Crédito cancelado

4. **No se puede facturar una orden a crédito con saldo pendiente**
   - Esto se valida en `FacturarOrdenModal.jsx`
   - Debe pagarse completamente primero

---

## 7. Dashboard y Estadísticas

El dashboard (`HomePage.jsx` y `AdminPage.jsx`) muestra:
- Total de créditos abiertos
- Monto total pendiente
- Créditos cerrados
- Créditos vencidos
- Resumen por trabajador (ventas a crédito)

Estos datos vienen del backend en el endpoint del dashboard.


