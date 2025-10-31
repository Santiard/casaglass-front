import React, { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import add from "../assets/add.png";
import check from "../assets/check.png";
import CambiarPasswordTrabajadorModal from "./CambiarPasswordTrabajadorModal.jsx";
import CrearTrabajadorModal from "./CrearTrabajadorModal.jsx";

export default function TrabajadoresModal({ isOpen, onClose, fetchTabla, onCambiarPassword, onCrear }) {
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);

  const load = async () => {
    if (!fetchTabla) return;
    setLoading(true);
    try {
      const data = await fetchTabla({ q, rol, sedeId });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando trabajadores", e);
      alert(e?.response?.data?.message || "No se pudieron cargar los trabajadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>Trabajadores</h2>

        <div className="ordenes-toolbar" style={{ marginBottom: 12 }}>
          <div className="ordenes-filters">
            <input className="clientes-input ordenes-search" placeholder="Buscar..." value={q} onChange={(e)=>setQ(e.target.value)} />
            <select className="clientes-input" value={rol} onChange={(e)=>setRol(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="VENDEDOR">VENDEDOR</option>
              <option value="BODEGA">BODEGA</option>
            </select>
            <input className="clientes-input" type="number" placeholder="Sede ID" value={sedeId} onChange={(e)=>setSedeId(e.target.value)} />
            <button className="btn-guardar" onClick={load} disabled={loading}>{loading?"Cargando...":"Filtrar"}</button>
          </div>
          <div className="ordenes-actions">
            <button className="addButton" onClick={()=>setCrearOpen(true)}>
              <img src={add} className="iconButton" alt="Agregar" />
              Agregar trabajador
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Username</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="empty">Cargando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} className="empty">Sin resultados</td></tr>
              )}
              {!loading && rows.map((t)=> (
                <tr key={t.id}>
                  <td>{t.nombre}</td>
                  <td>{t.username}</td>
                  <td>{t.rol}</td>
                  <td className="clientes-actions">
                    <button className="btnConfirm" title="Cambiar contraseña" onClick={()=>{ setSelected(t); setPwOpen(true); }}
                      style={{ backgroundColor: '#28a745', border: 'none', borderRadius: 4, padding: '2px 4px' }}>
                      <img src={check} className="iconButton" alt="Cambiar contraseña" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      <CambiarPasswordTrabajadorModal
        isOpen={pwOpen}
        onClose={()=>setPwOpen(false)}
        trabajador={selected}
        onConfirm={onCambiarPassword}
      />

      <CrearTrabajadorModal
        isOpen={crearOpen}
        onClose={()=>setCrearOpen(false)}
        onCreate={onCrear}
      />
    </div>
  );
}


