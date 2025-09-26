export const INGRESOS_MOCK = [
  {
    id: 101,
    fecha: "2025-09-19T10:15:00",
    proveedor: { id: 1, nombre: "Proveedor ACME" },
    numeroFactura: "FAC-001",
    observaciones: "Ingreso mensual septiembre",
    detalles: [
      { id: 1, producto: { id: 11, nombre: "Cemento Gris 50kg", sku: "CEM-50" }, cantidad: 20, costoUnitario: 38000, totalLinea: 760000 },
      { id: 2, producto: { id: 22, nombre: "Varilla 3/8", sku: "VAR-38" }, cantidad: 50, costoUnitario: 12500, totalLinea: 625000 }
    ],
    totalCosto: 1385000,
    procesado: true
  },
  {
    id: 102,
    fecha: "2025-09-20T09:10:00",
    proveedor: { id: 2, nombre: "Distribuciones Delta" },
    numeroFactura: "FAC-002",
    observaciones: "Compra promoción fin de semana",
    detalles: [
      { id: 3, producto: { id: 33, nombre: "Pintura Blanca 1gal", sku: "PIN-1G" }, cantidad: 12, costoUnitario: 42000, totalLinea: 504000 }
    ],
    totalCosto: 504000,
    procesado: false
  }
];