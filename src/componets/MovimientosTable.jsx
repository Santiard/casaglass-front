import "../styles/Table.css";
import { useMemo, useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";
import add from "../assets/add.png";

export default function MovimientosTable(){
    return <div>

    <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>NIT</th>
                  <th>Correo</th>
                  <th>Crédito</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Dirección</th>
                  <th>Acciones</th>
                </tr>
              </thead>
    
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">No hay registros</td>
                  </tr>
                ) : (
                  pageData.map((cli) => (
                    <tr key={cli.id ?? cli.nit ?? cli.correo}>
                      <td>{cli.nombre ?? "-"}</td>
                      <td>{cli.nit ?? "-"}</td>
                      <td>{cli.correo ?? "-"}</td>
                      <td>{formatoCOP(Number(cli.credito))}</td>
                      <td>{cli.telefono ?? "-"}</td>
                      <td>{cli.ciudad ?? "-"}</td>
                      <td className="clientes-dir">{cli.direccion ?? "-"}</td>
                      <td className="clientes-actions">
                        {onEditar && (
                          <button className="btnEdit" onClick={() => onEditar(cli)}>
                          <img src={editar} className="iconButton"/>
                          </button>
                        )}
                        {onEliminar && (
                          <button className="btnDelete" onClick={() => onEliminar(cli)}>
                          <img src={eliminar} className="iconButton"/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

    </div>;
}