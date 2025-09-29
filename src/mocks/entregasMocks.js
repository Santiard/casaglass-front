export const ENTREGAS_MOCK = [
  {
    id: 1,
    sede: { id: "s1", nombre: "Bogotá" },
    empleado: { id: "e1", nombre: "Nicole" },
    fechaEntrega: "2025-09-20T14:30:00Z",
    fechaDesde: "2025-09-01T00:00:00Z",
    fechaHasta: "2025-09-15T23:59:59Z",
    modalidadEntrega: "EFECTIVO",
    estado: "PENDIENTE",
    observaciones: "Cierre quincena",
    numeroComprobante: "RC-0001",
    montoEsperado: 1200000,
    montoGastos: 150000,
    montoEntregado: 1000000,
    diferencia: 1050000 - 1000000, // (esperado - gastos) - entregado
    detalles: [
      {
        id: 11,
        numeroOrden: 5001,
        fechaOrden: "2025-09-10T10:00:00Z",
        clienteNombre: "Juan Pérez",
        ventaCredito: false,
        montoOrden: 350000,
        observaciones: "-"
      },
      {
        id: 12,
        numeroOrden: 5002,
        fechaOrden: "2025-09-11T11:10:00Z",
        clienteNombre: "María Gómez",
        ventaCredito: true,
        montoOrden: 700000,
        observaciones: "Pago en 30 días"
      }
    ],
    gastos: [
      { id: 7, fecha: "2025-09-12T00:00:00Z", concepto: "Transporte", monto: 50000, observaciones: "Mensajería" },
      { id: 8, fecha: "2025-09-13T00:00:00Z", concepto: "Papelería", monto: 100000, observaciones: "-" }
    ]
  },
  {
    id: 2,
    sede: { id: "s2", nombre: "Medellín" },
    empleado: { id: "e2", nombre: "David" },
    fechaEntrega: "2025-09-22T09:00:00Z",
    fechaDesde: "2025-09-10T00:00:00Z",
    fechaHasta: "2025-09-20T23:59:59Z",
    modalidadEntrega: "TRANSFERENCIA",
    estado: "ENTREGADA",
    observaciones: "Entrega semanal",
    numeroComprobante: "TR-0099",
    montoEsperado: 800000,
    montoGastos: 50000,
    montoEntregado: 750000,
    diferencia: (800000 - 50000) - 750000,
    detalles: [
      {
        id: 21,
        numeroOrden: 6001,
        fechaOrden: "2025-09-15T12:20:00Z",
        clienteNombre: "Carlos Ruiz",
        ventaCredito: false,
        montoOrden: 450000,
        observaciones: ""
      },
      {
        id: 22,
        numeroOrden: 6002,
        fechaOrden: "2025-09-18T16:45:00Z",
        clienteNombre: "Ana Torres",
        ventaCredito: false,
        montoOrden: 300000,
        observaciones: ""
      }
    ],
    gastos: [
      { id: 9, fecha: "2025-09-19T00:00:00Z", concepto: "Combustible", monto: 50000, observaciones: "" }
    ]
  }
];

export const getEntregaById = (id) =>
  ENTREGAS_MOCK.find(e => String(e.id) === String(id));
