import { useState } from "react";
import IngresosTable from "../componets/IngresoTable.jsx";
import IngresoDetallePanel from "../componets/IngresoDetallePanel.jsx";
import { INGRESOS_MOCK } from "../mocks/mocks.js";

export default function IngresosPage(){
  const [seleccionado, setSeleccionado] = useState(null);

  return (
    <div className="page-ingresos" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <IngresosTable
          data={INGRESOS_MOCK}
          onVerDetalles={(ing) => setSeleccionado(ing)}
          onEditar={(ing) => console.log("Editar", ing)}
        />
      </div>

      <div>
        {/* Se muestra SOLO si hay selección */}
        {seleccionado && (
          <IngresoDetallePanel
            ingreso={seleccionado}
            onClose={() => setSeleccionado(null)}
          />
        )}
      </div>
    </div>
  );
}