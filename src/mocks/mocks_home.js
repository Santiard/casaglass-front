export const HOME_SEDE = {
id: 1,
nombre: "Sede Centro",
responsable: "Ana Pérez",
};


export const HOME_VENTAS_HOY = {
cantidad: 23,
total: 1875000,
};


export const HOME_ENTREGAS = [
{
id: "E-001",
tipo: "ENTREGA",
referencia: "Caja fuerte",
fechaEntrega: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // hace ~30h
estado: "ENTREGADA",
montoEntregado: 1200000,
},
{
id: "E-002",
tipo: "RECOLECCIÓN",
referencia: "Banco",
fechaEntrega: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // en 4h
estado: "PENDIENTE",
montoEntregar: 350000,
},
{
id: "E-003",
tipo: "RECOLECCIÓN",
referencia: "Transportadora",
fechaEntrega: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(), // en 28h
estado: "PENDIENTE",
montoEntregar: 500000,
},
];


export const HOME_VENTAS_DESDE_ULTIMA = [
{ id: 1, fecha: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), total: 800000 },
{ id: 2, fecha: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), total: 650000 },
{ id: 3, fecha: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), total: 290000 },
];


export const HOME_STOCK_ALERTS = [
{ sku: "P-001", nombre: "Guantes Nitrilo", stock: 8, minimo: 20 },
{ sku: "P-044", nombre: "Tapabocas caja x50", stock: 15, minimo: 25 },
{ sku: "P-311", nombre: "Alcohol 70% 1000ml", stock: 22, minimo: 30 },
];