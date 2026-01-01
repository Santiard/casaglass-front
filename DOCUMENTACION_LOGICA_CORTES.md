# Documentación: Lógica de Creación de Cortes

## Índice
1. [Resumen General](#resumen-general)
2. [Caso 1: Cortar un PRODUCTO Normal](#caso-1-cortar-un-producto-normal)
3. [Caso 2: Cortar un CORTE Existente](#caso-2-cortar-un-corte-existente)
4. [Diferencias Clave](#diferencias-clave)
5. [Payload Final al Backend](#payload-final-al-backend)

---

## Resumen General

El sistema permite crear cortes de dos maneras:
- **Cortar un PRODUCTO normal** (ej: un perfil de 600 cm completo)
- **Cortar un CORTE existente** (ej: un corte previamente creado de 423 cm)

Ambos casos usan el mismo modal (`CortarModal.jsx`) pero tienen flujos ligeramente diferentes.

---

## Caso 1: Cortar un PRODUCTO Normal

### 📍 Origen: `VentaTable.jsx`

### Flujo Paso a Paso:

#### 1. **Usuario hace clic en "Cortar"** (VentaTable.jsx)
```javascript
// Línea ~55
const handleAbrirModalCorte = (producto) => {
  const precioSegunSede = isAdmin ? producto.precio1 :
    (userSede === "Insula" ? producto.precio1 :
     userSede === "Centro" ? producto.precio2 :
     userSede === "Patios" ? producto.precio3 : producto.precio1);
  
  setModalCorte({
    isOpen: true,
    producto: {
      ...producto,
      precioUsado: precioSegunSede // ✅ Se calcula el precio según la sede
    }
  });
};
```

**Datos del producto que se pasan al modal:**
- `id`: ID del producto base (ej: 123)
- `codigo`: Código del producto (ej: "192")
- `nombre`: Nombre del producto (ej: "SILLAR")
- `largoCm`: Largo del producto base (ej: 600)
- `precioUsado`: Precio según la sede del usuario (ej: $100.000)
- `categoria`: Categoría del producto
- `color`: Color del producto

---

#### 2. **Usuario ingresa medida y confirma** (CortarModal.jsx)

**Cálculos automáticos (línea ~37-56):**
```javascript
const cortesCalculados = useMemo(() => {
  // Usar el largo real del producto como base
  const largoBase = Number(producto.largoCm || producto.largo || 600); // ej: 600
  const medida = Number(medidaCorte); // ej: 250
  const medidaSobrante = largoBase - medida; // ej: 350

  // Calcular precios proporcionales
  const precioOriginal = producto.precioUsado || producto.precio || 0; // ej: $100.000
  const porcentajeCorte = medida / largoBase; // 250/600 = 0.4167
  const porcentajeSobrante = medidaSobrante / largoBase; // 350/600 = 0.5833
  
  const precioCorte = Math.round(precioOriginal * porcentajeCorte); // $41.670
  const precioSobrante = Math.round(precioOriginal * porcentajeSobrante); // $58.330

  return {
    medidaCorte: medida,
    medidaSobrante,
    precioCorte,
    precioSobrante,
    // ...
  };
}, [producto, medidaCorte]);
```

**Ejemplo de cálculo:**
- Producto: SILLAR de 600 cm a $100.000
- Usuario pide corte de 250 cm
- **Corte para vender**: 250 cm = $41.670 (41.67%)
- **Corte sobrante**: 350 cm = $58.330 (58.33%)

---

#### 3. **Se crean dos objetos de corte** (CortarModal.jsx, línea ~78-104)

**A. Corte Para Vender (va al carrito):**
```javascript
const corteParaVender = {
  ...producto,
  id: `corte_${producto.id}_${Date.now()}`, // ✅ ID único temporal
  nombre: `${producto.nombre} Corte de ${cortesCalculados.medidaCorte} CMS`,
  cantidadVender: 1,
  precioUsado: precioCorteRedondeado,
  esCorte: true, // ✅ Marca este item como corte
  medidaCorte: cortesCalculados.medidaCorte,
  productoOriginal: producto.id // ✅ Referencia al producto base
};
```

**Ejemplo:**
```json
{
  "id": "corte_123_1735689600000",
  "codigo": "192",
  "nombre": "SILLAR Corte de 250 CMS",
  "cantidadVender": 1,
  "precioUsado": 41670,
  "esCorte": true,
  "medidaCorte": 250,
  "productoOriginal": 123
}
```

**B. Corte Sobrante (va a cortesPendientes):**
```javascript
let corteSobrante = {
  productoId: producto.id, // ✅ ID del producto base
  medidaSolicitada: cortesCalculados.medidaCorte, // 250
  cantidad: 1,
  precioUnitarioSolicitado: precioCorteRedondeado, // 41670
  precioUnitarioSobrante: precioSobranteRedondeado, // 58330
  medidaSobrante: cortesCalculados.medidaSobrante, // 350
};
```

**Ejemplo:**
```json
{
  "productoId": 123,
  "medidaSolicitada": 250,
  "cantidad": 1,
  "precioUnitarioSolicitado": 41670,
  "precioUnitarioSobrante": 58330,
  "medidaSobrante": 350
}
```

---

#### 4. **Buscar cortes existentes para reutilizar** (CortarModal.jsx, línea ~107-166)

El sistema verifica si ya existen cortes con las mismas características:
- **Código base** (sin sufijo de medida)
- **Largo** (largoCm)
- **Categoría**
- **Color**

```javascript
// Buscar corte SOLICITADO (el que se vende)
const coincidenteSolicitado = buscarCoincidencia(largoSolicitado); // 250 cm
if (coincidenteSolicitado?.id) {
  corteParaVender.reutilizarCorteSolicitadoId = coincidenteSolicitado.id;
}

// Buscar corte SOBRANTE (el que queda en inventario)
const coincidenteSobrante = buscarCoincidencia(largoSobrante); // 350 cm
if (coincidenteSobrante?.id) {
  corteSobrante.reutilizarCorteId = coincidenteSobrante.id;
}
```

**Resultado:**
- Si encuentra corte de 250 cm existente → se reutiliza (no crea uno nuevo)
- Si encuentra corte de 350 cm existente → se reutiliza (no crea uno nuevo)
- Si no encuentra → el backend creará cortes nuevos

---

#### 5. **Llamar a onCortarProducto** (VentaTable.jsx, línea ~76)

```javascript
const handleCortar = async (corteParaVender, corteSobrante) => {
  if (onCortarProducto) {
    await onCortarProducto(corteParaVender, corteSobrante);
  }
};
```

Esto llama a `manejarCorte` en VenderPage.jsx

---

#### 6. **Agregar al carrito y a cortes pendientes** (VenderPage.jsx, línea ~275-285)

```javascript
const manejarCorte = async (corteParaVender, corteSobrante) => {
  try {
    // 1. Agregar el corte al carrito (como producto a vender)
    setProductosCarrito(prev => [...prev, corteParaVender]);
    
    // 2. Guardar el corte sobrante para enviar después de facturar
    setCortesPendientes(prev => [...prev, corteSobrante]);
  } catch (error) {
    showError("Error al procesar el corte. Intente nuevamente.");
  }
};
```

**Estado final:**
- **productosCarrito[]**: Contiene el corte para vender (con `esCorte: true`)
- **cortesPendientes[]**: Contiene el corte sobrante

---

#### 7. **Construir payload al crear orden** (OrdenModal.jsx, línea ~1070-1145)

**A. Items (productos normales + cortes para vender):**
```javascript
items: itemsActivos.map((i) => {
  const item = {
    productoId: Number(i.productoId), // ID temporal o real
    descripcion: i.descripcion ?? "",
    cantidad: Number(i.cantidad),
    precioUnitario: Number(i.precioUnitario),
  };
  
  // ✅ Si es un corte que reutiliza uno existente
  if (i.reutilizarCorteSolicitadoId) {
    item.reutilizarCorteSolicitadoId = Number(i.reutilizarCorteSolicitadoId);
  }
  
  return item;
}),
```

**B. Cortes (solo sobrantes):**
```javascript
const cortesEnriquecidos = (Array.isArray(cortesPendientes) ? cortesPendientes : [])
  .filter((corteSobrante) => {
    // Verificar que el item correspondiente no esté eliminado
    const itemCorrespondiente = itemsActivos.find(item => 
      Number(item.productoId) === Number(corteSobrante.productoId)
    );
    return !!itemCorrespondiente;
  })
  .map((c) => {
    const sedeId = Number(payload.sedeId);
    const cantidadesPorSede = [
      { sedeId: 1, cantidad: sedeId === 1 ? Number(c.cantidad || 1) : 0 },
      { sedeId: 2, cantidad: sedeId === 2 ? Number(c.cantidad || 1) : 0 },
      { sedeId: 3, cantidad: sedeId === 3 ? Number(c.cantidad || 1) : 0 }
    ];
    return {
      ...c,
      cantidad: Number(c.cantidad || 1),
      cantidadesPorSede: cantidadesPorSede,
      esSobrante: true,
    };
  });

const payloadConCortes = {
  ...payload,
  cortes: cortesEnriquecidos,
};
```

---

#### 8. **Payload final enviado al backend**

```json
{
  "fecha": "2026-01-01",
  "clienteId": 5,
  "sedeId": 1,
  "venta": true,
  "credito": false,
  "subtotal": 41670,
  "items": [
    {
      "productoId": 123,
      "descripcion": "SILLAR Corte de 250 CMS",
      "cantidad": 1,
      "precioUnitario": 41670,
      "reutilizarCorteSolicitadoId": 456  // ⚠️ PROBLEMA: Esto es un ID temporal, no existe en BD
    }
  ],
  "cortes": [
    {
      "productoId": 123,
      "medidaSolicitada": 250,
      "medidaSobrante": 350,
      "precioUnitarioSolicitado": 41670,
      "precioUnitarioSobrante": 58330,
      "cantidad": 1,
      "cantidadesPorSede": [
        { "sedeId": 1, "cantidad": 1 },
        { "sedeId": 2, "cantidad": 0 },
        { "sedeId": 3, "cantidad": 0 }
      ],
      "esSobrante": true,
      "reutilizarCorteId": null  // Si no encuentra corte existente
    }
  ]
}
```

---

## Caso 2: Cortar un CORTE Existente

### 📍 Origen: `VentaCortesTable.jsx`

### Flujo Paso a Paso:

#### 1. **Usuario hace clic en "Cortar"** (VentaCortesTable.jsx)

```javascript
// Línea ~17-29
const handleAbrirModalCorte = (corte) => {
  const precioSegunSede = isAdmin ? corte.precio1 :
    (userSede === "Insula" ? corte.precio1 :
     userSede === "Centro" ? corte.precio2 :
     userSede === "Patios" ? corte.precio3 : corte.precio1);
  
  setModalCorte({
    isOpen: true,
    corte: {
      ...corte,
      precioUsado: precioSegunSede // ✅ Asegura que el modal reciba el precio correcto
    }
  });
};
```

**Datos del corte que se pasan al modal:**
- `id`: ID del corte existente en BD (ej: 162)
- `codigo`: Código del corte (ej: "144")
- `nombre`: Nombre del corte (ej: "ENGANCHE Corte de 423 CMS")
- `largoCm`: Largo del corte (ej: 423)
- `precioUsado`: Precio según la sede (ej: $50.000)
- `categoria`: Categoría
- `color`: Color

---

#### 2-3. **Usuario ingresa medida, se crean objetos** (CortarModal.jsx)

**⚠️ EXACTAMENTE IGUAL que Caso 1** (misma lógica de cálculo)

**Ejemplo:**
- Corte: ENGANCHE de 423 cm a $50.000
- Usuario pide corte de 400 cm
- **Corte para vender**: 400 cm = $47.281 (94.56%)
- **Corte sobrante**: 23 cm = $2.719 (5.44%)

**Objetos creados:**

**A. corteParaVender:**
```json
{
  "id": "corte_162_1735689600000",
  "codigo": "144",
  "nombre": "ENGANCHE Corte de 423 CMS Corte de 400 CMS",  // ⚠️ Nombre concatenado
  "cantidadVender": 1,
  "precioUsado": 47281,
  "esCorte": true,
  "medidaCorte": 400,
  "productoOriginal": 162  // ✅ ID del corte base (NO del producto original)
}
```

**B. corteSobrante:**
```json
{
  "productoId": 162,  // ✅ ID del corte existente que se está cortando
  "medidaSolicitada": 400,
  "cantidad": 1,
  "precioUnitarioSolicitado": 47281,
  "precioUnitarioSobrante": 2719,
  "medidaSobrante": 23
}
```

---

#### 4. **Llamar a onCortarProducto** (VentaCortesTable.jsx, línea ~38-43)

```javascript
const handleCortar = async (corteParaVender, corteSobrante) => {
  if (onCortarProducto) {
    // ✅ Usar onCortarProducto para agregar a cortes[] y no a items[]
    onCortarProducto(corteParaVender, corteSobrante);
  }
};
```

---

#### 5-8. **EXACTAMENTE IGUAL que Caso 1**

El flujo desde aquí es idéntico:
- Se agrega a `productosCarrito[]` y `cortesPendientes[]`
- Se construye el payload con items[] y cortes[]
- Se envía al backend

---

## Diferencias Clave

| Aspecto | Caso 1: Producto Normal | Caso 2: Corte Existente |
|---------|------------------------|------------------------|
| **Origen** | VentaTable.jsx | VentaCortesTable.jsx |
| **ID Base** | ID del producto (ej: 123) | ID del corte (ej: 162) |
| **largoCm** | Siempre 600 cm | Variable (ej: 423 cm) |
| **productoOriginal** | ID del producto base | ID del corte base |
| **Callback** | `onCortarProducto` → `manejarCorte` | `onCortarProducto` → `manejarCorte` |
| **Modal** | CortarModal.jsx (mismo) | CortarModal.jsx (mismo) |

---

## Payload Final al Backend

### ✅ Caso 1: Cortar Producto Normal

```json
{
  "items": [
    {
      "productoId": 123,  // ID del producto base
      "descripcion": "SILLAR Corte de 250 CMS",
      "cantidad": 1,
      "precioUnitario": 41670
    }
  ],
  "cortes": [
    {
      "productoId": 123,  // ID del producto base
      "medidaSolicitada": 250,
      "medidaSobrante": 350,
      "precioUnitarioSolicitado": 41670,
      "precioUnitarioSobrante": 58330,
      "cantidad": 1,
      "cantidadesPorSede": [...]
    }
  ]
}
```

### ❌ Caso 2: Cortar Corte Existente (PROBLEMA ACTUAL)

```json
{
  "items": [
    {
      "productoId": 162,  // ⚠️ ID del corte (temporal), NO del producto base
      "descripcion": "ENGANCHE Corte de 423 CMS Corte de 400 CMS",
      "cantidad": 1,
      "precioUnitario": 47281
    }
  ],
  "cortes": [
    {
      "productoId": 162,  // ⚠️ ID del corte, NO del producto base
      "medidaSolicitada": 400,
      "medidaSobrante": 23,
      "precioUnitarioSolicitado": 47281,
      "precioUnitarioSobrante": 2719,
      "cantidad": 1,
      "cantidadesPorSede": [...]
    }
  ]
}
```

**Problema:**
- El backend recibe en `items[]` un corte con `productoId: 162` (que es el ID temporal del corte)
- El backend NO ejecuta `procesarCortes()` porque ve que `items[]` tiene datos
- El backend solo decrementa el inventario del corte 162
- **NUNCA crea los nuevos cortes de 400 cm y 23 cm**

---

## 🔴 Problema Identificado

### Caso 1: ✅ FUNCIONA
- El corte solicitado se agrega a `items[]` con `esCorte: true`
- El corte sobrante se agrega a `cortes[]`
- El backend procesa correctamente ambos arrays

### Caso 2: ❌ NO FUNCIONA
- El corte solicitado se agrega a `items[]` igual que Caso 1
- El corte sobrante se agrega a `cortes[]` igual que Caso 1
- **PERO** el `productoId` es el ID del corte (162), no del producto base
- El backend no distingue que este item es un corte que debe procesarse diferente

---

## 🎯 Solución Propuesta

**Opción 1: Marcar cortes de cortes de forma especial**

Agregar un campo adicional en `corteParaVender` cuando se corta un corte:

```javascript
const corteParaVender = {
  ...producto,
  id: `corte_${producto.id}_${Date.now()}`,
  nombre: `${producto.nombre} Corte de ${cortesCalculados.medidaCorte} CMS`,
  cantidadVender: 1,
  precioUsado: precioCorteRedondeado,
  esCorte: true,
  esCorteDeCortePARA BACKEND: true,  // ✅ Nuevo campo
  medidaCorte: cortesCalculados.medidaCorte,
  productoOriginal: producto.id
};
```

Luego, en OrdenModal, filtrar estos items y NO enviarlos en `items[]`:

```javascript
items: itemsActivos
  .filter(i => !i.esCorteDeCorte)  // ✅ Excluir cortes de cortes
  .map((i) => {
    // ...
  }),
```

Y agregar estos cortes a `cortes[]` junto con los sobrantes.

---

**Opción 2: Enviar TODOS los cortes en cortes[], no en items[]**

Modificar OrdenModal para que TODOS los items con `esCorte: true` vayan en `cortes[]` y no en `items[]`.

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│                   Usuario en VenderPage                  │
└───────────────┬─────────────────────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  ¿Qué está cortando?  │
    └───────┬───────────────┘
            │
    ┌───────▼────────┐    ┌──────────▼─────────┐
    │ PRODUCTO       │    │ CORTE EXISTENTE    │
    │ (VentaTable)   │    │ (VentaCortesTable) │
    └───────┬────────┘    └──────────┬─────────┘
            │                        │
            └────────┬───────────────┘
                     │
            ┌────────▼────────┐
            │  CortarModal    │
            │  (mismo modal)  │
            └────────┬────────┘
                     │
        ┌────────────▼─────────────┐
        │ Calcular proporciones    │
        │ Crear corteParaVender    │
        │ Crear corteSobrante      │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │ onCortarProducto()       │
        │ → manejarCorte()         │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │ productosCarrito[] ✅    │
        │ cortesPendientes[] ✅    │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │ OrdenModal construye:    │
        │ - items[] (solicitado)   │
        │ - cortes[] (sobrante)    │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │ Backend recibe payload   │
        │ ❓ Procesa correctamente?│
        └──────────────────────────┘
```

---

## Conclusión

**Estado Actual:**
- ✅ Cortar producto normal: FUNCIONA
- ❌ Cortar corte existente: NO FUNCIONA (el backend no crea los cortes nuevos)

**Causa Raíz:**
- Ambos casos usan la misma lógica en OrdenModal
- El problema está en que el `productoId` del corte es temporal/incorrecto cuando se corta un corte
- El backend no distingue que debe procesar este corte de forma especial

**Solución Requerida:**
- Modificar la lógica para distinguir cortes de productos normales vs. cortes de cortes existentes
- Asegurar que los cortes de cortes se envíen correctamente en el payload al backend
