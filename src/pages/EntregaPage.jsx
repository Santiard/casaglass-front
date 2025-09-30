import { useState } from "react";
import EntregasTable from "../componets/EntregaTable.jsx";
import EntregaDetallePanel from "../componets/EntregaDetallePanel.jsx";
import { ENTREGAS_MOCK } from "../mocks/mocks_entregas.js";


export default function EntregasPage(){
const [seleccionado, setSeleccionado] = useState(null);


return (
<div className="page-entregas" style={{ display:"flex", flexDirection:"column", gap:16 }}>
<div>
<EntregasTable
data={ENTREGAS_MOCK}
onVerDetalles={(ent) => setSeleccionado(ent)}
/>
</div>


<div>
{seleccionado && (
<EntregaDetallePanel
entrega={seleccionado}
onClose={() => setSeleccionado(null)}
/>
)}
</div>
</div>
);
}