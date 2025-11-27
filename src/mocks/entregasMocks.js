export const ENTREGAS_MOCK = [
  {
    id: 1,
    sede: { id: "s1", nombre: "Bogotá" },
    empleado: { id: "e1", nombre: "Nicole" },
    fechaEntrega: "2025-09-20T14:30:00Z",
    modalidadEntrega: "EFECTIVO",
    estado: "PENDIENTE",
    monto: 1200000,
    montoEfectivo: 1200000,
    montoTransferencia: 0,
    montoCheque: 0,
    montoDeposito: 0,
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
    modalidadEntrega: "TRANSFERENCIA",
    estado: "ENTREGADA",
    monto: 800000,
    montoEfectivo: 0,
    montoTransferencia: 800000,
    montoCheque: 0,
    montoDeposito: 0,
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
