// src/modals/CrearReembolsoVentaModal.jsx
import { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import { obtenerOrden, obtenerOrdenDetalle } from "../services/OrdenesService.js";
import { listarOrdenesTabla } from "../services/OrdenesService.js";
import { useToast } from "../context/ToastContext.jsx";
import { getTodayLocalDate } from "../lib/dateUtils.js";

export default function CrearReembolsoVentaModal({
  isOpen,
  onClose,
  onSave,
  reembolsoAEditar = null,
}) {
  const { showError, showSuccess } = useToast();
  const isEditMode = !!reembolsoAEditar;
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [cargandoOrden, setCargandoOrden] = useState(false);
  const [showOrdenModal, setShowOrdenModal] = useState(false);
  const [ordenSearchModal, setOrdenSearchModal] = useState("");

  const [form, setForm] = useState({
    ordenId: "",
    fecha: getTodayLocalDate(),
    motivo: "",
    formaReembolso: "EFECTIVO",
    descuentos: 0,
    detalles: [], // [{ordenItemId, cantidad, precioUnitario}]
  });

  useEffect(() => {
    if (!isOpen) return;
    cargarOrdenes();
    if (reembolsoAEditar) {
      cargarReembolsoParaEditar();
    } else {
      resetForm();
    }
  }, [isOpen, reembolsoAEditar]);

  const resetForm = () => {
    setForm({
      ordenId: "",
      fecha: getTodayLocalDate(),
      motivo: "",
      formaReembolso: "EFECTIVO",
      descuentos: 0,
      detalles: [],
    });
    setOrdenSeleccionada(null);
    setOrdenDetalle(null);
  };

  const cargarReembolsoParaEditar = async () => {
    try {
      // Primero cargar la orden para obtener los ordenItemId correctos
      if (!reembolsoAEditar.ordenOriginal?.id) {
        showError("El reembolso no tiene una orden original válida.");
        return;
      }

      let orden = await obtenerOrden(reembolsoAEditar.ordenOriginal.id);
      
      // Si la orden no tiene items completos, usar el endpoint de detalle
      if (!orden.items || orden.items.length === 0 || !orden.items[0]?.producto) {
        const ordenDetalle = await obtenerOrdenDetalle(reembolsoAEditar.ordenOriginal.id);
        // Crear nuevo objeto con los items del detalle
        orden = {
          ...orden,
          items: ordenDetalle.items || []
        };
      }

      setOrdenDetalle(orden);
      setOrdenSeleccionada(reembolsoAEditar.ordenOriginal);

      // Mapear los detalles del reembolso con los items de la orden para obtener los ordenItemId correctos
      const detallesReembolso = (reembolsoAEditar.detalles || []).map(det => {
        // Buscar el item correspondiente en la orden por el código o nombre del producto
        const itemOrden = orden.items?.find(item => 
          item.producto?.codigo === det.producto?.codigo || 
          item.producto?.id === det.producto?.id
        );

        return {
          ordenItemId: itemOrden?.id || det.ordenItemId, // Usar el ID del item de la orden
          producto: det.producto || { nombre: "Producto", codigo: "" },
          cantidadOriginal: itemOrden?.cantidad || det.cantidad || 0,
          cantidadDisponible: itemOrden?.cantidad || det.cantidad || 0,
          cantidad: det.cantidad || 0,
          precioUnitario: det.precioUnitario || 0,
          seleccionado: true,
        };
      });

      setForm({
        ordenId: String(reembolsoAEditar.ordenOriginal.id),
        fecha: reembolsoAEditar.fecha?.split("T")[0] || getTodayLocalDate(),
        motivo: reembolsoAEditar.motivo || "",
        formaReembolso: reembolsoAEditar.formaReembolso || "EFECTIVO",
        descuentos: reembolsoAEditar.descuentos || 0,
        detalles: detallesReembolso,
      });
    } catch (error) {
      showError("Error al cargar los datos del reembolso.");
    }
  };

  const cargarOrdenes = async () => {
    try {
      const lista = await listarOrdenesTabla();
      // Filtrar solo órdenes vendidas (venta: true) y no anuladas
      const ordenesVendidas = (lista || []).filter(
        (o) => o.venta === true && o.estado !== "ANULADA"
      );
      setOrdenes(ordenesVendidas);
    } catch (error) {
      showError("No se pudieron cargar las órdenes.");
    }
  };

  const cargarDetalleOrden = async (ordenId) => {
    if (!ordenId) {
      setOrdenDetalle(null);
      setForm(prev => ({ ...prev, detalles: [] }));
      return;
    }

    setCargandoOrden(true);
    try {
      // Intentar primero con obtenerOrden, si no tiene items completos, usar obtenerOrdenDetalle
      let orden = await obtenerOrden(ordenId);
      
      // Si la orden no tiene items o los items no tienen información del producto, usar el endpoint de detalle
      if (!orden.items || orden.items.length === 0 || !orden.items[0]?.producto) {
        try {
          const ordenDetalle = await obtenerOrdenDetalle(ordenId);
          // Combinar información de ambos endpoints
          orden = {
            ...orden,
            items: ordenDetalle.items || orden.items || []
          };
        } catch (detalleError) {
          // No se pudo obtener detalle, usando orden básica
        }
      }
      
      setOrdenDetalle(orden);
      
      // Validar que tenemos items con información del producto
      if (!orden.items || orden.items.length === 0) {
        showError("La orden seleccionada no tiene productos.");
        setOrdenDetalle(null);
        setForm(prev => ({ ...prev, detalles: [] }));
        return;
      }
      
      // Inicializar detalles con cantidades disponibles (considerando reembolsos previos)
      const detallesIniciales = orden.items.map((item) => {
        // Validar que el item tenga la información necesaria
        
        return {
          ordenItemId: item.id,
          producto: item.producto || { id: null, codigo: "", nombre: "Producto desconocido" },
          cantidadOriginal: item.cantidad || 0,
          cantidadDisponible: item.cantidad || 0, // TODO: Restar reembolsos previos
          cantidad: "",
          precioUnitario: item.precioUnitario || 0,
          seleccionado: false, // Por defecto no seleccionado
        };
      });
      
      setForm(prev => ({ ...prev, detalles: detallesIniciales }));
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "No se pudo cargar el detalle de la orden.";
      showError(errorMsg);
      setOrdenDetalle(null);
      setForm(prev => ({ ...prev, detalles: [] }));
    } finally {
      setCargandoOrden(false);
    }
  };

  const handleOrdenChange = (ordenSeleccionada) => {
    setForm(prev => ({ ...prev, ordenId: String(ordenSeleccionada.id), detalles: [] }));
    setOrdenSeleccionada(ordenSeleccionada);
    cargarDetalleOrden(ordenSeleccionada.id);
    setShowOrdenModal(false);
    setOrdenSearchModal("");
  };

  const handleDetalleChange = (index, field, value) => {
    setForm(prev => {
      const nuevosDetalles = [...prev.detalles];
      nuevosDetalles[index] = {
        ...nuevosDetalles[index],
        [field]: value,
      };
      return { ...prev, detalles: nuevosDetalles };
    });
  };

  const toggleProductoSeleccionado = (index) => {
    setForm(prev => {
      const nuevosDetalles = [...prev.detalles];
      const detalle = nuevosDetalles[index];
      if (detalle.seleccionado) {
        // Deseleccionar: limpiar cantidad
        nuevosDetalles[index] = {
          ...detalle,
          seleccionado: false,
          cantidad: "",
        };
      } else {
        // Seleccionar: poner cantidad disponible por defecto
        nuevosDetalles[index] = {
          ...detalle,
          seleccionado: true,
          cantidad: detalle.cantidadDisponible || "",
        };
      }
      return { ...prev, detalles: nuevosDetalles };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!form.ordenId) {
      showError("Debes seleccionar una orden.");
      return;
    }

    if (!form.motivo || form.motivo.trim() === "") {
      showError("El motivo es obligatorio.");
      return;
    }

    if (!form.formaReembolso) {
      showError("Debes seleccionar una forma de devolución.");
      return;
    }

    const detallesValidos = form.detalles.filter(
      (d) => d.seleccionado && d.cantidad && Number(d.cantidad) > 0
    );

    if (detallesValidos.length === 0) {
      showError("Debes agregar al menos un producto a devolver.");
      return;
    }

    // Validar que las cantidades no excedan las disponibles
    for (const det of detallesValidos) {
      const cantidad = Number(det.cantidad);
      const disponible = Number(det.cantidadDisponible);
      if (cantidad > disponible) {
        showError(
          `La cantidad a devolver (${cantidad}) excede la cantidad disponible (${disponible}) para ${det.producto?.nombre || "el producto"}.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const subtotal = detallesValidos.reduce((sum, d) => {
        return sum + (Number(d.cantidad) * Number(d.precioUnitario));
      }, 0);

      const payload = {
        ordenId: Number(form.ordenId),
        fecha: form.fecha || undefined,
        motivo: form.motivo.trim(),
        formaReembolso: form.formaReembolso,
        descuentos: Number(form.descuentos) || 0,
        detalles: detallesValidos.map((d) => ({
          ordenItemId: d.ordenItemId,
          cantidad: Number(d.cantidad),
          precioUnitario: Number(d.precioUnitario) || undefined,
        })),
      };

      await onSave(payload);
      showSuccess("Devolución creada exitosamente.");
      resetForm();
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "No se pudo crear la devolución.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const subtotal = form.detalles.reduce((sum, d) => {
    if (!d.seleccionado) return sum;
    const cantidad = Number(d.cantidad) || 0;
    const precio = Number(d.precioUnitario) || 0;
    return sum + (cantidad * precio);
  }, 0);

  const descuentos = Number(form.descuentos) || 0;
  const total = subtotal - descuentos;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2>{isEditMode ? "Editar Devolución de Venta" : "Crear Devolución de Venta"}</h2>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-two-columns">
            <div className="form-column">
              <label>
                Orden Original *
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={ordenSeleccionada ? `#${ordenSeleccionada.numero || ordenSeleccionada.id} - ${ordenSeleccionada.cliente?.nombre || "Sin cliente"} - ${ordenSeleccionada.obra || "Sin obra"}` : ""}
                    placeholder="Click en 'Buscar' para seleccionar orden..."
                    readOnly
                    style={{ flex: 1, cursor: isEditMode ? "not-allowed" : "pointer", backgroundColor: "#f9fafb", opacity: isEditMode ? 0.6 : 1 }}
                    onClick={() => !isEditMode && setShowOrdenModal(true)}
                    required
                    disabled={isEditMode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrdenModal(true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#1e2753",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isEditMode ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: isEditMode ? 0.5 : 1
                    }}
                    disabled={loading || isEditMode}
                  >
                    Buscar Orden
                  </button>
                </div>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                  disabled={loading}
                />
              </label>

              <label>
                Forma de Devolución *
                <select
                  value={form.formaReembolso}
                  onChange={(e) => setForm(prev => ({ ...prev, formaReembolso: e.target.value }))}
                  required
                  disabled={loading}
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="NOTA_CREDITO">NOTA CRÉDITO</option>
                  <option value="AJUSTE_CREDITO">AJUSTE CRÉDITO</option>
                </select>
              </label>

              <label>
                Descuentos
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.descuentos}
                  onChange={(e) => setForm(prev => ({ ...prev, descuentos: e.target.value }))}
                  placeholder="0"
                  disabled={loading}
                />
              </label>

              <label>
                Motivo *
                <textarea
                  value={form.motivo}
                  onChange={(e) => setForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Razón de la devolución..."
                  required
                  rows={3}
                  disabled={loading}
                />
              </label>
            </div>

            <div className="form-column">
              {cargandoOrden && <p>Cargando detalles de la orden...</p>}
              
              {(ordenDetalle || ordenSeleccionada) && (
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ marginTop: 0 }}>Información de la Orden</h3>
                  <p><strong>N°:</strong> {
                    ordenSeleccionada?.numero || ordenDetalle?.numero || ordenDetalle?.id || ordenSeleccionada?.id || "-"
                  }</p>
                  <p><strong>Fecha:</strong> {
                    (() => {
                      const fechaRaw = ordenSeleccionada?.fechaCreacion || ordenDetalle?.fecha || ordenDetalle?.fechaCreacion;
                      if (!fechaRaw) return "-";
                      const fechaObj = new Date(fechaRaw);
                      return isNaN(fechaObj.getTime()) ? "-" : fechaObj.toLocaleDateString("es-CO");
                    })()
                  }</p>
                  <p><strong>Cliente:</strong> {
                    ordenSeleccionada?.cliente?.nombre || ordenDetalle?.cliente?.nombre || "-"
                  }</p>
                  <p><strong>Obra:</strong> {
                    ordenSeleccionada?.obra || ordenDetalle?.obra || "-"
                  }</p>
                  <p><strong>Sede:</strong> {
                    ordenSeleccionada?.sede?.nombre || ordenDetalle?.sede?.nombre || "-"
                  }</p>
                  <p><strong>Total:</strong> {
                    fmtCOP(ordenSeleccionada?.total || ordenDetalle?.total || ordenDetalle?.subtotal)
                  }</p>
                  {(ordenSeleccionada?.credito || ordenDetalle?.credito) && (
                    <p><strong>Venta a Crédito:</strong> Sí</p>
                  )}
                </div>
              )}

              {ordenDetalle && form.detalles.length > 0 && (
                <div style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  <h4>Resumen de la Devolución</h4>
                  <p><strong>Productos seleccionados:</strong> {form.detalles.filter(d => d.seleccionado).length} de {form.detalles.length}</p>
                  <p><strong>Subtotal:</strong> {fmtCOP(subtotal)}</p>
                  <p><strong>Descuentos:</strong> {fmtCOP(descuentos)}</p>
                  <p><strong style={{ fontSize: "1.1em" }}>Total:</strong> {fmtCOP(total)}</p>
                </div>
              )}
            </div>
          </div>

          {ordenDetalle && form.detalles.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Productos de la Orden - Selecciona los que deseas devolver</h3>
              <table className="table" style={{ width: "100%", marginTop: "0.5rem" }}>
                <thead>
                  <tr>
                    <th>Incluir</th>
                    <th>Producto</th>
                    <th>Cantidad Original</th>
                    <th>Cantidad Disponible</th>
                    <th>Cantidad a Devolver</th>
                    <th>Precio Unitario</th>
                    <th>Total Línea</th>
                  </tr>
                </thead>
                <tbody>
                  {form.detalles.map((det, index) => {
                    const cantidad = Number(det.cantidad) || 0;
                    const precioUnitario = Number(det.precioUnitario) || 0;
                    const totalLinea = cantidad * precioUnitario;
                    const estaSeleccionado = det.seleccionado || false;

                    return (
                      <tr 
                        key={det.ordenItemId}
                        style={{ 
                          backgroundColor: estaSeleccionado ? "#e8f5e9" : "transparent",
                          opacity: estaSeleccionado ? 1 : 0.7
                        }}
                      >
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
                            onChange={() => toggleProductoSeleccionado(index)}
                            disabled={loading}
                            style={{ 
                              width: "1.25rem", 
                              height: "1.25rem", 
                              cursor: "pointer" 
                            }}
                          />
                        </td>
                        <td>
                          <strong>{det.producto?.nombre || "-"}</strong>
                          <br />
                          <small>{det.producto?.codigo || ""}</small>
                        </td>
                        <td>{det.cantidadOriginal}</td>
                        <td><strong>{det.cantidadDisponible}</strong></td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={det.cantidadDisponible}
                            value={det.cantidad}
                            onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                            placeholder="0"
                            disabled={loading || !estaSeleccionado}
                            style={{ 
                              width: "5rem",
                              backgroundColor: estaSeleccionado ? "white" : "#f5f5f5"
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={det.precioUnitario}
                            onChange={(e) => handleDetalleChange(index, "precioUnitario", e.target.value)}
                            disabled={loading || !estaSeleccionado}
                            style={{ 
                              width: "6.25rem",
                              backgroundColor: estaSeleccionado ? "white" : "#f5f5f5"
                            }}
                          />
                        </td>
                        <td>
                          <strong style={{ color: estaSeleccionado ? "inherit" : "#999" }}>
                            {estaSeleccionado ? fmtCOP(totalLinea) : "-"}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
 Marca los productos que deseas incluir en la devolución
              </p>
            </div>
          )}

          <div className="modal-buttons">
            <button
              type="button"
              className="btn-cancelar"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Crear Devolución"}
            </button>
          </div>
        </form>
      </div>
      {/* Modal de búsqueda de orden */}
      {showOrdenModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowOrdenModal(false)}
        >
          <div
            className="modal-container"
            style={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Buscar Orden</h3>
              <button
                type="button"
                onClick={() => setShowOrdenModal(false)}
                style={{
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#666"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#fee";
                  e.target.style.color = "#c00";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "white";
                  e.target.style.color = "#666";
                }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar por número de orden, cliente u obra..."
              value={ordenSearchModal}
              onChange={(e) => setOrdenSearchModal(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px"
              }}
              autoFocus
            />

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {ordenes.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
                  No hay órdenes disponibles
                </p>
              ) : (
                ordenes
                  .filter((ord) => {
                    const searchTerm = ordenSearchModal.toLowerCase();
                    const numero = String(ord.numero || ord.id).toLowerCase();
                    const cliente = (ord.cliente?.nombre || "").toLowerCase();
                    const obra = (ord.obra || "").toLowerCase();
                    return (
                      numero.includes(searchTerm) ||
                      cliente.includes(searchTerm) ||
                      obra.includes(searchTerm)
                    );
                  })
                  .map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => handleOrdenChange(ord)}
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0f0f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                        Orden #{ord.numero || ord.id}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        Cliente: {ord.cliente?.nombre || "Sin cliente"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        Obra: {ord.obra || "Sin obra"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                        Fecha: {ord.fechaCreacion ? new Date(ord.fechaCreacion).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}    </div>
  );
}

