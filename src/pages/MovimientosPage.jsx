import { useState } from "react";
import MovimientosTable from "../componets/MovimientosTable";

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([
    {
      id: 1,
      sedePartida: "Centro",
      sedeLlegada: "Patios",
      fecha: "2025-09-28T12:00:00Z",
      trabajadorConfirma: "Juan Pérez",
      confirmado: false,
      productos: [
        { id: 101, nombre: "Vidrio 8mm", sku: "VID-8", cantidad: 5 },
        { id: 102, nombre: "Perfil aluminio", sku: "AL-123", cantidad: 10 },
      ],
    },
    {
      id: 2,
      sedePartida: "Ínsula",
      sedeLlegada: "Centro",
      fecha: "2025-09-27T10:30:00Z",
      trabajadorConfirma: "María Gómez",
      confirmado: true,
      productos: [],
    },
  ]);

  const handleSaveMovimiento = (movActualizado) => {
    setMovimientos((prev) =>
      prev.map((m) => (m.id === movActualizado.id ? movActualizado : m))
    );
  };

  return (
    <div>
      <h1>Movimientos</h1>
      <MovimientosTable data={movimientos} onEditar={handleSaveMovimiento} />
    </div>
  );
}
