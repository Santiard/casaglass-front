// src/modals/ProductoModal.jsx
import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext.jsx";
import "../styles/CrudModal.css";
import { listarCategorias } from "../services/CategoriasService";

export default function ProductModal({ isOpen, onClose, onSave, product }) {
  const { showError } = useToast();
  const initialState = {
    id: null,
    codigo: "",
    nombre: "",
    categoria: "",
    tipo: "UNID",
    color: "",
    cantidadInsula: 0,
    cantidadCentro: 0,
    cantidadPatios: 0,
    precio1: "",
    precio2: "",
    precio3: "",
    esVidrio: false,
    mm: "",
    m1: "",
    m2: "",
    laminas: "",
  };

  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);

  const isEditing = !!product;

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
      
      // VALIDACIÓN: Si estamos editando un producto existente que NO es de categoría "Vidrios",
      // no se puede marcar como esVidrio
      if (isEditing && shouldBeVidrio && !product?.categoria?.toLowerCase().includes('vidrio')) {
        showError("No se puede marcar como vidrio un producto que no pertenece a una categoría de vidrios");
        return; // No actualizar el estado
      }
      
      setFormData((prev) => ({
        ...prev,
        esVidrio: shouldBeVidrio,
        // si marcó vidrio, autocompleta categoría buscando "Vidrios" en las categorías
        categoria: shouldBeVidrio 
          ? (categories.find(cat => cat.nombre.toLowerCase().includes('vidrio'))?.nombre || "Vidrios")
          : (prev.categoria?.toLowerCase().includes('vidrio') ? "" : prev.categoria),
      }));
      return;
    }

    // Campos de precios (pueden estar vacíos)
    const priceFields = ['precio1', 'precio2', 'precio3', 'laminas'];
    // Campos de cantidades (deben tener 0 por defecto)
    const quantityFields = ['cantidadInsula', 'cantidadCentro', 'cantidadPatios'];
    // Campos de texto que deben convertirse a mayúsculas
    const uppercaseFields = ['codigo', 'nombre', 'color'];
    // Campos de medidas que solo permiten números y puntos
    const measureFields = ['mm', 'm1', 'm2'];

    let processedValue = value;

    if (priceFields.includes(name)) {
      // Campos de precio: solo números, pueden estar vacíos
      processedValue = value.replace(/[^0-9]/g, '');
    } else if (quantityFields.includes(name)) {
      // Campos de cantidad: solo números, 0 por defecto
      processedValue = value.replace(/[^0-9]/g, '');
      if (processedValue === '') processedValue = '0';
    } else if (measureFields.includes(name)) {
      // Permitir números y punto decimal
      processedValue = value.replace(/[^0-9.]/g, '');
      // Evitar múltiples puntos decimales
      const parts = processedValue.split('.');
      if (parts.length > 2) {
        processedValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else if (uppercaseFields.includes(name)) {
      // Convertir a mayúsculas
      processedValue = value.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
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

    // Convertir precios a números (parseFloat para decimales)
    toSave.precio1 = toSave.precio1 === "" ? 0 : parseFloat(toSave.precio1) || 0;
    toSave.precio2 = toSave.precio2 === "" ? 0 : parseFloat(toSave.precio2) || 0;
    toSave.precio3 = toSave.precio3 === "" ? 0 : parseFloat(toSave.precio3) || 0;
    toSave.laminas = toSave.laminas === "" ? 0 : parseInt(toSave.laminas) || 0;

    // Convertir cantidades a números enteros
    toSave.cantidadInsula = parseInt(toSave.cantidadInsula) || 0;
    toSave.cantidadCentro = parseInt(toSave.cantidadCentro) || 0;
    toSave.cantidadPatios = parseInt(toSave.cantidadPatios) || 0;

    // Si es creación, remover el id null
    if (!isEditing) {
      delete toSave.id;
    }

    // Ajustar formato para coincidir exactamente con el esquema del backend
    if (toSave.categoria && typeof toSave.categoria === 'string') {
      const categoriaObj = categories.find(cat => cat.nombre === toSave.categoria);
      if (categoriaObj) {
        toSave.categoria = {
          id: categoriaObj.id,
          nombre: categoriaObj.nombre
        };
      }
    }

    // Asegurar que tipo esté en mayúsculas
    if (toSave.tipo) {
      toSave.tipo = toSave.tipo.toUpperCase();
    }

    // Crear objeto limpio que coincida exactamente con el esquema del backend
    const backendPayload = {
      codigo: toSave.codigo,
      nombre: toSave.nombre,
      categoria: toSave.categoria,
      tipo: toSave.tipo,
      color: toSave.color,
      cantidad: (toSave.cantidadInsula || 0) + (toSave.cantidadCentro || 0) + (toSave.cantidadPatios || 0),
      costo: toSave.costo || 0,
      precio1: toSave.precio1,
      precio2: toSave.precio2,
      precio3: toSave.precio3,
      descripcion: toSave.descripcion || "",
      posicion: toSave.posicion || ""
    };

    // Para edición, incluir campos requeridos del producto original
    if (isEditing && toSave.id) {
      backendPayload.id = toSave.id;
      backendPayload.version = toSave.version !== undefined ? toSave.version : 0;
      
      // Incluir cantidades por sede (siempre se envían en edición)
      backendPayload.cantidadInsula = toSave.cantidadInsula || 0;
      backendPayload.cantidadCentro = toSave.cantidadCentro || 0;
      backendPayload.cantidadPatios = toSave.cantidadPatios || 0;
    } else {
      // Para creación, version siempre es 0
      backendPayload.version = 0;
    }

    console.log("Datos que se enviarán al backend:", backendPayload);
    onSave(backendPayload);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-producto">
        <h2>{isEditing ? "Editar Producto" : "Agregar Producto"}</h2>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-two-columns">
            {/* COLUMNA IZQUIERDA */}
            <div className="form-column">
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
                Tipo:
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="UNID">UNIDAD</option>
                  <option value="PERF">PERFIL</option>
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
                  <option value="">Seleccionar color...</option>
                  <option value="MATE">MATE</option>
                  <option value="BLANCO">BLANCO</option>
                  <option value="NEGRO">NEGRO</option>
                  <option value="BRONCE">BRONCE</option>
                  <option value="NATURAL">NATURAL</option>
                  <option value="NA">NA</option>
                </select>
              </label>

              {/* Checkbox para identificar vidrio */}
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="esVidrio"
                  checked={!!formData.esVidrio}
                  onChange={handleChange}
                  disabled={isEditing && !product?.categoria?.toLowerCase().includes('vidrio')}
                  title={
                    isEditing && !product?.categoria?.toLowerCase().includes('vidrio')
                      ? "No se puede cambiar: el producto no pertenece a una categoría de vidrios"
                      : ""
                  }
                />
                Es vidrio
                {isEditing && !product?.categoria?.toLowerCase().includes('vidrio') && (
                  <small style={{ color: '#666', marginLeft: '8px' }}>
                    (No se puede cambiar: categoría "{product?.categoria}")
                  </small>
                )}
              </label>

              {/* Campos exclusivos para vidrio */}
              {formData.esVidrio && (
                <div className="vidrio-fields">
                  <h4>Especificaciones de Vidrio</h4>
                  
                  <label>
                    Espesor (mm):
                    <input
                      type="text"
                      name="mm"
                      placeholder="Ej: 6mm"
                      value={formData.mm}
                      onChange={handleChange}
                    />
                  </label>

                  <div className="dimensions-row">
                    <label>
                      Largo (m1):
                      <input
                        type="text"
                        name="m1"
                        placeholder="Largo"
                        value={formData.m1}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      Ancho (m2):
                      <input
                        type="text"
                        name="m2"
                        placeholder="Ancho"
                        value={formData.m2}
                        onChange={handleChange}
                      />
                    </label>
                  </div>

                  <label>
                    Láminas:
                    <input
                      type="text"
                      name="laminas"
                      placeholder="Número de láminas"
                      value={formData.laminas}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA */}
            <div className="form-column">
              <label>
                Precio 1:
                <input
                  type="text"
                  name="precio1"
                  placeholder="Precio 1"
                  value={formData.precio1}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>

              <label>
                Precio 2:
                <input
                  type="text"
                  name="precio2"
                  placeholder="Precio 2"
                  value={formData.precio2}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>

              <label>
                Precio 3:
                <input
                  type="text"
                  name="precio3"
                  placeholder="Precio 3"
                  value={formData.precio3}
                  onChange={handleChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>


              {/* Cantidades sólo al editar */}
              {isEditing && (
                <>
                  <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#495057', fontSize: '0.9rem' }}>
                    Cantidades por Sede
                  </h4>
                  
                  <label>
                    Cantidad Ínsula:
                    <input
                      type="text"
                      name="cantidadInsula"
                      value={formData.cantidadInsula}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>

                  <label>
                    Cantidad Centro:
                    <input
                      type="text"
                      name="cantidadCentro"
                      value={formData.cantidadCentro}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>

                  <label>
                    Cantidad Patios:
                    <input
                      type="text"
                      name="cantidadPatios"
                      value={formData.cantidadPatios}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="form-full-width">
            <div className="modal-buttons">
              <button type="button" onClick={onClose} className="btn-cancelar">
                Cancelar
              </button>
              <button type="submit" className="btn-guardar">
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
