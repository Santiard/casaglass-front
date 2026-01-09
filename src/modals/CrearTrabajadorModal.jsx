import React, { useState } from "react";
import "../styles/CrudModal.css";
import { useToast } from "../context/ToastContext.jsx";

export default function CrearTrabajadorModal({ isOpen, onClose, onCreate }) {
  const { showError } = useToast();
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    username: "",
    password: "",
    rol: "VENDEDOR",
    sedeId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // Campos numéricos no se normalizan
    if (type === "number" || name === "sedeId") {
      setForm((p) => ({ ...p, [name]: value }));
      return;
    }
    // Campos de texto se convierten a mayúsculas (excepto password y correo)
    if (name === "password" || name === "correo") {
      setForm((p) => ({ ...p, [name]: value }));
    } else {
      setForm((p) => ({ ...p, [name]: value.toUpperCase() }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.correo || !form.username || !form.password || !form.rol || !form.sedeId) {
      showError("Todos los campos son obligatorios");
      return;
    }
    if (form.password.length < 4) { showError("La contraseña debe tener mínimo 4 caracteres"); return; }
    if (form.username.length < 3) { showError("El username debe tener mínimo 3 caracteres"); return; }
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        correo: form.correo,
        username: form.username.toUpperCase(),
        password: form.password,
        rol: form.rol,
        sede: { id: Number(form.sedeId) },
      };
      await onCreate?.(payload);
      onClose?.();
      setForm({ nombre: "", correo: "", username: "", password: "", rol: "VENDEDOR", sedeId: "" });
    } catch (e) {
      const msg = e?.response?.status === 409 ? "Username o correo ya existe" : (e?.response?.data?.message || "No se pudo crear el trabajador");
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>Agregar trabajador</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Nombre
            <input name="nombre" value={form.nombre} onChange={handleChange} required />
          </label>
          <label>
            Correo
            <input type="email" name="correo" value={form.correo} onChange={handleChange} required />
          </label>
          <label>
            Username
            <input name="username" value={form.username} onChange={handleChange} minLength={3} required />
          </label>
          <label>
            Contraseña
            <input type="password" name="password" value={form.password} onChange={handleChange} minLength={4} required />
          </label>
          <label>
            Rol
            <select name="rol" value={form.rol} onChange={handleChange} required>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="VENDEDOR">VENDEDOR</option>
              <option value="BODEGA">BODEGA</option>
            </select>
          </label>
          <label>
            Sede ID
            <input type="number" name="sedeId" value={form.sedeId} onChange={handleChange} min={1} required />
          </label>
          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-guardar" disabled={loading}>{loading ? "Guardando..." : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}


