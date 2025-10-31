import { useState } from "react";
import TrabajadoresModal from "../modals/TrabajadoresModal.jsx";
import { listarTrabajadoresTabla, cambiarPasswordTrabajador, crearTrabajador } from "../services/TrabajadoresService.js";

export default function ConfigurarPage(){
  const [openTrab, setOpenTrab] = useState(false);

  return(
    <div>
      <div className="valoresVariables">
        <label>IVA</label>
        <input type="number" min="0" ></input>
        <label>Retencion en la fuente</label>
        <input type="number" min="0"></input>
        <label>A partir de (MONTO): </label>
        <input type="number" min="0"></input>
      </div>
      <div className="gestionPermisos">
        <label>Gestionar permisos de usuarios</label>
        <div className="listado">
          <button className="btn-guardar" onClick={()=>setOpenTrab(true)}>Gestionar trabajadores</button>
        </div>
      </div>

      <TrabajadoresModal
        isOpen={openTrab}
        onClose={()=>setOpenTrab(false)}
        fetchTabla={listarTrabajadoresTabla}
        onCambiarPassword={cambiarPasswordTrabajador}
        onCrear={crearTrabajador}
      />
    </div>
  );
}