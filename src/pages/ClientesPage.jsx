import React from "react";
import ClientesTable from "../componets/ClientesTable";


export default function ClientesPage() {
    return (
        <div>

            <div className="rowSuperior">

            </div>
            <div className="rowInferior">
            <ClientesTable
                data={[
                { id: 1, nombre: "ACME S.A.", nit: "900123456", correo: "info@acme.com", credito: 15000000, telefono: "3001234567", ciudad: "Bogotá", direccion: "Cra 7 # 12-34" },
                { id: 2, nombre: "Globex Ltda", nit: "800987654", correo: "ventas@globex.com", credito: 3500000, telefono: "6015556677", ciudad: "Medellín", direccion: "Av. Poblado 123" }
                ]}
                 onSeleccionar={(c) => console.log("Seleccionar", c)}
                onEditar={(c) => console.log("Editar", c)}
                 onEliminar={(c) => console.log("Eliminar", c)}
/>
            </div>
        </div>
    );
}