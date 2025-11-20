// src/modals/CorteModal.jsx
import { useState, useEffect } from "react";
import { listarCategorias } from "../services/CategoriasService";
import "../styles/CrudModal.css";
import { useToast } from "../context/ToastContext.jsx";

export default function CorteModal({ isOpen, onClose, onSave, corte }) {
  const { showError } = useToast();
  const initialState = {
    id: null,
    codigo: "",
    nombre: "",
    posicion: "",
    tipo: "UNID",
    color: "MATE",
    categoria: "",
    descripcion: "",
    costo: "",
    cantidadInsula: 0,
    cantidadCentro: 0,
    cantidadPatios: 0,
    precio1: "",
    precio2: "",
    precio3: "",
    largoCm: "",
    precio: "",
    observacion: "",
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);

  const isEditing = !!corte;

  // Cargar categorías al montar el componente
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategories(cats || []);
      } catch (e) {
        console.error("Error cargando categorías:", e);
      }
    };
    fetchCategorias();
  }, []);

  // Prevenir cierre/recarga de pestaña cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen]);

  useEffect(() => {
    if (corte) {
      setFormData({
        ...initialState,
        ...corte,
        // Asegurar que todos los valores sean strings para evitar controlled/uncontrolled
        codigo: corte.codigo || "",
        nombre: corte.nombre || "",
        posicion: corte.posicion || "",
        descripcion: corte.descripcion || "",
        observacion: corte.observacion || "",
        // Para edición, preservar valores existentes o mantener vacío si es 0
        precio1: corte.precio1 ? String(corte.precio1) : "",
        precio2: corte.precio2 ? String(corte.precio2) : "",
        precio3: corte.precio3 ? String(corte.precio3) : "",
        largoCm: corte.largoCm ? String(corte.largoCm) : "",
        precio: corte.precio ? String(corte.precio) : "",
        costo: corte.costo ? String(corte.costo) : "",
        // Asegurar que selects tengan valores válidos
        tipo: corte.tipo || "UNID",
        color: corte.color || "MATE",
        categoria: corte.categoria?.nombre || corte.categoria || "",
      });
    } else {
      setFormData(initialState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corte]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Definir tipos de campos para validaciones
    const priceFields = ['precio1', 'precio2', 'precio3', 'precio', 'costo'];
    const numericFields = ['posicion', 'largoCm'];
    const uppercaseFields = ['codigo', 'nombre', 'descripcion', 'observacion'];

    let processedValue = value || ""; // Asegurar que nunca sea undefined/null

    if (priceFields.includes(name)) {
      // Campos de precio: solo números, pueden estar vacíos
      processedValue = (value || "").replace(/[^0-9]/g, '');
    } else if (numericFields.includes(name)) {
      // Campos numéricos: solo números
      processedValue = (value || "").replace(/[^0-9]/g, '');
    } else if (uppercaseFields.includes(name)) {
      // Campos de texto que van en mayúsculas
      processedValue = (value || "").toUpperCase();
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.codigo?.trim()) {
      showError("El código es obligatorio");
      return;
    }
    if (!formData.nombre?.trim()) {
      showError("El nombre es obligatorio");
      return;
    }
    if (!formData.largoCm || Number(formData.largoCm) <= 0) {
      showError("El largo (cm) debe ser mayor a 0");
      return;
    }

    // Preparar datos según esquema del backend
    const backendPayload = {
      codigo: formData.codigo,
      nombre: formData.nombre,
      posicion: formData.posicion || "",
      tipo: formData.tipo,
      color: formData.color,
      cantidad: 0, // Siempre 0 como especificaste
      costo: parseFloat(formData.costo) || 0,
      precio1: parseFloat(formData.precio1) || 0,
      precio2: parseFloat(formData.precio2) || 0,
      precio3: parseFloat(formData.precio3) || 0,
      descripcion: formData.descripcion || "",
      largoCm: parseFloat(formData.largoCm) || 0,
      precio: parseFloat(formData.precio) || 0,
      observacion: formData.observacion || "",
      version: null // Nulo como especificaste
    };

    // Convertir categoría a objeto si es string
    if (formData.categoria && typeof formData.categoria === 'string') {
      const categoriaObj = categories.find(cat => cat.nombre === formData.categoria);
      if (categoriaObj) {
        backendPayload.categoria = {
          id: categoriaObj.id,
          nombre: categoriaObj.nombre
        };
      }
    } else if (formData.categoria && typeof formData.categoria === 'object') {
      backendPayload.categoria = formData.categoria;
    }

    // Si es edición, incluir el id
    if (isEditing && formData.id) {
      backendPayload.id = formData.id;
    }

    onSave(backendPayload);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-corte">
        <h2>{isEditing ? "Editar Corte" : "Agregar Corte"}</h2>

        <form onSubmit={handleSubmit} className="form">
          {/* === INFORMACIÓN BÁSICA === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
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
                placeholder="Nombre del corte"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Categoría:
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Posición:
              <input
                type="text"
                name="posicion"
                placeholder="Solo números"
                value={formData.posicion}
                onChange={handleChange}
              />
            </label>

            <label>
              Tipo:
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                <option value="UNID">UNIDAD</option>
                <option value="PERFIL">PERFIL</option>
              </select>
            </label>

            <label>
              Color:
              <select
                name="color"
                value={formData.color}
                onChange={handleChange}
                required
              >
                <option value="MATE">MATE</option>
                <option value="BLANCO">BLANCO</option>
                <option value="NEGRO">NEGRO</option>
                <option value="BRONCE">BRONCE</option>
                <option value="NA">NA</option>
              </select>
            </label>
          </div>

          {/* === CARACTERÍSTICAS === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label>
              Largo (cm):
              <input
                type="text"
                name="largoCm"
                placeholder="Solo números"
                value={formData.largoCm}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Costo:
              <input
                type="text"
                name="costo"
                placeholder="Solo números"
                value={formData.costo}
                onChange={handleChange}
              />
            </label>

            <label>
              Precio Base:
              <input
                type="text"
                name="precio"
                placeholder="Solo números"
                value={formData.precio}
                onChange={handleChange}
              />
            </label>
          </div>

          {/* === CANTIDADES DE INVENTARIO (Solo al editar) === */}
          {isEditing && (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Inventario por Sede:</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
              </div>
            </div>
          )}

          {/* === PRECIOS === */}
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>Precios por Sede:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
              <label>
                Precio 1 (Ínsula):
                <input
                  type="text"
                  name="precio1"
                  placeholder="Solo números"
                  value={formData.precio1}
                  onChange={handleChange}
                />
              </label>

              <label>
                Precio 2 (Centro):
                <input
                  type="text"
                  name="precio2"
                  placeholder="Solo números"
                  value={formData.precio2}
                  onChange={handleChange}
                />
              </label>

              <label>
                Precio 3 (Patios):
                <input
                  type="text"
                  name="precio3"
                  placeholder="Solo números"
                  value={formData.precio3}
                  onChange={handleChange}
                />
              </label>

            </div>
          </div>

          {/* === DESCRIPCIÓN Y OBSERVACIONES === */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <label>
              Descripción:
              <input
                type="text"
                name="descripcion"
                placeholder="Descripción del corte"
                value={formData.descripcion}
                onChange={handleChange}
              />
            </label>

            <label>
              Observación:
              <textarea
                name="observacion"
                placeholder="Observaciones adicionales"
                value={formData.observacion}
                onChange={handleChange}
                rows={2}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

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
