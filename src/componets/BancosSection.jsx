import React, { useEffect, useState } from "react";
import "../styles/Table.css";
import add from "../assets/add.png";
import eliminar from "../assets/eliminar.png";
import { listarBancos, crearBanco, eliminarBanco } from "../services/BancosService.js";
import { useToast } from "../context/ToastContext.jsx";

export default function BancosSection() {
  const { showError, showSuccess } = useToast();
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevoBanco, setNuevoBanco] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await listarBancos();
      setBancos(Array.isArray(data) ? data : []);
    } catch (e) {
      showError("No se pudieron cargar los bancos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAgregar = async (e) => {
    e.preventDefault();
    const nombre = nuevoBanco.trim().toUpperCase();
    if (!nombre) return;
    
    setLoading(true);
    try {
      await crearBanco({ nombre });
      showSuccess("Banco agregado correctamente");
      setNuevoBanco("");
      load();
    } catch (err) {
      showError(err?.response?.data?.message || "No se pudo agregar el banco");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar el banco "${nombre}"?`)) return;
    
    setLoading(true);
    try {
      await eliminarBanco(id);
      showSuccess("Banco eliminado correctamente");
      load();
    } catch (err) {
      showError(err?.response?.data?.message || "No se pudo eliminar el banco");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="settings-card" style={{ marginTop: '2rem' }}>
      <h3>Gestión de Bancos</h3>
      <div className="table-container clientes">
        <div className="toolbar">
          <input
            className="clientes-input"
            type="text"
            placeholder="Nombre del banco"
            value={nuevoBanco}
            onChange={(e) => setNuevoBanco(e.target.value)}
            disabled={loading}
            style={{ textTransform: 'uppercase' }}
          />
          
          <button 
            className="addButton" 
            onClick={handleAgregar}
            disabled={loading || !nuevoBanco.trim()}
          >
            <img src={add} className="iconButton" alt="Agregar" />
            Agregar banco
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={2} className="empty">Cargando…</td></tr>
              )}
              {!loading && bancos.length === 0 && (
                <tr><td colSpan={2} className="empty">No hay bancos registrados</td></tr>
              )}
              {!loading && bancos.map((banco) => (
                <tr key={banco.id || banco.nombre}>
                  <td>{banco.nombre}</td>
                  <td className="clientes-actions">
                    <button 
                      className="btnDelete" 
                      title="Eliminar banco" 
                      onClick={() => handleEliminar(banco.id, banco.nombre)}
                      disabled={loading}
                      style={{ backgroundColor: '#dc3545', border: 'none', borderRadius: 4, padding: '2px 4px' }}
                    >
                      <img src={eliminar} className="iconButton" alt="Eliminar" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
