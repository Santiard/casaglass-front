import React from "react";
import ProveedoresTable from "../componets/ProveedorTable.jsx";

export default function ProveedoresPage() {
  return (
    <div>
      <div className="rowSuperior"></div>

      <div className="rowInferior">
        <ProveedoresTable
          data={[
            {
              id: 1,
              nombre: "Vidrios & Cía",
              nit: "900111222",
              telefono: "3009876543",
              ciudad: "Bogotá",
              direccion: "Cra 15 # 45-67",
            },
            {
              id: 2,
              nombre: "Aluminios del Valle",
              nit: "800333444",
              telefono: "6041234567",
              ciudad: "Medellín",
              direccion: "Calle 30 # 20-15",
            },
          ]}
          onEditar={(p) => console.log("Editar", p)}
          onEliminar={(p) => console.log("Eliminar", p)}
        />
      </div>
    </div>
  );
}
