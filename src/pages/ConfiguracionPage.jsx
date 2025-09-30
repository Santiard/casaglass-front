export default function ConfigurarPage(){

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
                    
                </div>
            </div>
        </div>
    );
}