# 📋 INTEGRACIÓN DE REEMBOLSOS EN ENTREGAS DE DINERO

**Fecha:** 2025-12-22  
**Objetivo:** Incluir reembolsos de venta en los reportes de entregas de dinero del día, calculando el monto neto (ingresos - egresos)

---

## 📦 CAMBIOS REALIZADOS

### 1. **Modificación de Base de Datos**

#### Script SQL: `agregar_reembolsos_entregas_dinero.sql`

```sql
-- Agregar columna para referenciar reembolsos de venta
ALTER TABLE entrega_detalles 
  ADD COLUMN reembolso_venta_id BIGINT NULL;

-- Agregar columna para tipo de movimiento
ALTER TABLE entrega_detalles 
  ADD COLUMN tipo_movimiento VARCHAR(20) NOT NULL DEFAULT 'INGRESO';

-- Constraint para validar tipo_movimiento
ALTER TABLE entrega_detalles
  ADD CONSTRAINT chk_tipo_movimiento 
  CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO'));

-- Foreign key a reembolsos_venta
ALTER TABLE entrega_detalles 
  ADD CONSTRAINT fk_entrega_detalle_reembolso 
    FOREIGN KEY (reembolso_venta_id) 
    REFERENCES reembolsos_venta(id)
    ON DELETE SET NULL;

-- Índice para consultas
CREATE INDEX idx_detalle_reembolso ON entrega_detalles(reembolso_venta_id);
```

**Columnas agregadas:**
- `reembolso_venta_id`: FK opcional a `reembolsos_venta` (NULL para ventas/abonos normales)
- `tipo_movimiento`: ENUM('INGRESO', 'EGRESO')
  - `INGRESO` → Ventas a contado y abonos (suma)
  - `EGRESO` → Reembolsos (resta)

---

### 2. **Modificación de Entidades**

#### `EntregaDetalle.java`

**Campos agregados:**
```java
/** Reembolso de venta incluido en la entrega (opcional - solo para egresos) */
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "reembolso_venta_id")
private ReembolsoVenta reembolsoVenta;

/** Tipo de movimiento (INGRESO para ventas/abonos, EGRESO para reembolsos) */
@Enumerated(EnumType.STRING)
@Column(name = "tipo_movimiento", length = 20, nullable = false)
private TipoMovimiento tipoMovimiento = TipoMovimiento.INGRESO;

/** Enumeración para tipo de movimiento en la entrega */
public enum TipoMovimiento {
    INGRESO,   // Ventas a contado o abonos a créditos (suma)
    EGRESO     // Reembolsos de venta (resta)
}
```

**Método nuevo:**
```java
/** Método para inicializar desde un reembolso de venta (EGRESO) */
public void inicializarDesdeReembolso(ReembolsoVenta reembolso) {
    if (reembolso != null && reembolso.getOrdenOriginal() != null) {
        this.reembolsoVenta = reembolso;
        this.orden = reembolso.getOrdenOriginal();
        // Monto negativo para representar egreso en cálculos
        this.montoOrden = -Math.abs(reembolso.getTotalReembolso());
        this.numeroOrden = reembolso.getOrdenOriginal().getNumero();
        this.fechaOrden = reembolso.getFecha();
        this.ventaCredito = reembolso.getOrdenOriginal().isCredito();
        this.tipoMovimiento = TipoMovimiento.EGRESO;
        if (reembolso.getCliente() != null) {
            this.clienteNombre = reembolso.getCliente().getNombre();
        }
    }
}
```

---

### 3. **Modificación de Servicios**

#### `EntregaDineroService.java`

**Cambios realizados:**

1. **Inyección de dependencia:**
```java
@Autowired
private ReembolsoVentaRepository reembolsoVentaRepository;
```

2. **Nuevo método `crearEntregaConReembolsos()`:**
```java
@Transactional
public EntregaDinero crearEntregaConReembolsos(
    EntregaDinero entrega, 
    List<Long> ordenIds, 
    List<Long> abonoIds, 
    List<Long> reembolsoIds) {
    // ... lógica existente para órdenes y abonos ...
    
    // 🆕 Crear detalles de entrega para cada REEMBOLSO (egresos)
    if (reembolsoIds != null && !reembolsoIds.isEmpty()) {
        for (Long reembolsoId : reembolsoIds) {
            ReembolsoVenta reembolso = reembolsoVentaRepository.findById(reembolsoId)
                .orElseThrow(() -> new RuntimeException("Reembolso no encontrado con ID: " + reembolsoId));
            
            // Validar que el reembolso esté procesado
            if (!reembolso.getProcesado() || reembolso.getEstado() != ReembolsoVenta.EstadoReembolso.PROCESADO) {
                throw new RuntimeException("El reembolso #" + reembolsoId + " no está procesado");
            }
            
            EntregaDetalle detalle = new EntregaDetalle();
            detalle.setEntrega(entregaGuardada);
            detalle.inicializarDesdeReembolso(reembolso);
            
            entregaDetalleService.crearDetalle(detalle);
        }
    }
    
    // Recalcular monto incluyendo reembolsos
    Double montoCalculado = entregaDetalleService.calcularMontoTotalEntrega(
        entregaGuardada.getId()
    );
    entregaGuardada.setMonto(montoCalculado != null ? montoCalculado : 0.0);
    
    return entregaDineroRepository.save(entregaGuardada);
}
```

3. **Método `crearEntrega()` existente mantiene compatibilidad:**
```java
@Transactional
public EntregaDinero crearEntrega(EntregaDinero entrega, List<Long> ordenIds, List<Long> abonoIds) {
    return crearEntregaConReembolsos(entrega, ordenIds, abonoIds, null);
}
```

---

### 4. **Modificación de DTOs**

#### `EntregaDineroCreateDTO.java`

**Campo agregado:**
```java
// Lista de IDs de reembolsos a incluir (egresos - se restan del total)
private List<Long> reembolsosIds;
```

---

### 5. **Modificación de Controllers**

#### `EntregaDineroController.java`

**Actualización del endpoint POST:**
```java
@PostMapping
public ResponseEntity<?> crear(@Valid @RequestBody EntregaDineroCreateDTO entregaDTO) {
    // ... código existente ...
    
    // Obtener IDs de reembolsos del DTO (para egresos)
    List<Long> reembolsosIds = entregaDTO.getReembolsosIds() != null && !entregaDTO.getReembolsosIds().isEmpty() 
        ? entregaDTO.getReembolsosIds() 
        : null;
    
    // Llamar al servicio para crear la entrega (con soporte para reembolsos)
    EntregaDinero entregaCreada = service.crearEntregaConReembolsos(
        entrega, 
        entregaDTO.getOrdenesIds(), 
        abonosIds,
        reembolsosIds
    );
    
    // ... código existente ...
}
```

---

## 🔌 ENDPOINTS

### **1. Crear Entrega de Dinero (CON REEMBOLSOS)**

**Endpoint:** `POST /api/entregas-dinero`

**Request Body:**
```json
{
  "sedeId": 1,
  "empleadoId": 5,
  "fechaEntrega": "2025-12-22",
  "modalidadEntrega": "MIXTO",
  "ordenesIds": [1001, 1002],
  "abonosIds": [42, 43],
  "reembolsosIds": [7, 8],
  "montoEfectivo": 270000.00,
  "montoTransferencia": 150000.00,
  "montoCheque": 0.00,
  "montoDeposito": 0.00
}
```

**Response 200 OK:**
```json
{
  "mensaje": "Entrega creada exitosamente",
  "entrega": {
    "id": 25,
    "sede": {
      "id": 1,
      "nombre": "Principal"
    },
    "empleado": {
      "id": 5,
      "nombre": "Juan Pérez"
    },
    "fechaEntrega": "2025-12-22",
    "monto": 420000.00,
    "montoEfectivo": 270000.00,
    "montoTransferencia": 150000.00,
    "montoCheque": 0.00,
    "montoDeposito": 0.00,
    "montoRetencion": 0.00,
    "modalidadEntrega": "MIXTO",
    "estado": "PENDIENTE",
    "detalles": [
      {
        "id": 101,
        "tipoMovimiento": "INGRESO",
        "numeroOrden": 1001,
        "montoOrden": 250000.00,
        "clienteNombre": "Cliente ABC",
        "ventaCredito": false,
        "observaciones": null
      },
      {
        "id": 102,
        "tipoMovimiento": "INGRESO",
        "numeroOrden": 1002,
        "montoOrden": 100000.00,
        "clienteNombre": "Cliente XYZ",
        "ventaCredito": false,
        "observaciones": null
      },
      {
        "id": 103,
        "tipoMovimiento": "INGRESO",
        "numeroOrden": 998,
        "montoOrden": 150000.00,
        "clienteNombre": "Cliente DEF",
        "ventaCredito": true,
        "observaciones": "Abono #42"
      },
      {
        "id": 104,
        "tipoMovimiento": "EGRESO",
        "numeroOrden": 995,
        "montoOrden": -80000.00,
        "clienteNombre": "Cliente ABC",
        "ventaCredito": false,
        "observaciones": "Reembolso #7 - EFECTIVO"
      }
    ]
  }
}
```

**Notas importantes:**
- `reembolsosIds` es opcional
- Solo se pueden incluir reembolsos con estado `PROCESADO`
- El `montoOrden` de reembolsos es **negativo** (representa egreso)
- El `monto` total de la entrega se calcula: `(ventas + abonos) - reembolsos`

---

### **2. Listar Entregas de Dinero**

**Endpoint:** `GET /api/entregas-dinero`

**Query Parameters (todos opcionales):**
- `sedeId`: Filtrar por sede
- `empleadoId`: Filtrar por empleado
- `estado`: PENDIENTE | ENTREGADA | VERIFICADA | RECHAZADA
- `desde`: fecha desde (YYYY-MM-DD)
- `hasta`: fecha hasta (YYYY-MM-DD)
- `page`: número de página
- `size`: tamaño de página
- `sortBy`: campo para ordenar (fecha, id)
- `sortOrder`: ASC | DESC

**Ejemplos:**

```
GET /api/entregas-dinero
GET /api/entregas-dinero?sedeId=1&desde=2025-12-01&hasta=2025-12-31
GET /api/entregas-dinero?empleadoId=5&estado=PENDIENTE
GET /api/entregas-dinero?page=1&size=20&sortBy=fecha&sortOrder=DESC
```

**Response 200 OK:**
```json
[
  {
    "id": 25,
    "sede": { "id": 1, "nombre": "Principal" },
    "empleado": { "id": 5, "nombre": "Juan Pérez" },
    "fechaEntrega": "2025-12-22",
    "monto": 420000.00,
    "montoEfectivo": 270000.00,
    "montoTransferencia": 150000.00,
    "montoCheque": 0.00,
    "montoDeposito": 0.00,
    "montoRetencion": 0.00,
    "modalidadEntrega": "MIXTO",
    "estado": "PENDIENTE",
    "detalles": [
      {
        "tipoMovimiento": "INGRESO",
        "numeroOrden": 1001,
        "montoOrden": 250000.00,
        "clienteNombre": "Cliente ABC"
      },
      {
        "tipoMovimiento": "EGRESO",
        "numeroOrden": 995,
        "montoOrden": -80000.00,
        "clienteNombre": "Cliente ABC"
      }
    ]
  }
]
```

---

### **3. Obtener Entrega por ID**

**Endpoint:** `GET /api/entregas-dinero/{id}`

**Response 200 OK:**
```json
{
  "id": 25,
  "sede": { "id": 1, "nombre": "Principal" },
  "empleado": { "id": 5, "nombre": "Juan Pérez" },
  "fechaEntrega": "2025-12-22",
  "monto": 420000.00,
  "montoEfectivo": 270000.00,
  "montoTransferencia": 150000.00,
  "montoCheque": 0.00,
  "montoDeposito": 0.00,
  "montoRetencion": 0.00,
  "modalidadEntrega": "MIXTO",
  "estado": "PENDIENTE",
  "detalles": [...]
}
```

---

### **4. Confirmar Entrega**

**Endpoint:** `PUT /api/entregas-dinero/{id}/confirmar`

**Response 200 OK:**
```json
{
  "mensaje": "Entrega confirmada exitosamente",
  "entrega": {
    "id": 25,
    "estado": "ENTREGADA",
    ...
  }
}
```

---

### **5. Consultar Reembolsos del Día (para incluir en entregas)**

**Endpoint:** `GET /api/reembolsos-venta`

**Query Parameters:**
```
?fecha=2025-12-22
&sedeId=1
&procesado=true
&estado=PROCESADO
```

**Response 200 OK:**
```json
[
  {
    "id": 7,
    "fecha": "2025-12-22",
    "ordenOriginal": {
      "id": 995,
      "numero": 995
    },
    "cliente": {
      "id": 3,
      "nombre": "Cliente ABC"
    },
    "sede": {
      "id": 1,
      "nombre": "Principal"
    },
    "totalReembolso": 80000.00,
    "formaReembolso": "EFECTIVO",
    "estado": "PROCESADO",
    "procesado": true,
    "detalles": [...]
  }
]
```

---

## 📊 FLUJO DE USO

### **Escenario: Crear entrega del día con reembolsos**

1. **Consultar órdenes a contado del día:**
```
GET /api/ordenes?fecha=2025-12-22&venta=true&credito=false&estado=FACTURADA
```

2. **Consultar abonos del día:**
```
GET /api/abonos?fecha=2025-12-22
```

3. **Consultar reembolsos procesados del día:**
```
GET /api/reembolsos-venta?fecha=2025-12-22&procesado=true&sedeId=1
```

4. **Crear entrega incluyendo reembolsos:**
```json
POST /api/entregas-dinero
{
  "sedeId": 1,
  "empleadoId": 5,
  "fechaEntrega": "2025-12-22",
  "modalidadEntrega": "MIXTO",
  "ordenesIds": [1001, 1002],      // Ventas a contado
  "abonosIds": [42, 43],            // Abonos de créditos
  "reembolsosIds": [7, 8],          // Reembolsos (EGRESOS)
  "montoEfectivo": 270000.00,
  "montoTransferencia": 150000.00
}
```

5. **Resultado calculado:**
```
📥 INGRESOS:
   - Orden #1001: $250,000 (EFECTIVO)
   - Orden #1002: $100,000 (EFECTIVO)
   - Abono #42:   $150,000 (TRANSFERENCIA)
   
📤 EGRESOS:
   - Reembolso #7: -$80,000 (EFECTIVO)
   
💰 TOTAL NETO: $420,000
   • Efectivo:      $270,000 ($350,000 - $80,000)
   • Transferencia: $150,000
```

---

## 🔍 VALIDACIONES

### **Al crear entrega con reembolsos:**

1. ✅ El reembolso debe existir
2. ✅ El reembolso debe estar en estado `PROCESADO`
3. ✅ El campo `procesado` del reembolso debe ser `true`
4. ✅ El monto del reembolso se resta automáticamente del total

**Errores posibles:**
```json
{
  "error": "Reembolso no encontrado con ID: 7",
  "tipo": "VALIDACION"
}
```

```json
{
  "error": "El reembolso #7 no está procesado",
  "tipo": "VALIDACION"
}
```

---

## 💡 CONSIDERACIONES IMPORTANTES

### **Tipos de reembolso según `formaReembolso`:**

| Forma Reembolso | Afecta Entrega | Se Incluye |
|----------------|----------------|------------|
| `EFECTIVO` | ✅ SÍ (resta) | ✅ SÍ |
| `TRANSFERENCIA` | ✅ SÍ (resta) | ✅ SÍ |
| `NOTA_CREDITO` | ❌ NO (sin movimiento físico) | ⚠️ Opcional |
| `AJUSTE_CREDITO` | ❌ NO (ajusta saldo) | ❌ NO |

**Recomendación:** Solo incluir reembolsos `EFECTIVO` y `TRANSFERENCIA` en entregas de dinero.

### **Cálculo del monto neto:**

El campo `montoOrden` en `EntregaDetalle`:
- **Positivo** para INGRESOS (ventas, abonos)
- **Negativo** para EGRESOS (reembolsos)

El servicio `calcularMontoTotalEntrega()` suma todos los `montoOrden` (positivos y negativos) para obtener el monto neto.

### **Vista en el frontend:**

Los detalles con `tipoMovimiento = "EGRESO"` deben mostrarse diferenciados:
- Color rojo o icono especial
- Monto entre paréntesis: `($80,000)`
- Etiqueta "Reembolso"

---

## 🎯 RESUMEN DE CAMBIOS

| Componente | Cambio | Impacto |
|-----------|--------|---------|
| **DB** | Agregar `reembolso_venta_id`, `tipo_movimiento` | Baja (columnas opcionales) |
| **EntregaDetalle.java** | Agregar campos + método | Medio |
| **EntregaDineroService.java** | Nuevo método `crearEntregaConReembolsos()` | Alto |
| **EntregaDineroCreateDTO.java** | Agregar `reembolsosIds` | Baja |
| **EntregaDineroController.java** | Actualizar endpoint POST | Medio |
| **Frontend** | Mostrar reembolsos en lista | Alto |

**Compatibilidad hacia atrás:** ✅ Total - el método `crearEntrega()` existente sigue funcionando sin cambios.

---

## 📝 PRÓXIMOS PASOS

1. ✅ Ejecutar script SQL en base de datos
2. ✅ Reiniciar aplicación backend
3. ⚠️ Actualizar frontend para:
   - Consultar reembolsos del día
   - Incluir `reembolsosIds` al crear entrega
   - Mostrar egresos diferenciados en la lista de detalles
4. ⚠️ Probar flujo completo:
   - Crear reembolso y procesarlo
   - Incluirlo en entrega del día
   - Verificar cálculo correcto del monto neto

---

**¿Dudas o ajustes necesarios?** 🚀
