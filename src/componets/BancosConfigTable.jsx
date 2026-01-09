import React, { useEffect, useState } from "react";
import { listarBancos } from "../services/BancosService.js";
import { api } from "../lib/api.js";

export default function BancosConfigTable() {
  const [bancos, setBancos] = useState([]);
  const [nuevoBanco, setNuevoBanco] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBancos = async () => {
    setLoading(true);
    try {
      const data = await listarBancos();
      setBancos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error al cargar bancos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nuevoBanco.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/bancos", { nombre: nuevoBanco });
      setNuevoBanco("");
      fetchBancos();
    } catch (err) {
      setError("No se pudo agregar el banco");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este banco?")) return;
    setLoading(true);
    setError("");
    try {
      await api.delete(`/bancos/${id}`);
      fetchBancos();
    } catch (err) {
      setError("No se pudo eliminar el banco");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "2rem 0" }}>
      <h3>Bancos disponibles</h3>
      <form onSubmit={handleAgregar} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          value={nuevoBanco}
          onChange={e => setNuevoBanco(e.target.value)}
          placeholder="Nuevo banco"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !nuevoBanco.trim()}>Agregar</button>
      </form>
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Nombre</th>
            <th style={{ borderBottom: "1px solid #ccc" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {bancos.map(banco => (
            <tr key={banco.id || banco.nombre}>
              <td>{banco.nombre}</td>
              <td>
                <button onClick={() => handleEliminar(banco.id)} disabled={loading} style={{ color: "#b91c1c" }}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {bancos.length === 0 && (
            <tr><td colSpan={2}>No hay bancos registrados.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
