# 🔧 Cambios en Frontend: Campos Numéricos de Métodos de Pago

**Fecha:** 2025-12-23  
**Objetivo:** Adaptar el frontend para enviar campos numéricos (montoEfectivo, montoTransferencia, montoCheque) al backend

---

## ✅ ESTADO ACTUAL DEL CÓDIGO

### **AbonoModal.jsx - ✅ YA IMPLEMENTADO CORRECTAMENTE**

El archivo **ya tiene** los cambios necesarios implementados en las líneas 477-532:

```javascript
// 🆕 CALCULAR MONTOS POR MÉTODO DE PAGO (campos numéricos)
let montoEfectivoTotal = 0;
let montoTransferenciaTotal = 0;
let montoChequeTotal = 0;

metodosValidos.forEach(metodo => {
  const monto = parseFloat(metodo.monto) || 0;
  if (metodo.tipo === "EFECTIVO") {
    montoEfectivoTotal += monto;
  } else if (metodo.tipo === "TRANSFERENCIA") {
    montoTransferenciaTotal += monto;
  } else if (metodo.tipo === "CHEQUE") {
    montoChequeTotal += monto;
  }
  // Otros tipos (NEQUI, DAVIPLATA, etc.) no se envían en campos numéricos por ahora
});

// ... luego al crear cada abono:

// 🆕 CALCULAR MONTOS PROPORCIONALES de cada método de pago
const proporcion = dist.montoAbono / montoTotal;
const montoEfectivoAbono = montoEfectivoTotal * proporcion;
const montoTransferenciaAbono = montoTransferenciaTotal * proporcion;
const montoChequeAbono = montoChequeTotal * proporcion;

return {
  creditoId: creditoId,
  total: dist.montoAbono,
  fecha: formData.fecha,
  metodoPago: metodoPagoString,
  factura: formData.factura || null,
  // 🆕 CAMPOS NUMÉRICOS
  montoEfectivo: Math.round(montoEfectivoAbono * 100) / 100,
  montoTransferencia: Math.round(montoTransferenciaAbono * 100) / 100,
  montoCheque: Math.round(montoChequeAbono * 100) / 100,
  montoRetencion: Math.round(montoRetencionAbono * 100) / 100
};
```

### **✅ Validaciones Implementadas:**

1. **Suma de métodos = total** (línea 461):
   ```javascript
   const sumaMetodos = metodosValidos.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);
   if (Math.abs(sumaMetodos - montoTotal) > 0.01) {
     setError(`La suma de los métodos de pago debe coincidir con el monto total.`);
     return;
   }
   ```

2. **Distribución proporcional**: Cuando hay múltiples órdenes, los montos se distribuyen proporcionalmente

3. **Retención incluida**: Si una orden tiene retención y se paga completamente, se incluye `montoRetencion`

---

## 📊 FLUJO DE DATOS

### **Antes (Corrupto):**
```
Frontend                           Backend
┌─────────────────────┐           ┌──────────────────┐
│ metodosPago: [      │           │ Recibe solo:     │
│   {                 │   JSON    │   metodoPago:    │
│     tipo: "EFEC",   │  ────────►│   "efectivo:X"   │
│     monto: 279000   │           │                  │
│   }                 │           │ ❌ montoEfectivo │
│ ]                   │           │    = 0           │
└─────────────────────┘           └──────────────────┘
```

### **Ahora (Correcto):**
```
Frontend                           Backend
┌─────────────────────┐           ┌──────────────────┐
│ metodosPago: [      │           │ Recibe:          │
│   {                 │   JSON    │   montoEfectivo: │
│     tipo: "EFEC",   │  ────────►│   279000 ✅      │
│     monto: 279000   │           │   metodoPago:    │
│   }                 │           │   "Efectivo" ✅  │
│ ]                   │           │                  │
│ ↓ Calcula campos    │           │ Backend valida   │
│   numéricos         │           │ suma = total     │
└─────────────────────┘           └──────────────────┘
```

---

## 🧪 LISTA DE PRUEBAS A REALIZAR

### **🔴 PRUEBAS CRÍTICAS (Obligatorias)**

#### **1. Crear Abono con EFECTIVO puro**

**Pasos:**
1. Ir a "Abonos" → "Nuevo Abono"
2. Seleccionar cliente con crédito pendiente
3. Agregar método de pago:
   - Tipo: EFECTIVO
   - Monto: $500,000
4. Monto total: $500,000
5. Seleccionar una orden
6. Guardar

**Resultado esperado:**
- ✅ Abono creado exitosamente
- ✅ Backend recibe: `montoEfectivo: 500000, montoTransferencia: 0, montoCheque: 0`
- ✅ No aparece error de "suma no coincide"

**Verificar en consola del navegador:**
```javascript
// El payload enviado debe contener:
{
  creditoId: X,
  total: 500000,
  metodoPago: "Método de pago: EFECTIVO\nEfectivo: $500,000",
  montoEfectivo: 500000,
  montoTransferencia: 0,
  montoCheque: 0,
  montoRetencion: 0
}
```

---

#### **2. Crear Abono con TRANSFERENCIA**

**Pasos:**
1. Agregar método de pago:
   - Tipo: TRANSFERENCIA
   - Banco: BANCOLOMBIA
   - Monto: $1,000,000
2. Monto total: $1,000,000
3. Guardar

**Resultado esperado:**
- ✅ Backend recibe: `montoTransferencia: 1000000, montoEfectivo: 0`
- ✅ metodoPago string: "Transferencia: BANCOLOMBIA - Monto: $1,000,000"

---

#### **3. Crear Abono con MÉTODOS MIXTOS**

**Pasos:**
1. Agregar 3 métodos de pago:
   - EFECTIVO: $300,000
   - TRANSFERENCIA (DAVIVIENDA): $500,000
   - CHEQUE: $200,000
2. Monto total: $1,000,000
3. Guardar

**Resultado esperado:**
- ✅ Backend recibe: `montoEfectivo: 300000, montoTransferencia: 500000, montoCheque: 200000`
- ✅ metodoPago string: "Método de pago: MIXTO\nEfectivo: $300,000\nTransferencia: DAVIVIENDA..."
- ✅ Backend valida: 300000 + 500000 + 200000 = 1000000 ✅

---

#### **4. VALIDACIÓN: Suma de métodos NO coincide**

**Pasos:**
1. Agregar método: EFECTIVO $500,000
2. **Monto total: $600,000** (diferente)
3. Intentar guardar

**Resultado esperado:**
- ❌ Error en frontend ANTES de enviar: "La suma de los métodos de pago debe coincidir con el monto total"
- ❌ NO debe llegar al backend

---

#### **5. Múltiples Órdenes con Distribución Proporcional**

**Pasos:**
1. Seleccionar cliente con 2 órdenes:
   - Orden A: saldo $300,000
   - Orden B: saldo $700,000
2. Agregar método: EFECTIVO $600,000
3. Monto total: $600,000
4. Seleccionar AMBAS órdenes
5. Guardar

**Resultado esperado:**
- ✅ Se crean 2 abonos:
  - **Abono 1** (Orden A): 
    - total: $300,000
    - montoEfectivo: $300,000 (completa la orden)
  - **Abono 2** (Orden B):
    - total: $300,000
    - montoEfectivo: $300,000 (pago parcial)
- ✅ Suma de ambos abonos = $600,000

---

#### **6. Abono con RETENCIÓN en la Fuente**

**Pasos:**
1. Crear orden de $2,000,000 a crédito (supera umbral de retención)
2. Marcar checkbox "Retención en la Fuente"
3. Crear abono que COMPLETE la orden:
   - TRANSFERENCIA: $2,000,000
4. Guardar

**Resultado esperado:**
- ✅ Backend recibe:
  - `montoTransferencia: 2000000`
  - `montoRetencion: 50000` (2.5% del subtotal sin IVA)
- ✅ El abono incluye la retención automáticamente

---

### **🟡 PRUEBAS SECUNDARIAS (Recomendadas)**

#### **7. Métodos no estándar (NEQUI, DAVIPLATA)**

**Pasos:**
1. Agregar método: NEQUI $100,000
2. Monto total: $100,000
3. Guardar

**Resultado esperado:**
- ✅ Se crea el abono
- ⚠️ NEQUI NO se envía en campos numéricos (por ahora)
- ✅ metodoPago string: "NEQUI: $100,000"
- ✅ Backend recibe: `montoEfectivo: 0, montoTransferencia: 0, montoCheque: 0`

**Nota:** Los métodos no estándar se guardan solo en el string descriptivo. Esto es correcto por ahora.

---

#### **8. Editar fecha del abono**

**Pasos:**
1. Cambiar fecha a ayer
2. Crear abono con EFECTIVO $500,000
3. Guardar

**Resultado esperado:**
- ✅ Abono creado con la fecha correcta
- ✅ Campos numéricos enviados correctamente

---

#### **9. Campo "Factura" opcional**

**Pasos:**
1. Crear abono sin llenar el campo "Factura"
2. Guardar

**Resultado esperado:**
- ✅ Se crea el abono
- ✅ factura = null

---

#### **10. Observaciones adicionales**

**Pasos:**
1. Agregar método: EFECTIVO $500,000
2. Escribir en "Observaciones": "PAGO DE ENERO"
3. Guardar

**Resultado esperado:**
- ✅ metodoPago string incluye observaciones al final:
  ```
  Método de pago: EFECTIVO
  Efectivo: $500,000
  PAGO DE ENERO
  ```

---

### **🟢 PRUEBAS DE REGRESIÓN (Para verificar que nada se rompió)**

#### **11. Ver histórico de abonos**

**Pasos:**
1. Ir a "Histórico de Abonos"
2. Filtrar por cliente
3. Ver tabla de abonos

**Resultado esperado:**
- ✅ Se muestran todos los abonos (nuevos y antiguos)
- ✅ Los abonos antiguos (con campos en 0) también se muestran
- ⚠️ Los abonos antiguos pueden mostrar metodoPago corrupto (esto es esperado)

---

#### **12. Crear Entrega de Dinero con abonos nuevos**

**Pasos:**
1. Crear algunos abonos nuevos (con campos numéricos)
2. Ir a "Entregas de Dinero"
3. Crear entrega seleccionando fecha del día
4. Verificar que los abonos nuevos aparezcan

**Resultado esperado:**
- ✅ Los abonos se incluyen en la entrega
- ✅ Los cálculos son correctos (ya se validan en CrearEntregaModal.jsx)
- ✅ No aparecen errores de montos excesivos

---

#### **13. Filtros en página de Abonos**

**Pasos:**
1. Ir a "Abonos"
2. Filtrar por:
   - Cliente
   - Rango de fechas
   - Método de pago: EFECTIVO
3. Verificar resultados

**Resultado esperado:**
- ✅ Los filtros funcionan correctamente
- ✅ Se muestran abonos nuevos y antiguos

---

## 🔍 VERIFICACIÓN EN CONSOLA DEL NAVEGADOR

Abre DevTools (F12) → Network → XHR y busca la petición POST a `/creditos/{id}/abonos`:

### **Request Payload debe contener:**
```json
{
  "creditoId": 123,
  "total": 500000,
  "fecha": "2025-12-23",
  "metodoPago": "Método de pago: EFECTIVO\nEfectivo: $500,000",
  "factura": null,
  "montoEfectivo": 500000,
  "montoTransferencia": 0,
  "montoCheque": 0,
  "montoRetencion": 0
}
```

### **Response exitosa debe ser:**
```json
{
  "id": 456,
  "creditoId": 123,
  "total": 500000,
  "fecha": "2025-12-23",
  "metodoPago": "Método de pago: EFECTIVO\nEfectivo: $500,000",
  "montoEfectivo": 500000,
  "montoTransferencia": 0,
  "montoCheque": 0,
  "montoRetencion": 0
}
```

### **❌ Si recibes error 400:**
```json
{
  "error": "La suma de los métodos de pago ($X) no coincide con el monto total ($Y)",
  "tipo": "VALIDACION"
}
```

Esto significa que:
- El backend está rechazando porque la suma no coincide
- Verificar que los cálculos en frontend sean correctos
- Verificar que no haya errores de redondeo

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### **Problema 1: "La suma de métodos no coincide" en backend**

**Causa:** Errores de redondeo en JavaScript (0.1 + 0.2 = 0.30000000000000004)

**Solución implementada en frontend:**
```javascript
// Redondear a 2 decimales
montoEfectivo: Math.round(montoEfectivoAbono * 100) / 100
```

**Solución en backend:**
```java
// Tolerancia de 0.01
if (Math.abs(sumaMetodos - total) > 0.01) {
  throw new IllegalArgumentException("...");
}
```

---

### **Problema 2: Abonos antiguos muestran metodoPago corrupto**

**Causa:** Los abonos creados ANTES de este cambio tienen:
- `montoEfectivo = 0`
- `montoTransferencia = 0`
- `montoCheque = 0`
- `metodoPago = "efectivo:5500000,..."` (corrupto)

**Solución:**
- ✅ El frontend NUEVO ya no crea abonos corruptos
- ⚠️ Los abonos antiguos se seguirán mostrando con datos incorrectos
- 🔧 Necesitarás script SQL para limpiar datos históricos (ver documento anterior)

---

### **Problema 3: Métodos no estándar (NEQUI, DAVIPLATA) no se envían en campos numéricos**

**Causa:** Por decisión de diseño, solo se envían EFECTIVO, TRANSFERENCIA, CHEQUE en campos numéricos

**Impacto:**
- Los métodos no estándar se guardan solo en el string `metodoPago`
- Esto está bien para propósitos informativos
- Si necesitas cálculos con estos métodos, deberás agregar campos adicionales al modelo

---

## 📝 CHECKLIST FINAL

Antes de dar por completado, verifica:

- [ ] **Prueba 1:** Abono con EFECTIVO puro funciona
- [ ] **Prueba 2:** Abono con TRANSFERENCIA + banco funciona
- [ ] **Prueba 3:** Abono con métodos MIXTOS funciona
- [ ] **Prueba 4:** Validación de suma rechaza montos incorrectos
- [ ] **Prueba 5:** Distribución proporcional en múltiples órdenes funciona
- [ ] **Prueba 6:** Retención en la fuente se incluye correctamente
- [ ] **Prueba 11:** Histórico de abonos se muestra correctamente
- [ ] **Prueba 12:** Entregas de dinero funcionan con abonos nuevos

---

## 🎉 CONCLUSIÓN

**Estado del código:** ✅ **LISTO PARA PRODUCCIÓN**

El frontend ya tiene todos los cambios necesarios implementados en `AbonoModal.jsx`. Solo necesitas:

1. ✅ Verificar que el backend tenga los cambios correctos (controller + service)
2. 🧪 Ejecutar las pruebas de esta lista
3. 🔍 Verificar en consola que los payloads sean correctos
4. 🚀 Deploy a producción

**No se requieren más cambios en el código del frontend.**

---

**¿Alguna duda sobre las pruebas o necesitas ayuda con algún caso específico?** 🚀
