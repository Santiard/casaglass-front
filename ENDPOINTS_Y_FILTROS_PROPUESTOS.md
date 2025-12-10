================================================================================
ENDPOINTS DEL FRONTEND Y FILTROS PROPUESTOS PARA OPTIMIZACIÓN
================================================================================

FECHA: 2025-01-XX
VERSIÓN: 1.0

================================================================================
RESUMEN EJECUTIVO
================================================================================

Este documento lista TODOS los endpoints consumidos por el frontend y propone
filtros para optimizar el rendimiento, especialmente para:
- ÓRDENES (crecen exponencialmente)
- TRASLADOS (crecen exponencialmente)
- INGRESOS (crecen exponencialmente)
- ABONOS (crecen exponencialmente)

================================================================================
ENDPOINTS DE CRECIMIENTO EXPONENCIAL (ALTA PRIORIDAD)
================================================================================

1. ÓRDENES
-----------

GET /api/ordenes
  ACTUAL: Sin filtros, retorna todas las órdenes
  PROPUESTA:
    - clienteId: Integer (filtrar por cliente)
    - sedeId: Integer (filtrar por sede)
    - estado: String (ACTIVA, ANULADA, COMPLETADA, PENDIENTE)
    - fechaDesde: YYYY-MM-DD (fecha desde)
    - fechaHasta: YYYY-MM-DD (fecha hasta)
    - venta: Boolean (true para ventas, false para cotizaciones)
    - credito: Boolean (true para órdenes a crédito)
    - facturada: Boolean (true para órdenes facturadas)
    - page: Integer (número de página, default: 1)
    - size: Integer (tamaño de página, default: 20, máximo: 100)
    - sortBy: String (campo para ordenar: fecha, numero, total)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/ordenes/tabla
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - clienteId: Integer
    - sedeId: Integer
    - estado: String
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - venta: Boolean
    - credito: Boolean
    - facturada: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String
    - sortOrder: String

GET /api/ordenes/credito?clienteId=X
  ACTUAL: Solo clienteId
  PROPUESTA:
    - clienteId: Integer (OBLIGATORIO)
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - estado: String (estado del crédito)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)

GET /api/ordenes/{id}
  ACTUAL: Sin cambios necesarios (obtiene una orden específica)
  PROPUESTA: Sin cambios

GET /api/ordenes/{id}/detalle
  ACTUAL: Sin cambios necesarios (obtiene detalles de una orden específica)
  PROPUESTA: Sin cambios

POST /api/ordenes
  ACTUAL: Sin cambios necesarios (crea una orden)
  PROPUESTA: Sin cambios

POST /api/ordenes/venta
  ACTUAL: Sin cambios necesarios (crea una orden de venta)
  PROPUESTA: Sin cambios

PUT /api/ordenes/{id}
  ACTUAL: Sin cambios necesarios (actualiza una orden)
  PROPUESTA: Sin cambios

DELETE /api/ordenes/{id}
  ACTUAL: Sin cambios necesarios (elimina una orden)
  PROPUESTA: Sin cambios

PUT /api/ordenes/{id}/anular
  ACTUAL: Sin cambios necesarios (anula una orden)
  PROPUESTA: Sin cambios

GET /api/ordenes/proximo-numero
  ACTUAL: Sin cambios necesarios (obtiene próximo número)
  PROPUESTA: Sin cambios

GET /api/ordenes/{ordenId}/items
  ACTUAL: Sin cambios necesarios (obtiene items de una orden)
  PROPUESTA: Sin cambios

POST /api/ordenes/{ordenId}/items
  ACTUAL: Sin cambios necesarios (agrega item a una orden)
  PROPUESTA: Sin cambios

PUT /api/ordenes/{ordenId}/items/{itemId}
  ACTUAL: Sin cambios necesarios (actualiza item de una orden)
  PROPUESTA: Sin cambios

DELETE /api/ordenes/{ordenId}/items/{itemId}
  ACTUAL: Sin cambios necesarios (elimina item de una orden)
  PROPUESTA: Sin cambios

PUT /api/ordenes/{ordenId}/facturar
  ACTUAL: Sin cambios necesarios (marca orden como facturada)
  PROPUESTA: Sin cambios

2. INGRESOS
-----------

GET /api/ingresos
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - proveedorId: Integer (filtrar por proveedor)
    - sedeId: Integer (filtrar por sede)
    - fechaDesde: YYYY-MM-DD (fecha desde)
    - fechaHasta: YYYY-MM-DD (fecha hasta)
    - procesado: Boolean (true para procesados, false para no procesados)
    - numeroFactura: String (buscar por número de factura)
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, numeroFactura, totalCosto)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/ingresos/{id}
  ACTUAL: Sin cambios necesarios (obtiene un ingreso específico)
  PROPUESTA: Sin cambios

POST /api/ingresos
  ACTUAL: Sin cambios necesarios (crea un ingreso)
  PROPUESTA: Sin cambios

PUT /api/ingresos/{id}
  ACTUAL: Sin cambios necesarios (actualiza un ingreso)
  PROPUESTA: Sin cambios

DELETE /api/ingresos/{id}
  ACTUAL: Sin cambios necesarios (elimina un ingreso)
  PROPUESTA: Sin cambios

PUT /api/ingresos/{id}/procesar
  ACTUAL: Sin cambios necesarios (procesa un ingreso)
  PROPUESTA: Sin cambios

PUT /api/ingresos/{id}/marcar-procesado
  ACTUAL: Sin cambios necesarios (marca como procesado)
  PROPUESTA: Sin cambios

PUT /api/ingresos/{id}/reprocesar
  ACTUAL: Sin cambios necesarios (reprocesa un ingreso)
  PROPUESTA: Sin cambios

3. TRASLADOS
------------

GET /api/traslados-movimientos
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - sedeOrigenId: Integer (filtrar por sede origen)
    - sedeDestinoId: Integer (filtrar por sede destino)
    - sedeId: Integer (filtrar por sede origen O destino)
    - fechaDesde: YYYY-MM-DD (fecha desde)
    - fechaHasta: YYYY-MM-DD (fecha hasta)
    - estado: String (PENDIENTE, CONFIRMADO, CANCELADO)
    - confirmado: Boolean (true para confirmados, false para pendientes)
    - trabajadorId: Integer (filtrar por trabajador que confirmó)
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, id)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/traslados/{id}
  ACTUAL: Sin cambios necesarios (obtiene un traslado específico)
  PROPUESTA: Sin cambios

POST /api/traslados
  ACTUAL: Sin cambios necesarios (crea un traslado)
  PROPUESTA: Sin cambios

PUT /api/traslados/{id}
  ACTUAL: Sin cambios necesarios (actualiza un traslado)
  PROPUESTA: Sin cambios

DELETE /api/traslados/{id}
  ACTUAL: Sin cambios necesarios (elimina un traslado)
  PROPUESTA: Sin cambios

PUT /api/traslados-movimientos/{id}/confirmar
  ACTUAL: Sin cambios necesarios (confirma un traslado)
  PROPUESTA: Sin cambios

GET /api/traslados/{trasladoId}/detalles
  ACTUAL: Sin cambios necesarios (obtiene detalles de un traslado)
  PROPUESTA: Sin cambios

POST /api/traslados/{trasladoId}/detalles
  ACTUAL: Sin cambios necesarios (agrega detalle a un traslado)
  PROPUESTA: Sin cambios

PUT /api/traslados/{trasladoId}/detalles/{detalleId}
  ACTUAL: Sin cambios necesarios (actualiza detalle de un traslado)
  PROPUESTA: Sin cambios

DELETE /api/traslados/{trasladoId}/detalles/{detalleId}
  ACTUAL: Sin cambios necesarios (elimina detalle de un traslado)
  PROPUESTA: Sin cambios

4. ABONOS
---------

GET /api/creditos
  ACTUAL: Acepta params pero retorna TODOS los créditos
  PROPUESTA:
    - clienteId: Integer (OBLIGATORIO para filtrar por cliente)
    - fechaDesde: YYYY-MM-DD (fecha desde del abono)
    - fechaHasta: YYYY-MM-DD (fecha hasta del abono)
    - estado: String (ACTIVO, PAGADO, VENCIDO)
    - sedeId: Integer (filtrar por sede)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (fecha, montoTotal, saldoPendiente)
    - sortOrder: String (ASC, DESC, default: DESC)

NOTA: Este endpoint retorna créditos con abonos anidados. Se recomienda crear
un endpoint específico para abonos:

GET /api/abonos
  NUEVO ENDPOINT PROPUESTO:
    - clienteId: Integer (filtrar por cliente)
    - creditoId: Integer (filtrar por crédito)
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - metodoPago: String (EFECTIVO, TRANSFERENCIA, CHEQUE, etc.)
    - sedeId: Integer
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (fecha, total)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/abonos/cliente/{clienteId}
  NUEVO ENDPOINT PROPUESTO (optimizado):
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)

================================================================================
ENDPOINTS DE CRECIMIENTO MODERADO (MEDIA PRIORIDAD)
================================================================================

5. FACTURAS
-----------

GET /api/facturas
  ACTUAL: Sin filtros, retorna todas las facturas
  PROPUESTA:
    - clienteId: Integer
    - sedeId: Integer
    - estado: String (PAGADA, PENDIENTE, ANULADA)
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - numeroFactura: String (búsqueda parcial)
    - ordenId: Integer
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, numeroFactura, total)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/facturas/tabla
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - clienteId: Integer
    - sedeId: Integer
    - estado: String
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)

GET /api/facturas/cliente/{clienteId}
  ACTUAL: Sin filtros adicionales
  PROPUESTA:
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - estado: String
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)

GET /api/facturas/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/facturas/numero/{numeroFactura}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/facturas/orden/{ordenId}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/facturas/estado/{estado}
  ACTUAL: Sin filtros adicionales
  PROPUESTA:
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - sedeId: Integer
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)

GET /api/facturas/fecha/{fecha}
  ACTUAL: Sin cambios necesarios (fecha específica)
  PROPUESTA: Sin cambios

GET /api/facturas/fecha?desde={desde}&hasta={hasta}
  ACTUAL: Solo rango de fechas
  PROPUESTA:
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - clienteId: Integer
    - sedeId: Integer
    - estado: String
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)

POST /api/facturas
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/facturas/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/facturas/{id}/pagar
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/facturas/{id}/anular
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/facturas/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

6. ENTREGAS DE DINERO
---------------------

GET /api/entregas-dinero
  ACTUAL: Acepta algunos filtros (sedeId, empleadoId, estado, desde, hasta)
  PROPUESTA:
    - sedeId: Integer
    - empleadoId: Integer
    - estado: String (PENDIENTE, CONFIRMADA, CANCELADA)
    - desde: YYYY-MM-DD
    - hasta: YYYY-MM-DD
    - conDiferencias: Boolean (true para entregas con diferencias)
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, id)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/entregas-dinero/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/entregas-dinero/sede/{sedeId}
  ACTUAL: Sin filtros adicionales
  PROPUESTA:
    - desde: YYYY-MM-DD
    - hasta: YYYY-MM-DD
    - estado: String
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)

GET /api/entregas-dinero/con-diferencias
  ACTUAL: Sin filtros adicionales
  PROPUESTA:
    - sedeId: Integer
    - desde: YYYY-MM-DD
    - hasta: YYYY-MM-DD
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)

GET /api/entregas-dinero/ordenes-disponibles
  ACTUAL: Acepta sedeId, desde, hasta
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - clienteId: Integer (opcional)
    - estado: String (opcional, filtrar por estado de orden)

POST /api/entregas-dinero
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/entregas-dinero/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/entregas-dinero/{id}/confirmar
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/entregas-dinero/{id}/cancelar
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/entregas-dinero/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/entregas-dinero/sede/{sedeId}/total-entregado
  ACTUAL: Acepta desde, hasta
  PROPUESTA:
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - estado: String (opcional, solo contar entregas confirmadas)

GET /api/entregas-dinero/sede/{sedeId}/total-gastos
  NOTA: Este endpoint puede existir en el backend para reportes, pero ya no se usa
  en el frontend para crear/editar entregas (gastos eliminados de entregas)
  PROPUESTA: Sin cambios (solo para reportes del backend)

GET /api/entregas-dinero/resumen/empleado
  ACTUAL: Acepta params
  PROPUESTA:
    - empleadoId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - sedeId: Integer (opcional)

7. GASTOS (ELIMINADOS DEL FRONTEND)
------------------------------------

NOTA: Los endpoints de gastos-sede ya NO se usan en el frontend. Los gastos fueron
eliminados del flujo de entregas. Estos endpoints pueden existir en el backend para
reportes u otros propósitos, pero el frontend ya no los consume.

Endpoints eliminados del frontend:
- GET /api/gastos-sede
- GET /api/gastos-sede/{id}
- GET /api/gastos-sede/sede/{sedeId}
- GET /api/gastos-sede/sede/{sedeId}/sin-entrega
- POST /api/gastos-sede
- PUT /api/gastos-sede/{id}
- DELETE /api/gastos-sede/{id}

Archivos eliminados:
- src/services/GastosService.js
- src/modals/CrearGastoModal.jsx
- src/modals/CrearGastoModal.css

8. REEMBOLSOS DE VENTA
-----------------------

GET /api/reembolsos-venta
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - ordenId: Integer (filtrar por orden)
    - clienteId: Integer (filtrar por cliente)
    - sedeId: Integer
    - estado: String (PENDIENTE, PROCESADO, ANULADO)
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - procesado: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, monto)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/reembolsos-venta/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/reembolsos-venta/orden/{ordenId}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/reembolsos-venta
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/reembolsos-venta/{id}/procesar
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/reembolsos-venta/{id}/anular
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/reembolsos-venta/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

9. REEMBOLSOS DE INGRESO
-------------------------

GET /api/reembolsos-ingreso
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - ingresoId: Integer (filtrar por ingreso)
    - proveedorId: Integer (filtrar por proveedor)
    - sedeId: Integer
    - estado: String (PENDIENTE, PROCESADO, ANULADO)
    - fechaDesde: YYYY-MM-DD
    - fechaHasta: YYYY-MM-DD
    - procesado: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 20, máximo: 100)
    - sortBy: String (fecha, monto)
    - sortOrder: String (ASC, DESC, default: DESC)

GET /api/reembolsos-ingreso/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/reembolsos-ingreso/ingreso/{ingresoId}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/reembolsos-ingreso
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/reembolsos-ingreso/{id}/procesar
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/reembolsos-ingreso/{id}/anular
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/reembolsos-ingreso/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

================================================================================
ENDPOINTS DE CRECIMIENTO BAJO (BAJA PRIORIDAD)
================================================================================

10. PRODUCTOS
-------------

GET /api/productos
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - categoriaId: Integer (filtrar por categoría)
    - categoria: String (filtrar por nombre de categoría)
    - tipo: String (filtrar por tipo)
    - color: String (filtrar por color)
    - codigo: String (búsqueda parcial por código)
    - nombre: String (búsqueda parcial por nombre)
    - conStock: Boolean (true para productos con stock > 0)
    - sedeId: Integer (filtrar por sede para verificar stock)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (codigo, nombre, categoria)
    - sortOrder: String (ASC, DESC)

GET /api/productos/categorias
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/inventario-completo
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - categoriaId: Integer
    - categoria: String
    - tipo: String
    - color: String
    - codigo: String (búsqueda parcial)
    - nombre: String (búsqueda parcial)
    - sedeId: Integer (filtrar por sede)
    - conStock: Boolean (true para productos con stock > 0)
    - sinStock: Boolean (true para productos sin stock)
    - page: Integer (default: 1)
    - size: Integer (default: 100, máximo: 500)

GET /api/productos/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/productos
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/productos/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/productos/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/productos/{id}/costo
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/cortes-inventario-completo
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - categoriaId: Integer
    - categoria: String
    - color: String
    - codigo: String (búsqueda parcial)
    - nombre: String (búsqueda parcial)
    - largoCm: Integer (filtrar por largo en cm)
    - largoCmMin: Integer (largo mínimo)
    - largoCmMax: Integer (largo máximo)
    - sedeId: Integer
    - conStock: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 100, máximo: 500)

GET /api/inventario/agrupado
  ACTUAL: Sin cambios necesarios (agrupación especial)
  PROPUESTA: Sin cambios

GET /api/inventario?sedeId={sedeId}
  ACTUAL: Solo sedeId
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - categoriaId: Integer
    - tipo: String
    - color: String
    - conStock: Boolean

PUT /api/inventario/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/inventario/{productoId}/{sedeId}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/inventario/producto/{productoId}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

11. PRODUCTOS DE VIDRIO
-----------------------

GET /api/productos-vidrio
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - categoriaId: Integer
    - categoria: String
    - tipo: String
    - color: String
    - codigo: String (búsqueda parcial)
    - nombre: String (búsqueda parcial)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)

POST /api/productos-vidrio
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/productos-vidrio/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/productos-vidrio/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

12. CLIENTES
------------

GET /api/clientes
  ACTUAL: Sin filtros, retorna todos los clientes
  PROPUESTA:
    - nombre: String (búsqueda parcial por nombre)
    - nit: String (búsqueda parcial por NIT)
    - correo: String (búsqueda parcial por correo)
    - ciudad: String (filtrar por ciudad)
    - activo: Boolean (true para activos, false para inactivos)
    - conCredito: Boolean (true para clientes con créditos pendientes)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (nombre, nit, ciudad)
    - sortOrder: String (ASC, DESC)

GET /api/clientes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/clientes
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/clientes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/clientes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

13. PROVEEDORES
---------------

GET /api/proveedores
  ACTUAL: Sin filtros, retorna todos los proveedores
  PROPUESTA:
    - nombre: String (búsqueda parcial por nombre)
    - nit: String (búsqueda parcial por NIT)
    - correo: String (búsqueda parcial por correo)
    - ciudad: String (filtrar por ciudad)
    - activo: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (nombre, nit)
    - sortOrder: String (ASC, DESC)

GET /api/proveedores/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/proveedores
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/proveedores/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/proveedores/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

14. TRABAJADORES
---------------

GET /api/trabajadores
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - nombre: String (búsqueda parcial por nombre)
    - sedeId: Integer (filtrar por sede)
    - activo: Boolean
    - cargo: String (filtrar por cargo)
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)
    - sortBy: String (nombre, sede)
    - sortOrder: String (ASC, DESC)

GET /api/trabajadores/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

15. SEDES
---------

GET /api/sedes
  ACTUAL: Acepta params pero no se especifican filtros claros
  PROPUESTA:
    - nombre: String (búsqueda parcial por nombre)
    - activa: Boolean
    - page: Integer (default: 1)
    - size: Integer (default: 50, máximo: 200)

GET /api/sedes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/sedes/nombre/{nombre}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/sedes/{id}/trabajadores
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

POST /api/sedes
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

PUT /api/sedes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

DELETE /api/sedes/{id}
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

16. CATEGORÍAS
--------------

GET /api/categorias
  ACTUAL: Sin cambios necesarios (lista pequeña)
  PROPUESTA: Sin cambios (no necesita filtros)

POST /api/categorias
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

17. DASHBOARD
-------------

GET /api/sedes/{sedeId}/dashboard
  ACTUAL: Sin cambios necesarios
  PROPUESTA: Sin cambios

GET /api/dashboard/resumen
  ACTUAL: Acepta sedeId, desde, hasta
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/ventas-por-dia
  ACTUAL: Acepta sedeId, desde, hasta
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/ventas-por-sede
  ACTUAL: Acepta desde, hasta
  PROPUESTA:
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/top-productos
  ACTUAL: Acepta sedeId, desde, hasta, limite
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - limite: Integer (default: 10, máximo: 50)

GET /api/dashboard/top-clientes
  ACTUAL: Acepta sedeId, desde, hasta, limite
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - limite: Integer (default: 10, máximo: 50)

GET /api/dashboard/creditos-resumen
  ACTUAL: Acepta sedeId, desde, hasta
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/facturacion-estado
  ACTUAL: Acepta sedeId, desde, hasta
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/ticket-promedio-por-sede
  ACTUAL: Acepta desde, hasta
  PROPUESTA:
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/dashboard/completo
  ACTUAL: Acepta params
  PROPUESTA:
    - sedeId: Integer (OBLIGATORIO)
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)

GET /api/trabajadores/{trabajadorId}/dashboard
  ACTUAL: Acepta params
  PROPUESTA:
    - desde: YYYY-MM-DD (OBLIGATORIO)
    - hasta: YYYY-MM-DD (OBLIGATORIO)
    - sedeId: Integer (opcional)

18. CORTES
----------

GET /api/cortes
  ACTUAL: No encontrado en servicios (posiblemente no existe)
  PROPUESTA: Si existe, agregar filtros similares a productos

================================================================================
RESUMEN DE FILTROS COMUNES
================================================================================

FILTROS ESTÁNDAR PARA TODOS LOS ENDPOINTS DE LISTADO:
-------------------------------------------------------

1. PAGINACIÓN (OBLIGATORIO para endpoints de crecimiento exponencial):
   - page: Integer (número de página, default: 1, mínimo: 1)
   - size: Integer (tamaño de página, default según endpoint, máximo según endpoint)

2. ORDENAMIENTO:
   - sortBy: String (campo para ordenar)
   - sortOrder: String (ASC, DESC, default: DESC)

3. FILTROS DE FECHA (para endpoints con fechas):
   - fechaDesde: YYYY-MM-DD (fecha desde, inclusive)
   - fechaHasta: YYYY-MM-DD (fecha hasta, inclusive)

4. FILTROS DE ESTADO:
   - estado: String (valores específicos según endpoint)

5. FILTROS POR SEDE:
   - sedeId: Integer (filtrar por sede)

6. BÚSQUEDA DE TEXTO:
   - nombre: String (búsqueda parcial)
   - codigo: String (búsqueda parcial)
   - nit: String (búsqueda parcial)

================================================================================
ESTRUCTURA DE RESPUESTA PAGINADA RECOMENDADA
================================================================================

Para endpoints que soporten paginación, la respuesta debe seguir este formato:

{
  "content": [...],           // Array con los registros de la página actual
  "totalElements": 1000,      // Total de registros que cumplen los filtros
  "totalPages": 50,           // Total de páginas
  "page": 1,                  // Página actual (1-indexed)
  "size": 20,                 // Tamaño de página
  "hasNext": true,            // Si hay página siguiente
  "hasPrevious": false,       // Si hay página anterior
  "first": true,              // Si es la primera página
  "last": false               // Si es la última página
}

Para mantener compatibilidad con código existente, si no se especifica paginación,
el backend puede retornar un array simple en lugar del objeto paginado.

================================================================================
PRIORIDADES DE IMPLEMENTACIÓN
================================================================================

FASE 1 - CRÍTICO (Implementar primero):
1. ✅ GET /api/ordenes/tabla - Agregar filtros de fecha, cliente, estado, paginación
2. ✅ GET /api/ingresos - Agregar filtros de fecha, proveedor, estado, paginación
3. ✅ GET /api/traslados-movimientos - Agregar filtros de fecha, sede, estado, paginación
4. ✅ GET /api/creditos - Agregar filtros de cliente, fecha, paginación
5. ✅ Crear GET /api/abonos - Endpoint específico para abonos con filtros

FASE 2 - IMPORTANTE (Implementar después):
6. ⚠️ GET /api/facturas/tabla - Agregar filtros y paginación
7. ⚠️ GET /api/reembolsos-venta - Agregar filtros y paginación
8. ⚠️ GET /api/reembolsos-ingreso - Agregar filtros y paginación
9. ⚠️ GET /api/entregas-dinero - Mejorar filtros existentes y agregar paginación
FASE 3 - MEJORAS (Implementar cuando sea posible):
10. 📋 GET /api/productos - Agregar filtros y paginación
11. 📋 GET /api/inventario-completo - Agregar filtros y paginación
12. 📋 GET /api/clientes - Agregar filtros y paginación
13. 📋 GET /api/proveedores - Agregar filtros y paginación

================================================================================
NOTAS IMPORTANTES
================================================================================

1. COMPATIBILIDAD HACIA ATRÁS:
   - Si no se envían parámetros de paginación, el backend debe retornar un array simple
   - Si se envían parámetros de paginación, el backend debe retornar objeto paginado
   - Los filtros deben ser opcionales (excepto cuando se marcan como OBLIGATORIO)

2. VALIDACIÓN:
   - El backend debe validar todos los parámetros
   - Fechas deben estar en formato YYYY-MM-DD
   - IDs deben ser números enteros positivos
   - Tamaños de página deben tener límites máximos

3. RENDIMIENTO:
   - Los filtros deben aplicarse en la base de datos, no en memoria
   - Usar índices en campos de filtrado frecuente (fecha, clienteId, sedeId)
   - Limitar el tamaño máximo de página para evitar sobrecarga

4. DOCUMENTACIÓN:
   - Documentar todos los parámetros aceptados
   - Especificar valores por defecto
   - Especificar límites máximos
   - Proporcionar ejemplos de uso

================================================================================
EJEMPLOS DE USO
================================================================================

EJEMPLO 1: Órdenes con filtros y paginación
-------------------------------------------
GET /api/ordenes/tabla?clienteId=5&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=ACTIVA&page=1&size=20

EJEMPLO 2: Ingresos con filtros y paginación
---------------------------------------------
GET /api/ingresos?proveedorId=3&fechaDesde=2025-01-01&fechaHasta=2025-01-31&procesado=false&page=1&size=20

EJEMPLO 3: Traslados con filtros y paginación
----------------------------------------------
GET /api/traslados-movimientos?sedeId=1&fechaDesde=2025-01-01&fechaHasta=2025-01-31&estado=PENDIENTE&page=1&size=20

EJEMPLO 4: Abonos por cliente con filtros de fecha
----------------------------------------------------
GET /api/abonos/cliente/5?fechaDesde=2025-01-01&fechaHasta=2025-01-31&page=1&size=50

================================================================================
CONTACTO
================================================================================

Si tienes dudas sobre estos filtros propuestos, consulta con el equipo de desarrollo.

