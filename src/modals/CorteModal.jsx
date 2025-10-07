import { useEffect, useState } from "react";
import "../styles/CrudModal.css"; // si ya tienes estilos de modal, reutilízalos

export default function CorteModal({ isOpen, onClose, onSave, corte }) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    color: "",
    sede: "",
    cantidad: 0,    // del Producto base
    largoCm: "",    // de Corte
    precio: "",     // de Corte
    observacion: "",// de Corte
  });

  useEffect(() => {
    if (corte) {
      setForm({
        codigo: corte.codigo ?? "",
        nombre: corte.nombre ?? "",
        color: corte.color ?? "",
        sede: corte.sede ?? "",
        cantidad: corte.cantidad ?? 0,
        largoCm: corte.largoCm ?? "",
        precio: corte.precio ?? "",
        observacion: corte.observacion ?? "",
      });
    } else {
      setForm({
        codigo: "",
        nombre: "",
        color: "",
        sede: "",
        cantidad: 0,
        largoCm: "",
        precio: "",
        observacion: "",
      });
    }
  }, [corte]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.codigo?.trim()) return alert("Código es obligatorio");
    if (!form.nombre?.trim()) return alert("Nombre es obligatorio");
    if (!form.largoCm || Number(form.largoCm) <= 0) return alert("Largo (cm) debe ser mayor a 0");
    if (!form.precio || Number(form.precio) < 0) return alert("Precio debe ser 0 o mayor");

    // Normalizamos tipos numéricos
    const payload = {
      ...form,
      cantidad: Number(form.cantidad || 0),
      largoCm: Number(form.largoCm),
      precio: Number(form.precio),
      categoria: "Vidrio", // normalmente un Corte es de vidrio; ajusta si necesitas
    };

    onSave?.(payload);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header className="modal-header">
          <h3>{corte ? "Editar corte" : "Nuevo corte"}</h3>
          <button className="close" onClick={onClose}>×</button>
        </header>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <label>
              <span>Código *</span>
              <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </label>

            <label>
              <span>Nombre *</span>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>

            <label>
              <span>Color</span>
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </label>

            <label>
              <span>Sede</span>
              <select value={form.sede} onChange={(e) => setForm({ ...form, sede: e.target.value })}>
                <option value="">—</option>
                <option value="Insula">Insula</option>
                <option value="Centro">Centro</option>
                <option value="Patios">Patios</option>
              </select>
            </label>

            <label>
              <span>Cantidad</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              />
            </label>

            <label>
              <span>Largo (cm) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.largoCm}
                onChange={(e) => setForm({ ...form, largoCm: e.target.value })}
              />
            </label>

            <label>
              <span>Precio *</span>
              <input
                type="number"
                min="0"
                step="100"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </label>

            <label className="grid-span-2">
              <span>Observación</span>
              <textarea
                rows={3}
                value={form.observacion}
                onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              />
            </label>
          </div>

          <footer className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">{corte ? "Guardar" : "Crear"}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
