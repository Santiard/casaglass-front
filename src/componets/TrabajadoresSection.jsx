import React, { useEffect, useState } from "react";
import "../styles/Table.css";
import add from "../assets/add.png";
import check from "../assets/check.png";
import CambiarPasswordTrabajadorModal from "../modals/CambiarPasswordTrabajadorModal.jsx";
import CrearTrabajadorModal from "../modals/CrearTrabajadorModal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function TrabajadoresSection({ fetchTabla, onCambiarPassword, onCrear }) {
  const { showError } = useToast();
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
      showError(e?.response?.data?.message || "No se pudieron cargar los trabajadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtrar automáticamente cuando cambian los filtros (como otras tablas)
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [q, rol, sedeId]);

  return (
    <>
      <section className="settings-card" style={{ marginTop: '2rem' }}>
        <div className="table-container clientes">
          <div className="toolbar">
            <input
              className="clientes-input"
              type="text"
              placeholder="Buscar"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            
            <select
              className="clientes-select"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="VENDEDOR">VENDEDOR</option>
              <option value="BODEGA">BODEGA</option>
            </select>
            
            <input
              className="clientes-input"
              type="number"
              placeholder="Sede ID"
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
            />
            
            <button className="addButton" onClick={()=>setCrearOpen(true)}>
              <img src={add} className="iconButton" alt="Agregar" />
              Agregar trabajador
            </button>
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
                      <button 
                        className="btnConfirm" 
                        title="Cambiar contraseña" 
                        onClick={()=>{ setSelected(t); setPwOpen(true); }}
                        style={{ backgroundColor: '#28a745', border: 'none', borderRadius: 4, padding: '2px 4px' }}
                      >
                        <img src={check} className="iconButton" alt="Cambiar contraseña" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CambiarPasswordTrabajadorModal
        isOpen={pwOpen}
        onClose={()=>{
          setPwOpen(false);
          setSelected(null);
        }}
        trabajador={selected}
        onConfirm={async (id, password) => {
          await onCambiarPassword?.(id, password);
          load(); // Recargar lista después de cambiar contraseña
        }}
      />

      <CrearTrabajadorModal
        isOpen={crearOpen}
        onClose={()=>setCrearOpen(false)}
        onCreate={async (payload) => {
          await onCrear?.(payload);
          load(); // Recargar lista después de crear
        }}
      />
    </>
  );
}

