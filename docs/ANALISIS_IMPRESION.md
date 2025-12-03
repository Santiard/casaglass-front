# Análisis de Funcionalidades de Impresión

## Resumen Ejecutivo

El proyecto cuenta con **2 sistemas principales de impresión**:
1. **Impresión de Entregas de Dinero** (`EntregasImprimirModal.jsx`)
2. **Impresión de Órdenes** (`OrdenImprimirModal.jsx`)

**Nota importante**: No existe funcionalidad de impresión para **Ingresos** (entradas de dinero de proveedores). Solo se puede visualizar en modales y tablas.

---

## 1. Impresión de Entregas de Dinero

### Ubicación
- **Modal**: `src/modals/EntregasImprimirModal.jsx`
- **Estilos**: `src/styles/EntregasImprimirModal.css`
- **Página principal**: `src/pages/EntregaPage.jsx`
- **Tabla**: `src/componets/EntregaTable.jsx`

### Funcionalidades

#### 1.1. Puntos de Acceso

La impresión de entregas se puede activar desde **3 lugares diferentes**:

1. **Botón individual en la tabla** (`EntregaTable.jsx:239`)
   - Cada fila tiene un botón "Imprimir"
   - Imprime solo esa entrega específica
   - Handler: `onImprimir(entrega)`

2. **Botón "Imprimir Entregas" en el header** (`EntregaPage.jsx:311-316`)
   - Imprime todas las entregas filtradas actualmente
   - Handler: `handleImprimirMultiples()`

3. **Botón "Imprimir Seleccionadas"** (`EntregaPage.jsx:300-306`)
   - Aparece solo cuando hay entregas seleccionadas (checkboxes)
   - Permite seleccionar múltiples entregas y imprimirlas juntas
   - Handler: `handleImprimirSeleccionadas(entregasSeleccionadas)`

#### 1.2. Flujo de Datos

```javascript
// 1. Usuario hace clic en "Imprimir"
handleImprimirEntrega(entrega) 
  → EntregasService.obtenerEntregaPorId(entrega.id)  // Obtiene datos completos
  → setEntregasParaImprimir([entregaCompleta])
  → setMostrarImprimirModal(true)

// 2. Modal se abre con los datos
EntregasImprimirModal recibe: { entregas, isOpen, onClose }

// 3. Usuario puede seleccionar/deseleccionar entregas (si hay múltiples)
// 4. Usuario hace clic en "Imprimir" o "Guardar como PDF"
```

#### 1.3. Características del Modal

**Selección de Entregas** (solo si hay más de 1):
- Grid de tarjetas con checkboxes
- Botones "Seleccionar Todas" / "Deseleccionar Todas"
- Contador de seleccionadas
- Si solo hay 1 entrega, se omite la sección de selección

**Opciones de Impresión**:
1. **"Imprimir"** (`handleImprimir`)
   - Llama a `window.print()`
   - Usa estilos CSS `@media print` para ocultar controles

2. **"Guardar como PDF"** (`handleGuardarPDF`)
   - Abre una nueva ventana
   - Copia el HTML del contenido imprimible
   - Inyecta estilos básicos
   - Llama a `ventana.print()` (permite guardar como PDF desde el diálogo del navegador)

#### 1.4. Contenido del Reporte

El reporte incluye:

**Encabezado General**:
- Nombre de la empresa: "ALUMINIOS CASAGLASS S.A.S"
- Título: "Reporte de Entregas de Dinero"
- Fecha de impresión

**Por cada entrega**:

1. **Encabezado de Entrega**:
   - Número de entrega (#ID)
   - Fecha de entrega
   - Sede

2. **Tabla de Órdenes**:
   - N° Orden
   - Cliente
   - Total Orden
   - Saldo (solo para créditos)
   - Valor Entregado
   - Medio de pago

   **Lógica especial**:
   - **Orden A CONTADO**: `valorEntregado = montoOrden` (total)
   - **Orden A CRÉDITO**: `valorEntregado = abonosDelPeriodo` (solo abonos del período)

3. **Descripción de Métodos de Pago**:
   - Para órdenes a contado: muestra `detalle.descripcion`
   - Para abonos a crédito: muestra `detalle.metodoPago`
   - Formato: "Orden #X:\n[descripción del método de pago]"

4. **Tabla de Gastos** (si existen):
   - ID, Fecha, Concepto, Tipo, Monto, Empleado
   - Total de gastos

5. **Subtotal por Entrega**:
   - Efectivo
   - Transferencia
   - Cheque
   - Depósito
   - Total Gastos
   - **Total Entregado**

**Totales Generales** (solo si hay múltiples entregas):
- Total Efectivo
- Total Transferencia
- Total Cheque
- Total Depósito
- Total Gastos
- **TOTAL A ENTREGAR**

#### 1.5. Estilos de Impresión

El modal usa una estrategia de **visibilidad selectiva** para impresión:

```css
@media print {
  /* Oculta todo el body */
  body * {
    visibility: hidden;
  }
  
  /* Muestra solo el contenido imprimible */
  #printable-entregas-content,
  #printable-entregas-content * {
    visibility: visible;
  }
  
  /* Posiciona el contenido en la esquina superior */
  #printable-entregas-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  
  /* Oculta controles del modal */
  .entregas-imprimir-modal-header,
  .entregas-seleccion-section,
  .entregas-imprimir-buttons {
    display: none !important;
  }
}
```

**Características especiales**:
- Usa `print-color-adjust: exact` para mantener colores
- Convierte fondos a bordes negros en impresión
- Ajusta tamaños de fuente para impresión

---

## 2. Impresión de Órdenes

### Ubicación
- **Modal**: `src/modals/OrdenImprimirModal.jsx`
- **Estilos**: `src/styles/OrdenImprimirModal.css`
- **Tabla**: `src/componets/OrdenesTable.jsx`

### Funcionalidades

#### 2.1. Punto de Acceso

- **Botón "Imprimir" en cada fila de la tabla** (`OrdenesTable.jsx:316`)
- Handler: `handleImprimir(orden)`

#### 2.2. Flujo de Datos

```javascript
// 1. Usuario hace clic en "Imprimir"
handleImprimir(orden)
  → setOrdenImprimir(orden)
  → setIsImprimirModalOpen(true)

// 2. Modal carga datos completos
useEffect(() => {
  // Intenta obtenerOrden primero
  let ordenCompleta = await obtenerOrden(orden.id);
  
  // Si faltan datos (color, tipo), usa obtenerOrdenDetalle
  if (!tieneColorYTipo) {
    const ordenDetalle = await obtenerOrdenDetalle(orden.id);
    ordenCompleta = { ...ordenCompleta, items: ordenDetalle.items };
  }
  
  setForm(ordenCompleta);
}, [orden, isOpen]);
```

#### 2.3. Características del Modal

**Selector de Formato**:
- **"Formato: Orden"**: Incluye precios y totales
- **"Formato: Para Trabajadores"**: Sin precios (solo cantidades y productos)
- **"Imprimir Ambos Formatos"**: Imprime ambos con separador

**Opciones de Impresión**:
1. **"Imprimir"** (`handleImprimir`)
   - `window.print()`

2. **"Guardar como PDF"** (`handleGuardarPDF`)
   - Similar a entregas: abre ventana nueva y copia HTML

#### 2.4. Contenido del Reporte

**Formato: Orden**:
- Encabezado: "ALUMINIOS CASAGLASS S.A.S" + "Orden de Venta/Cotización #X"
- Información: Sede, Cliente
- Tabla de items: Cantidad, Color, Tipo, Producto, Valor Unitario, Valor Total
- Totales: Subtotal, Descuentos (si aplica), Total

**Formato: Para Trabajadores**:
- Encabezado: "ALUMINIOS CASAGLASS S.A.S" + "Orden de Producción #X"
- Información: Sede
- Tabla de items: Cantidad, Color, Tipo, Producto (sin precios)
- Sin totales

**Formato: Ambos**:
- Imprime ambos formatos con `pageBreakBefore: "always"` entre ellos

#### 2.5. Estilos de Impresión

Similar a entregas, usa visibilidad selectiva:
- Oculta controles del modal
- Muestra solo `#printable-content`
- Posiciona absolutamente en la esquina superior

---

## 3. Comparación: Entregas vs Órdenes

| Característica | Entregas | Órdenes |
|---------------|----------|---------|
| **Múltiples selección** | ✅ Sí (checkboxes) | ❌ No |
| **Imprimir todas filtradas** | ✅ Sí | ❌ No |
| **Formato único** | ✅ Sí | ❌ No (3 opciones) |
| **Carga datos completos** | ✅ Sí (obtenerEntregaPorId) | ✅ Sí (obtenerOrden + obtenerOrdenDetalle) |
| **Guardar como PDF** | ✅ Sí | ✅ Sí |
| **Imprimir directo** | ✅ Sí | ✅ Sí |

---

## 4. Funcionalidad Faltante: Impresión de Ingresos

### Estado Actual

**No existe** funcionalidad de impresión para ingresos (entradas de dinero de proveedores).

**Archivos relacionados**:
- `src/componets/IngresoTable.jsx` - Tabla de ingresos (sin botón imprimir)
- `src/modals/IngresoDetalleModal.jsx` - Modal de detalles (sin opción imprimir)
- `src/componets/IngresoDetallePanel.jsx` - Panel de detalles (sin opción imprimir)

### Lo que se podría implementar

Basándose en el patrón de `EntregasImprimirModal`, se podría crear:

1. **`IngresosImprimirModal.jsx`** con:
   - Selección de múltiples ingresos
   - Reporte con:
     - Encabezado de empresa
     - Por cada ingreso:
       - Información: Fecha, Proveedor, N° Factura, Observaciones
       - Tabla de productos: Producto, SKU, Cantidad, Costo Unitario, Total Línea
       - Total del ingreso
     - Totales generales (si hay múltiples)

2. **Integración en `IngresoTable.jsx`**:
   - Botón "Imprimir" por fila
   - Botón "Imprimir Seleccionadas" (con checkboxes)
   - Botón "Imprimir Ingresos" en el header

---

## 5. Detalles Técnicos de Implementación

### 5.1. Estrategia de Impresión

Ambos modales usan la misma estrategia:

1. **Contenido imprimible en un div con ID específico**:
   - Entregas: `#printable-entregas-content`
   - Órdenes: `#printable-content`

2. **CSS `@media print`**:
   - Oculta todo excepto el contenido imprimible
   - Usa `visibility: hidden/visible` en lugar de `display: none` (mejor para impresión)

3. **Función `window.print()`**:
   - Abre el diálogo nativo del navegador
   - Permite seleccionar impresora o guardar como PDF

### 5.2. Función "Guardar como PDF"

```javascript
const handleGuardarPDF = () => {
  const contenido = document.getElementById('printable-content').innerHTML;
  const ventana = window.open('', '', 'width=800,height=600');
  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>...</title>
        <style>/* Estilos básicos */</style>
      </head>
      <body>${contenido}</body>
    </html>
  `);
  ventana.document.close();
  ventana.print(); // Abre diálogo de impresión (permite guardar PDF)
};
```

**Nota**: Esta función no genera un PDF directamente, sino que abre el diálogo de impresión del navegador donde el usuario puede elegir "Guardar como PDF".

### 5.3. Formateo de Datos

**Fechas**:
```javascript
const fmtFecha = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d) ? "-" : d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
```

**Moneda (COP)**:
```javascript
const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { 
  style: "currency", 
  currency: "COP", 
  maximumFractionDigits: 0 
}).format(Number(n||0));
```

**Números con separadores**:
```javascript
numero.toLocaleString("es-CO")
```

### 5.4. Manejo de Datos Complejos

**Entregas**:
- Calcula `valorEntregado` según tipo de venta (contado vs crédito)
- Calcula `saldo` para órdenes a crédito
- Agrupa métodos de pago por detalle
- Suma totales por método de pago

**Órdenes**:
- Intenta cargar datos completos (color, tipo) desde dos endpoints
- Calcula totales si no vienen del backend
- Maneja estados (Activa, Anulada, Pendiente, Completada)

---

## 6. Recomendaciones

### 6.1. Mejoras Sugeridas

1. **Implementar impresión de ingresos** siguiendo el patrón de entregas
2. **Unificar estilos de impresión** en un archivo CSS compartido
3. **Agregar opción de exportar a PDF real** (usando librería como jsPDF o html2pdf)
4. **Mejorar manejo de errores** cuando falla la carga de datos
5. **Agregar loading states** durante la carga de datos completos

### 6.2. Consideraciones de UX

- Los modales de impresión son grandes (95vw x 95vh) - considerar responsive
- La selección múltiple en entregas es intuitiva con checkboxes
- El formato "Para Trabajadores" en órdenes es útil para producción
- La función "Guardar como PDF" podría ser más clara (actualmente solo dice "Guardar como PDF" pero abre diálogo de impresión)

---

## 7. Conclusión

El sistema de impresión está bien implementado para **Entregas** y **Órdenes**, con características avanzadas como:
- Selección múltiple
- Múltiples formatos
- Estilos optimizados para impresión
- Cálculos automáticos de totales

**Falta implementar** la impresión de **Ingresos**, que sería útil para reportes de compras a proveedores.

