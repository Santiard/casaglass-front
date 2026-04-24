# Contrato API Traslados — guía para frontend

Documento de referencia alineado con el backend (Spring, Jackson). Nombres JSON **case-sensitive**; usad los **exactos** de esta tabla.

**Sedes (constantes de negocio usadas en reglas):** Insula = **1**, Centro = **2**, Patios = **3**.

---

## 1. Campo `productoInventarioADescontarSede1` (descuento en Insula)

### Qué es

- En traslados **origen Insula (1) → destino Centro (2) o Patios (3)**, si la **línea** es un **corte** (el `producto` de la línea es un corte en BD), podéis indicar **qué producto “entero”** (no corte) se descuenta del **inventario normal** de la sede **1** (Insula) por la **cantidad** de la línea.
- Si **no** enviáis este dato, **no** se descuenta nada de inventario de producto entero en Insula (el flujo de cortes en destino sigue su lógica habitual).

### Reglas que devuelve el backend

| Situación | Comportamiento |
|-----------|----------------|
| `productoInventarioADescontarSede1` **informado** y el traslado **no** es 1→2 ni 1→3 | **400** con mensaje claro (solo aplica esos pares) |
| Informado y la **línea** no es un corte (producto de línea no es corte) | **400** |
| Informado y el producto a descontar **es** un corte | **400** (debe ser producto **entero**) |
| Informado y en Insula **no hay stock** suficiente (inventario normal) | **409** con cuerpo JSON estándar (ver sección 6) |
| Bien usado: 1→2 o 1→3, línea corte, producto entero, stock ok | Acepta y aplica el movimiento |

**Ids de sede en lógica:** `sedeId` en errores 409 para Insula será **1** cuando aplique a este descuento.

---

## 2. Cómo enviar el dato (nombres JSON exactos)

### A) `POST /api/traslados` — cabecera con `detalles` anidados

Cada detalle es el **cuerpo de entidad** `TrasladoDetalle` (mismo criterio en `POST` / `PUT` de detalle unitario).

- Línea: `producto: { "id": <idProducto> }` (corte o no, según el caso).
- Descuento Insula (opcional): **objeto anidado** con el id del producto entero:
  - `productoInventarioADescontarSede1: { "id": <idProductoEntero> }`
- **No** se usa el nombre plano `productoInventarioADescontarSede1Id` en este cuerpo de entidad.

### B) `POST /api/traslados/{trasladoId}/detalles` y `PUT /api/traslados/{trasladoId}/detalles/{detalleId}`

- Mismo cuerpo: `TrasladoDetalle` con:
  - `producto: { "id": … }`
  - opcional: `productoInventarioADescontarSede1: { "id": … }`

### C) `PUT /api/traslados/{trasladoId}/detalles/batch` — `TrasladoDetalleBatchDTO`

Aquí el contrato **difiere** a propósito (DTO dedicado):

| Acción | Campos relevantes |
|--------|-------------------|
| **crear** (`crear[]`) | `productoId` (oblig.), `cantidad` (oblig.), opcional **`productoInventarioADescontarSede1Id`** (Long **plano**) |
| **actualizar** (`actualizar[]`) | `detalleId` (oblig.); opcionales: `productoId`, `cantidad`, `productoInventarioADescontarSede1Id`, o **`limpiarProductoInventarioADescontarSede1: true`** para quitar el descuento de entero en Insula |

**Resumen:** en batch, el id plano es **`productoInventarioADescontarSede1Id`**; en POST masivo de cabecera o PUT unitario con entidad, el mismo concepto es **`productoInventarioADescontarSede1: { "id" }`**.

### Reintentos de batch (idempotencia)

- El backend **no** garantiza idempotencia de negocio por clave: si un batch **falla a mitad**, **antes** de reenviar, haced **`GET /api/traslados/{id}`** o **`GET /api/traslados/{id}/detalles`** y reconciliad para **no duplicar** creaciones.
- **400** en validación; **409** con `INVENTARIO_INSUFICIENTE` en stock; mensajes de texto y cuerpos JSON tal como responde el handler global.

---

## 3. Cómo recibir el dato (respuestas GET)

### `GET /api/traslados/{id}` — `TrasladoResponseDTO`

Cada elemento de `detalles[]` es **`TrasladoDetalleResponseDTO`**:

- `producto` (resumen: id, código, nombre, color).
- `productoInventarioADescontarSede1Id` — Long **plano** (conveniencia / edición).
- `productoInventarioADescontarSede1` — objeto resumen (id, código, nombre, color) o `null` si no aplica.

**Recomendación UI:** usad el **id plano** para formularios; el objeto para **impresión / etiqueta**.

### `GET /api/traslados` (y filtros) — `List<Traslado>`

- Devuelve la **entidad** `Traslado` con `detalles[]` como `TrasladoDetalle` serializado a JSON.
- Cada detalle trae el producto a descombrar en Insula en **`productoInventarioADescontarSede1`** (objeto anidado). **No** hay en este contrato un campo plano `productoInventarioADescontarSede1Id` a nivel de entidad: para el id usad **`detalles[i].productoInventarioADescontarSede1.id`** si viene informado.
- Estructura distinta a `GET /{id}` (DTO con duplicado id+objeto). Si necesitáis siempre el mismo shape, usad `GET /api/traslados/{id}` para edición/impresión o normalizad en cliente.

### `GET /api/traslados/{trasladoId}/detalles` y `GET /.../detalles/{detalleId}`

- Cuerpo: **`List<TrasladoDetalle>`** o un **`TrasladoDetalle`**: anidado **`productoInventarioADescontarSede1`** (entidad `Producto` resumida en JSON; normalmente con `id`).

### `GET /api/traslados-movimientos/...` — `List<TrasladoMovimientoDTO>`

- `detalles[]` es **`TrasladoDetalleSimpleDTO`**: incluye `productoInventarioADescontarSede1Id` y `productoInventarioADescontarSede1` (el simple DTO de producto aquí trae `id`, `nombre`, `código`, `categoria` — no es idéntico al de `TrasladoDetalleResponseDTO` en todos los campos).

---

## 4. Confirmar traslado (dos entradas, misma lógica)

| Método | Ruta | Parámetros |
|--------|------|------------|
| **POST** | `/api/traslados/{id}/confirmar` | Query: `trabajadorId` (obligatorio) |
| **PUT** | `/api/traslados-movimientos/{id}/confirmar` | Body: `{ "trabajadorId": <long> }` (`ConfirmarTrasladoRequest`) |

**Misma lógica de negocio:** ambos acaban en `TrasladoService.confirmarLlegada`.

- Respuesta **PUT movimientos:** `ConfirmarTrasladoResponse` — `{ "message", "traslado": <TrasladoMovimientoDTO> }`.
- Respuesta **POST** cabecera: el objeto devuelto por el servicio (no es el mismo wrapper que el PUT movimientos; unificad en cliente si usáis los dos flujos en pantallas distintas).

---

## 5. Catálogo (opcional)

- **`GET /api/traslados/catalogo-productos`**  
  - Inventario de **producto normal** en sede origen, con filtros `sedeOrigenId`, `q`, `categoriaId`, `color`, paginación `page` / `size`, y opcional `trabajadorId` (seguridad/validación en backend).  
  - **No** reemplaza por sí solo un catálogo de **cortes**; en muchos flujos el front combina esto con APIs de **inventario de cortes / vidrio** — documentado en el comentario del controlador.
- Un único endpoint “producto + cortes” con permisos: **no** está en este documento; si se añade, se versionará en Swagger / apartado `docs/`.

---

## 6. Errores: inventario (409) y cuerpo JSON

Cuando aplica `InventarioInsuficienteException` (p. ej. stock del producto entero a descontar en Insula):

- **HTTP 409** `Conflict`
- Cuerpo tipo:

```json
{
  "timestamp": "...",
  "status": 409,
  "error": "INVENTARIO_INSUFICIENTE",
  "message": "...",
  "productoId": 123,
  "sedeId": 1,
  "cantidadDisponible": 0.0,
  "cantidadRequerida": 5.0
}
```

(Os omiten claves si el backend no las rellena en un caso concreto.)

Otras reglas (400) suelen ser **texto plano** o mensaje en cuerpo según el `catch` de cada controlador; leed `message` para mostrar al usuario.

---

## 7. Resumen nombres clave (copy-paste)

| Contexto | Nombre a usar |
|----------|----------------|
| Entidad / POST-PUT detalle (JSON) | `productoInventarioADescontarSede1` → `{ "id": number }` |
| Batch `crear` / `actualizar` | `productoInventarioADescontarSede1Id` (número) |
| Batch limpiar asociación | `limpiarProductoInventarioADescontarSede1: true` |
| Respuesta `GET /traslados/{id}` (DTO) | `productoInventarioADescontarSede1Id` + `productoInventarioADescontarSede1` |

---

## 8. OpenAPI

En el repositorio, los DTO/entidad relevantes tienen anotaciones `@Schema` / `@Operation` (Swagger / springdoc). Generad el cliente o revisad **Swagger UI** en el entorno (ruta según `springdoc` configurada en el proyecto).

---

## 9. Frontend (Casaglass)

- **Errores 409 / inventario:** `src/lib/trasladoDetalleUi.js` → `formatMensajeErrorTraslado` (usa `error`, `message`, `cantidadDisponible`, `cantidadRequerida`, etc.).
- **Etiqueta “descontar en Insula” en tablas:** `etiquetaProductoDescInsula`, `trasladoDetallesTienenDescInsula` (detalle modal, impresión).
- **Envío al API:** creación `POST /traslados` usa `productoInventarioADescontarSede1: { "id" }` en cada detalle (no id plano en ese cuerpo); batch usa `productoInventarioADescontarSede1Id` y `limpiarProductoInventarioADescontarSede1` según §2.C.

---

*Generado para alinear el front con el backend Casaglass — traslados e inventario Insula 1↔2/3 con cortes.*
