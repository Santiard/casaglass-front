// src/modals/ProductoModal.jsx
import { useState, useEffect } from "react";
import "../styles/CrudModal.css";

export default function ProductModal({ isOpen, onClose, onSave, product }) {
  const initialState = {
    id: null,
    codigo: "",
    nombre: "",
    categoria: "",
    cantidadInsula: 0,
    cantidadCentro: 0,
    cantidadPatios: 0,
    precio1: 0,
    precio2: 0,
    precio3: 0,
    precioEspecial: 0,
    esVidrio: false,
    mm: "",
    m1: "",
    m2: "",
    laminas: "",
  };

  const [formData, setFormData] = useState(initialState);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      // si product viene sin esVidrio, lo inferimos desde la categoría
      const esVid = product.esVidrio ?? (product.categoria === "Vidrios");
      setFormData({
        ...initialState,
        ...product,
        esVidrio: esVid,
        // si el producto tiene m1m2 antiguo, tratar de separarlo (opcional)
        m1: product.m1 ?? product.m1m2?.split?.("x")?.[0] ?? "",
        m2: product.m2 ?? product.m1m2?.split?.("x")?.[1] ?? "",
      });
    } else {
      setFormData(initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // checkbox para esVidrio
    if (type === "checkbox" && name === "esVidrio") {
      const shouldBeVidrio = checked;
      setFormData((prev) => ({
        ...prev,
        esVidrio: shouldBeVidrio,
        // si marcó vidrio, autocompleta categoría
        categoria: shouldBeVidrio ? "Vidrios" : (prev.categoria === "Vidrios" ? "" : prev.categoria),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? value : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Normalizar/transformar m1/m2 si quieres guardarlos como m1m2 combinado:
    const toSave = { ...formData };
    if (formData.esVidrio) {
      // opcional: crear campo m1m2 concatenado
      toSave.m1m2 = `${formData.m1 ?? ""}x${formData.m2 ?? ""}`.replace(/(^x|x$)/, "");
    } else {
      toSave.mm = "";
      toSave.m1 = "";
      toSave.m2 = "";
      toSave.m1m2 = "";
      toSave.laminas = "";
    }

    // Si es creación, aseguramos que las cantidades queden en 0 (no se ingresan al crear)
    if (!isEditing) {
      toSave.cantidadInsula = 0;
      toSave.cantidadCentro = 0;
      toSave.cantidadPatios = 0;
    }

    onSave(toSave);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>{isEditing ? "Editar Producto" : "Agregar Producto"}</h2>

        <form onSubmit={handleSubmit} className="form">
          {/* CÓDIGO */}
          <label>
            Código:
            <input
              type="text"
              name="codigo"
              placeholder="Código único"
              value={formData.codigo}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Nombre:
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Categoría:
            <input
              type="text"
              name="categoria"
              placeholder="Categoría (ej. Vidrios, Aluminio...)"
              value={formData.categoria}
              onChange={handleChange}
              required
              // si prefieres evitar cambios manuales cuando esVidrio, podrías deshabilitar en ese caso
            />
          </label>

          {/* Cantidades sólo al editar */}
          {isEditing && (
            <>
              <label>
                Cantidad Ínsula:
                <input
                  type="number"
                  name="cantidadInsula"
                  value={formData.cantidadInsula}
                  onChange={handleChange}
                />
              </label>

              <label>
                Cantidad Centro:
                <input
                  type="number"
                  name="cantidadCentro"
                  value={formData.cantidadCentro}
                  onChange={handleChange}
                />
              </label>

              <label>
                Cantidad Patios:
                <input
                  type="number"
                  name="cantidadPatios"
                  value={formData.cantidadPatios}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          <label>
            Precio 1:
            <input
              type="number"
              name="precio1"
              value={formData.precio1}
              onChange={handleChange}
            />
          </label>

          <label>
            Precio 2:
            <input
              type="number"
              name="precio2"
              value={formData.precio2}
              onChange={handleChange}
            />
          </label>

          <label>
            Precio 3:
            <input
              type="number"
              name="precio3"
              value={formData.precio3}
              onChange={handleChange}
            />
          </label>

          <label>
            Precio Especial:
            <input
              type="number"
              name="precioEspecial"
              value={formData.precioEspecial}
              onChange={handleChange}
            />
          </label>

          {/* Checkbox para identificar vidrio */}
          <label className="checkbox">
            <input
              type="checkbox"
              name="esVidrio"
              checked={!!formData.esVidrio}
              onChange={handleChange}
            />
            Es vidrio
          </label>

          {/* Campos exclusivos para vidrio (se muestran si esVidrio true) */}
          {formData.esVidrio && (
            <>
              <label>
                Espesor (mm):
                <input
                  type="text"
                  name="mm"
                  value={formData.mm}
                  onChange={handleChange}
                />
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1 }}>
                  m1:
                  <input
                    type="text"
                    name="m1"
                    value={formData.m1}
                    onChange={handleChange}
                  />
                </label>

                <label style={{ flex: 1 }}>
                  m2:
                  <input
                    type="text"
                    name="m2"
                    value={formData.m2}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <label>
                Láminas:
                <input
                  type="number"
                  name="laminas"
                  value={formData.laminas}
                  onChange={handleChange}
                />
              </label>
            </>
          )}

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-cancelar">
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
