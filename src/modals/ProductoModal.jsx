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
    color: "NA", // Por defecto NA para UNID
    cantidadInsula: "", // Vacío por defecto, no 0
    cantidadCentro: "", // Vacío por defecto, no 0
    cantidadPatios: "", // Vacío por defecto, no 0
    costo: "",
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
    if (product) {
      // si product viene sin esVidrio, lo inferimos desde la categoría
      const esVid = product.esVidrio ?? (product.categoria === "Vidrios");
      const tipoProducto = product.tipo || "UNID";
      // PERFIL y MT usan MATE por defecto, otros usan NA
      const colorPorDefecto = (tipoProducto === "PERFIL" || tipoProducto === "MT") ? "MATE" : "NA";
      setFormData({
        ...initialState,
        ...product,
        esVidrio: esVid,
        // Asegurar que el costo se cargue correctamente (puede venir como número)
        costo: product.costo !== undefined && product.costo !== null ? String(product.costo) : "",
        // Establecer color por defecto según tipo si no tiene color
        color: product.color || colorPorDefecto,
        // Convertir cantidades: si es 0, mostrar vacío; si tiene valor, mostrar el valor
        cantidadInsula: product.cantidadInsula && product.cantidadInsula !== 0 ? String(product.cantidadInsula) : "",
        cantidadCentro: product.cantidadCentro && product.cantidadCentro !== 0 ? String(product.cantidadCentro) : "",
        cantidadPatios: product.cantidadPatios && product.cantidadPatios !== 0 ? String(product.cantidadPatios) : "",
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
        // si marcó vidrio, autocompleta categoría buscando "VIDRIO" o "Vidrios" en las categorías
        categoria: shouldBeVidrio 
          ? (categories.find(cat => cat.nombre.toLowerCase().includes('vidrio'))?.nombre || "VIDRIO")
          : prev.categoria, // Mantener la categoría actual si se desmarca
      }));
      return;
    }

    // Si cambia la categoría, actualizar el checkbox esVidrio automáticamente
    if (name === "categoria") {
      const categoriaNombre = value?.toLowerCase() || "";
      const esCategoriaVidrio = categoriaNombre.includes('vidrio');
      
      setFormData((prev) => ({
        ...prev,
        categoria: value,
        // Si se selecciona categoría VIDRIO, marcar el checkbox automáticamente
        // Si se cambia a otra categoría (que no sea vidrio), desmarcar el checkbox
        esVidrio: esCategoriaVidrio,
      }));
      return;
    }

    // Campos de precios (pueden estar vacíos)
    const priceFields = ['precio1', 'precio2', 'precio3', 'costo', 'laminas'];
    // Campos de cantidades (deben tener 0 por defecto)
    const quantityFields = ['cantidadInsula', 'cantidadCentro', 'cantidadPatios'];
    // Campos de texto que deben convertirse a mayúsculas
    const uppercaseFields = ['codigo', 'nombre', 'color'];
    // Campos de medidas que solo permiten números y puntos
    const measureFields = ['mm', 'm1', 'm2'];

    // Si cambia el tipo, establecer color por defecto automáticamente
    if (name === 'tipo') {
      const nuevoTipo = value.toUpperCase();
      // PERFIL y MT usan MATE por defecto, otros usan NA
      const colorPorDefecto = (nuevoTipo === 'PERFIL' || nuevoTipo === 'MT') ? 'MATE' : 'NA';
      setFormData((prev) => ({
        ...prev,
        tipo: nuevoTipo,
        color: colorPorDefecto, // Siempre establecer el color por defecto según el tipo
      }));
      return;
    }

    let processedValue = value;

    if (priceFields.includes(name)) {
      // Campos de precio: solo números, pueden estar vacíos
      // El costo permite decimales (punto)
      if (name === 'costo') {
        processedValue = value.replace(/[^0-9.]/g, '');
        // Evitar múltiples puntos decimales
        const parts = processedValue.split('.');
        if (parts.length > 2) {
          processedValue = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limitar a 2 decimales
        if (parts.length === 2 && parts[1].length > 2) {
          processedValue = parts[0] + '.' + parts[1].substring(0, 2);
        }
      } else {
        processedValue = value.replace(/[^0-9]/g, '');
      }
    } else if (quantityFields.includes(name)) {
      // Campos de cantidad: solo números, pueden estar vacíos
      processedValue = value.replace(/[^0-9]/g, '');
      // Si está vacío, mantener vacío (no forzar 0)
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
    
    // Determinar si es vidrio: por checkbox o por categoría
    const categoriaNombre = typeof toSave.categoria === 'string' 
      ? toSave.categoria.toLowerCase() 
      : toSave.categoria?.nombre?.toLowerCase() || "";
    const esVidrio = toSave.esVidrio || categoriaNombre.includes('vidrio');
    
    console.log("🔍 DEBUG handleSubmit:");
    console.log("  - formData.esVidrio:", formData.esVidrio);
    console.log("  - categoriaNombre:", categoriaNombre);
    console.log("  - esVidrio calculado:", esVidrio);
    
    if (esVidrio) {
      // IMPORTANTE: Limpiar y preparar m1, m2 y mm como strings primero
      const m1Str = (formData.m1?.trim() || "").replace(/[^0-9.]/g, "") || "0";
      const m2Str = (formData.m2?.trim() || "").replace(/[^0-9.]/g, "") || "0";
      const mmStr = (formData.mm?.trim() || "").replace(/[^0-9.]/g, "") || "0";
      
      // Guardar como strings en toSave (se convertirán a números en backendPayload)
      toSave.m1 = m1Str;
      toSave.m2 = m2Str;
      toSave.mm = mmStr;
      
      // NO crear m1m2 - el backend lo calcula automáticamente
      // NO incluir laminas - no existe en el modelo del backend
      
      // Asegurar que esVidrio esté en true
      toSave.esVidrio = true;
      
      console.log("  ✅ Es vidrio - m1:", toSave.m1, "m2:", toSave.m2, "mm:", toSave.mm);
    } else {
      // Si no es vidrio, no incluir campos de vidrio
      delete toSave.mm;
      delete toSave.m1;
      delete toSave.m2;
      delete toSave.m1m2;
      delete toSave.laminas;
      toSave.esVidrio = false;
    }

    // Convertir precios a números (parseFloat para decimales)
    toSave.precio1 = toSave.precio1 === "" ? 0 : parseFloat(toSave.precio1) || 0;
    toSave.precio2 = toSave.precio2 === "" ? 0 : parseFloat(toSave.precio2) || 0;
    toSave.precio3 = toSave.precio3 === "" ? 0 : parseFloat(toSave.precio3) || 0;
    toSave.costo = toSave.costo === "" ? 0 : parseFloat(toSave.costo) || 0;
    // laminas no se envía al backend (no existe en el modelo)

    // Convertir cantidades a números enteros (si está vacío, parsear a 0)
    toSave.cantidadInsula = toSave.cantidadInsula === "" || toSave.cantidadInsula === null ? 0 : parseInt(toSave.cantidadInsula) || 0;
    toSave.cantidadCentro = toSave.cantidadCentro === "" || toSave.cantidadCentro === null ? 0 : parseInt(toSave.cantidadCentro) || 0;
    toSave.cantidadPatios = toSave.cantidadPatios === "" || toSave.cantidadPatios === null ? 0 : parseInt(toSave.cantidadPatios) || 0;

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
      costo: toSave.costo,
      precio1: toSave.precio1,
      precio2: toSave.precio2,
      precio3: toSave.precio3,
      descripcion: toSave.descripcion || "",
      posicion: toSave.posicion || ""
    };

    // IMPORTANTE: Si es vidrio, incluir los campos específicos de vidrio
    // Usar la misma lógica para determinar si es vidrio
    const categoriaNombreFinal = typeof backendPayload.categoria === 'string' 
      ? backendPayload.categoria.toLowerCase() 
      : backendPayload.categoria?.nombre?.toLowerCase() || "";
    const esVidrioFinal = toSave.esVidrio || categoriaNombreFinal.includes('vidrio');
    
    if (esVidrioFinal) {
      // IMPORTANTE: Enviar m1, m2 y mm como NÚMEROS (Double), no strings
      // El backend calcula m1m2 = m1 * m2 automáticamente
      backendPayload.mm = parseFloat(toSave.mm || "0") || 0;
      backendPayload.m1 = parseFloat(toSave.m1 || "0") || 0;
      backendPayload.m2 = parseFloat(toSave.m2 || "0") || 0;
      // NO enviar m1m2 - el backend lo calcula automáticamente
      // NO enviar laminas - no existe en el modelo del backend
      
      // Simplificar categoria: solo enviar id
      if (backendPayload.categoria && typeof backendPayload.categoria === 'object') {
        backendPayload.categoria = {
          id: backendPayload.categoria.id
        };
      }
      
      console.log("🔍 DEBUG: Creando producto VIDRIO");
      console.log("🔍 mm:", backendPayload.mm, "(número)");
      console.log("🔍 m1:", backendPayload.m1, "(número)");
      console.log("🔍 m2:", backendPayload.m2, "(número)");
      console.log("🔍 Payload completo para vidrio:", JSON.stringify(backendPayload, null, 2));
    } else {
      console.log("🔍 DEBUG: NO es vidrio, no se incluyen campos de vidrio");
    }

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

    onSave(backendPayload);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-producto">
        <div className="modal-header">
          <h2>{isEditing ? "Editar Producto" : "Agregar Producto"}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="close-btn" 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '2rem', 
              cursor: 'pointer', 
              color: '#666',
              padding: '0',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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
                  <option value="PERFIL">PERFIL</option>
                  <option value="MT">MT</option>
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
                      Largo (m1) - cm:
                      <input
                        type="text"
                        name="m1"
                        placeholder="Largo en cm"
                        value={formData.m1}
                        onChange={handleChange}
                      />
                    </label>

                    <label>
                      Ancho (m2) - cm:
                      <input
                        type="text"
                        name="m2"
                        placeholder="Ancho en cm"
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
                Costo:
                <input
                  type="text"
                  name="costo"
                  placeholder="Costo"
                  value={formData.costo}
                  onChange={handleChange}
                  inputMode="decimal"
                  pattern="[0-9.]*"
                />
              </label>

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
                      value={formData.cantidadInsula && Number(formData.cantidadInsula) > 0 ? formData.cantidadInsula : ""}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Cantidad"
                    />
                  </label>

                  <label>
                    Cantidad Centro:
                    <input
                      type="text"
                      name="cantidadCentro"
                      value={formData.cantidadCentro && Number(formData.cantidadCentro) > 0 ? formData.cantidadCentro : ""}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Cantidad"
                    />
                  </label>

                  <label>
                    Cantidad Patios:
                    <input
                      type="text"
                      name="cantidadPatios"
                      value={formData.cantidadPatios && Number(formData.cantidadPatios) > 0 ? formData.cantidadPatios : ""}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Cantidad"
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
    </div>
  );
}
