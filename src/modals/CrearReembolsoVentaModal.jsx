// src/modals/CrearReembolsoVentaModal.jsx
import { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import { obtenerOrden, obtenerOrdenDetalle } from "../services/OrdenesService.js";
import { listarOrdenesTabla } from "../services/OrdenesService.js";
import { useToast } from "../context/ToastContext.jsx";

export default function CrearReembolsoVentaModal({
  isOpen,
  onClose,
  onSave,
}) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [cargandoOrden, setCargandoOrden] = useState(false);

  const [form, setForm] = useState({
    ordenId: "",
    fecha: new Date().toISOString().split("T")[0],
    motivo: "",
    formaReembolso: "EFECTIVO",
    descuentos: 0,
    detalles: [], // [{ordenItemId, cantidad, precioUnitario}]
  });

  useEffect(() => {
    if (!isOpen) return;
    cargarOrdenes();
    resetForm();
  }, [isOpen]);

  const resetForm = () => {
    setForm({
      ordenId: "",
      fecha: new Date().toISOString().split("T")[0],
      motivo: "",
      formaReembolso: "EFECTIVO",
      descuentos: 0,
      detalles: [],
    });
    setOrdenSeleccionada(null);
    setOrdenDetalle(null);
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
      console.error("Error cargando órdenes:", error);
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
        console.log(" Orden sin items completos, usando endpoint de detalle...");
        try {
          const ordenDetalle = await obtenerOrdenDetalle(ordenId);
          // Combinar información de ambos endpoints
          orden = {
            ...orden,
            items: ordenDetalle.items || orden.items || []
          };
        } catch (detalleError) {
          console.warn(" No se pudo obtener detalle, usando orden básica:", detalleError);
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
        if (!item.id) {
          console.warn(" Item sin ID:", item);
        }
        if (!item.producto) {
          console.warn(" Item sin información de producto:", item);
        }
        
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
      console.error("Error cargando detalle de orden:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "No se pudo cargar el detalle de la orden.";
      showError(errorMsg);
      setOrdenDetalle(null);
      setForm(prev => ({ ...prev, detalles: [] }));
    } finally {
      setCargandoOrden(false);
    }
  };

  const handleOrdenChange = (e) => {
    const ordenId = e.target.value;
    setForm(prev => ({ ...prev, ordenId, detalles: [] }));
    setOrdenSeleccionada(ordenes.find(o => String(o.id) === ordenId) || null);
    cargarDetalleOrden(ordenId);
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
      console.error("Error creando reembolso:", error);
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
      <div className="modal-container modal-wide">
        <h2>Crear Devolución de Venta</h2>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-two-columns">
            <div className="form-column">
              <label>
                Orden Original *
                <select
                  value={form.ordenId}
                  onChange={handleOrdenChange}
                  required
                  disabled={loading}
                >
                  <option value="">Seleccionar orden...</option>
                  {ordenes.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.numero || ord.id} - {ord.cliente?.nombre || "Sin cliente"} - {ord.obra || "Sin obra"}
                    </option>
                  ))}
                </select>
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
              
              {ordenDetalle && (
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ marginTop: 0 }}>Información de la Orden</h3>
                  <p><strong>N°:</strong> {ordenDetalle.numero || ordenDetalle.id}</p>
                  <p><strong>Fecha:</strong> {new Date(ordenDetalle.fecha).toLocaleDateString("es-CO")}</p>
                  <p><strong>Cliente:</strong> {ordenDetalle.cliente?.nombre || "-"}</p>
                  <p><strong>Obra:</strong> {ordenDetalle.obra || "-"}</p>
                  <p><strong>Sede:</strong> {ordenDetalle.sede?.nombre || "-"}</p>
                  <p><strong>Total:</strong> {fmtCOP(ordenDetalle.total || ordenDetalle.subtotal)}</p>
                  {ordenDetalle.credito && (
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
                    <th style={{ width: "40px" }}>Incluir</th>
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
                              width: "20px", 
                              height: "20px", 
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
                              width: "80px",
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
                              width: "100px",
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
    </div>
  );
}

