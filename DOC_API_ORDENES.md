# Documentación de Endpoints Principales de Órdenes

## 1. Obtener Orden por ID

- **GET /api/ordenes/{id}**
- **Descripción:** Retorna la información básica de una orden por su ID.
- **Respuesta:**
  - 200 OK: Objeto JSON plano (`OrdenResponseDTO`)
  - 404 Not Found: Si no existe la orden

---

## 2. Obtener Detalle Completo de Orden

- **GET /api/ordenes/{id}/detalle**
- **Descripción:** Retorna la orden con todos los detalles, incluyendo items y cliente completo.
- **Respuesta:**
  - 200 OK: Objeto JSON detallado (`OrdenDetalleDTO`)
  - 404 Not Found: Si no existe la orden

---

## 3. Crear Orden (Básica)

- **POST /api/ordenes**
- **Descripción:** Crea una orden básica (compatibilidad).
- **Body:** Objeto `Orden`
- **Respuesta:**
  - 200 OK: Objeto con mensaje y orden creada
  - 400/500: Error de validación o servidor

---

## 4. Crear Orden de Venta

- **POST /api/ordenes/venta**
- **Descripción:** Crea una orden de venta con manejo de inventario y cortes.
- **Body:** Objeto `OrdenVentaDTO`
- **Respuesta:**
  - 200 OK: Objeto con mensaje, orden creada y número
  - 400/409/500: Errores de validación, concurrencia o servidor

---

## 5. Actualizar Orden desde Tabla

- **PUT /api/ordenes/tabla/{id}**
- **Descripción:** Actualiza una orden y sus items desde la estructura de tabla.
- **Body:** Objeto `OrdenActualizarDTO`
- **Respuesta:**
  - 200 OK: Objeto actualizado
  - 404/400: Error de validación o no encontrada

---

## 6. Actualizar Orden de Venta

- **PUT /api/ordenes/venta/{id}**
- **Descripción:** Actualiza una orden de venta con inventario y cortes.
- **Body:** Objeto `OrdenVentaDTO`
- **Respuesta:**
  - 200 OK: Objeto con mensaje, orden actualizada y número
  - 400/409/500: Errores de validación, concurrencia o servidor

---

## 7. Listar Órdenes para Tabla

- **GET /api/ordenes/tabla**
- **Descripción:** Lista optimizada de órdenes para tabla, con filtros opcionales (clienteId, sedeId, estado, fechas, venta, crédito, facturada, paginación, ordenamiento).
- **Respuesta:**
  - 200 OK: Lista de `OrdenTablaDTO` o respuesta paginada

---

## 8. Listar Órdenes a Crédito

- **GET /api/ordenes/credito**
- **Descripción:** Lista órdenes a crédito por cliente, con filtros opcionales (fechas, estado, paginación).
- **Respuesta:**
  - 200 OK: Lista de `OrdenCreditoDTO` o respuesta paginada
  - 400: Si falta clienteId

---

## 9. Endpoints Auxiliares

- **GET /api/clientes** → Lista de clientes
- **GET /api/sedes** → Lista de sedes
- **GET /api/trabajadores** → Lista de trabajadores
- **GET /api/categorias** → Lista de categorías
- **GET /api/inventario-completo** → Inventario completo (con filtros)

---

### Notas
- Todos los endpoints retornan JSON.
- Los endpoints de creación y actualización validan datos y pueden retornar errores detallados.
- Los DTOs usados en las respuestas evitan ciclos y exponen solo los datos necesarios para frontend.
