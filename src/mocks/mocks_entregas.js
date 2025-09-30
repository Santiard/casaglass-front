// File: src/mocks/mocks_entregas.js
export const ORDENES_DISPONIBLES_MOCK = [
  { id: 101, numero: "ORD-2025-001", fecha: "2025-09-10T14:20:00.000Z", total: 1200000, incluidaEntrega: false },
  { id: 102, numero: "ORD-2025-002", fecha: "2025-09-11T10:00:00.000Z", total: 850000, incluidaEntrega: true }, // ya incluida en otra entrega
  { id: 103, numero: "ORD-2025-003", fecha: "2025-09-12T09:30:00.000Z", total: 430000, incluidaEntrega: false },
];

export const GASTOS_DISPONIBLES_MOCK = [
  { id: 201, descripcion: "Transporte vidrio", monto: 120000, asignadoEntregaId: null },
  { id: 202, descripcion: "Refrigerios instalación", monto: 60000, asignadoEntregaId: null },
  { id: 203, descripcion: "Peaje Cajicá", monto: 18000, asignadoEntregaId: "ent-1002" }, // está asignado a otra entrega
];

export const ENTREGAS_MOCK = [
  {
    id: "ent-1002",
    fechaEntrega: "2025-09-15T16:10:00.000Z",
    sede: { id: "sede-1", nombre: "Sede Principal" },
    empleado: { id: "emp-9", nombre: "María Pérez" },
    observaciones: "Cierre de caja semanal",
    detalles: [
      { id: "det-1", orden: { id: 102 }, numeroOrden: "ORD-2025-002", fechaOrden: "2025-09-11T10:00:00.000Z", montoOrden: 850000 },
    ],
    gastos: [ { id: 203, descripcion: "Peaje Cajicá", monto: 18000 } ],
    montoEsperado: 850000,
    montoGastos: 18000,
    montoEntregado: 830000,
    estado: "ENTREGADA",
    diferencia: 830000 - (850000 - 18000),
  },
  {
    id: "ent-1003",
    fechaEntrega: "2025-09-18T12:00:00.000Z",
    sede: { id: "sede-2", nombre: "Sede Norte" },
    empleado: { id: "emp-4", nombre: "Juan López" },
    observaciones: "",
    detalles: [
      { id: "det-2", orden: { id: 103 }, numeroOrden: "ORD-2025-003", fechaOrden: "2025-09-12T09:30:00.000Z", montoOrden: 430000 },
    ],
    gastos: [],
    montoEsperado: 430000,
    montoGastos: 0,
    estado: "PENDIENTE",
    diferencia: 0,
  }
];