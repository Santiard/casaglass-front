// src/modals/CrearReembolsoIngresoModal.jsx
import { useEffect, useState } from "react";
import "../styles/CrudModal.css";
import { obtenerIngreso } from "../services/IngresosService.js";
import { listarIngresos } from "../services/IngresosService.js";
import { useToast } from "../context/ToastContext.jsx";
import { getTodayLocalDate } from "../lib/dateUtils.js";

export default function CrearReembolsoIngresoModal({
  isOpen,
  onClose,
  onSave,
  reembolsoAEditar = null,
}) {
  const { showError, showSuccess } = useToast();
  const isEditMode = !!reembolsoAEditar;
  const [loading, setLoading] = useState(false);
  const [ingresos, setIngresos] = useState([]);
  const [ingresoSeleccionado, setIngresoSeleccionado] = useState(null);
  const [ingresoDetalle, setIngresoDetalle] = useState(null);
  const [cargandoIngreso, setCargandoIngreso] = useState(false);
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [ingresoSearchModal, setIngresoSearchModal] = useState("");

  const [form, setForm] = useState({
    ingresoId: "",
    fecha: getTodayLocalDate(),
    numeroFacturaDevolucion: "",
    motivo: "",
    detalles: [], // [{ingresoDetalleId, cantidad, costoUnitario}]
  });

  useEffect(() => {
    if (!isOpen) return;
    cargarIngresos();
    if (reembolsoAEditar) {
      cargarReembolsoParaEditar();
    } else {
      resetForm();
    }
  }, [isOpen, reembolsoAEditar]);

  const resetForm = () => {
    setForm({
      ingresoId: "",
      fecha: getTodayLocalDate(),
      numeroFacturaDevolucion: "",
      motivo: "",
      detalles: [],
    });
    setIngresoSeleccionado(null);
    setIngresoDetalle(null);
  };

  const cargarReembolsoParaEditar = async () => {
    try {
      if (!reembolsoAEditar.ingresoOriginal?.id) {
        showError("El reembolso no tiene un ingreso original válido.");
        return;
      }

      const ingreso = await obtenerIngreso(reembolsoAEditar.ingresoOriginal.id);
      setIngresoDetalle(ingreso);
      setIngresoSeleccionado(reembolsoAEditar.ingresoOriginal);

      const detallesReembolso = (reembolsoAEditar.detalles || []).map(det => {
        const detalleIngreso = ingreso.detalles?.find(d => 
          d.producto?.codigo === det.producto?.codigo || 
          d.producto?.id === det.producto?.id
        );

        return {
          ingresoDetalleId: detalleIngreso?.id || det.ingresoDetalleId,
          producto: det.producto || { nombre: "Producto", codigo: "" },
          cantidadOriginal: detalleIngreso?.cantidad || det.cantidad || 0,
          cantidadDisponible: detalleIngreso?.cantidad || det.cantidad || 0,
          cantidad: det.cantidad || 0,
          costoUnitario: det.costoUnitario || 0,
        };
      });

      setForm({
        ingresoId: String(reembolsoAEditar.ingresoOriginal.id),
        fecha: reembolsoAEditar.fecha?.split("T")[0] || getTodayLocalDate(),
        numeroFacturaDevolucion: reembolsoAEditar.numeroFacturaDevolucion || "",
        motivo: reembolsoAEditar.motivo || "",
        detalles: detallesReembolso,
      });
    } catch (error) {
      console.error("Error cargando reembolso para editar:", error);
      showError("Error al cargar los datos del reembolso.");
    }
  };

  const cargarIngresos = async () => {
    try {
      const lista = await listarIngresos();
      setIngresos(lista || []);
    } catch (error) {
      console.error("Error cargando ingresos:", error);
      showError("No se pudieron cargar los ingresos.");
    }
  };

  const cargarDetalleIngreso = async (ingresoId) => {
    if (!ingresoId) {
      setIngresoDetalle(null);
      setForm(prev => ({ ...prev, detalles: [] }));
      return;
    }

    setCargandoIngreso(true);
    try {
      const ingreso = await obtenerIngreso(ingresoId);
      setIngresoDetalle(ingreso);
      
      // Inicializar detalles con cantidades disponibles (considerando reembolsos previos)
      const detallesIniciales = (ingreso.detalles || []).map((det) => ({
        ingresoDetalleId: det.id,
        producto: det.producto,
        cantidadOriginal: det.cantidad || 0,
        cantidadDisponible: det.cantidad || 0, // TODO: Restar reembolsos previos
        cantidad: "",
        costoUnitario: det.costoUnitario || 0,
      }));
      
      setForm(prev => ({ ...prev, detalles: detallesIniciales }));
    } catch (error) {
      console.error("Error cargando detalle de ingreso:", error);
      showError("No se pudo cargar el detalle del ingreso.");
      setIngresoDetalle(null);
    } finally {
      setCargandoIngreso(false);
    }
  };

  const handleIngresoChange = (ingresoSeleccionado) => {
    setForm(prev => ({ ...prev, ingresoId: String(ingresoSeleccionado.id), detalles: [] }));
    setIngresoSeleccionado(ingresoSeleccionado);
    cargarDetalleIngreso(ingresoSeleccionado.id);
    setShowIngresoModal(false);
    setIngresoSearchModal("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!form.ingresoId) {
      showError("Debes seleccionar un ingreso.");
      return;
    }

    if (!form.motivo || form.motivo.trim() === "") {
      showError("El motivo es obligatorio.");
      return;
    }

    const detallesValidos = form.detalles.filter(
      (d) => d.cantidad && Number(d.cantidad) > 0
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
      const payload = {
        ingresoId: Number(form.ingresoId),
        fecha: form.fecha || undefined,
        numeroFacturaDevolucion: form.numeroFacturaDevolucion.trim() || undefined,
        motivo: form.motivo.trim(),
        detalles: detallesValidos.map((d) => ({
          ingresoDetalleId: d.ingresoDetalleId,
          cantidad: Number(d.cantidad),
          costoUnitario: Number(d.costoUnitario) || undefined,
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

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2>{isEditMode ? "Editar Devolución de Ingreso" : "Crear Devolución de Ingreso"}</h2>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-two-columns">
            <div className="form-column">
              <label>
                Ingreso Original *
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={ingresoSeleccionado ? `#${ingresoSeleccionado.id} - ${ingresoSeleccionado.proveedor?.nombre || "Sin proveedor"} - ${ingresoSeleccionado.numeroFactura || "Sin factura"}` : ""}
                    placeholder="Click en 'Buscar' para seleccionar ingreso..."
                    readOnly
                    style={{ flex: 1, cursor: isEditMode ? "not-allowed" : "pointer", backgroundColor: "#f9fafb", opacity: isEditMode ? 0.6 : 1 }}
                    onClick={() => !isEditMode && setShowIngresoModal(true)}
                    required
                    disabled={isEditMode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowIngresoModal(true)}
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
                    Buscar Ingreso
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
                N° Factura Devolución
                <input
                  type="text"
                  value={form.numeroFacturaDevolucion}
                  onChange={(e) => setForm(prev => ({ ...prev, numeroFacturaDevolucion: e.target.value }))}
                  placeholder="Opcional"
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
              {cargandoIngreso && <p>Cargando detalles del ingreso...</p>}
              
              {ingresoDetalle && (
                <div style={{ background: "#f5f5f5", padding: "1rem", borderRadius: "8px" }}>
                  <h3 style={{ marginTop: 0 }}>Información del Ingreso</h3>
                  <p><strong>ID:</strong> {ingresoDetalle.id}</p>
                  <p><strong>Fecha:</strong> {new Date(ingresoDetalle.fecha).toLocaleDateString("es-CO")}</p>
                  <p><strong>Proveedor:</strong> {ingresoDetalle.proveedor?.nombre || "-"}</p>
                  <p><strong>N° Factura:</strong> {ingresoDetalle.numeroFactura || "-"}</p>
                  <p><strong>Total:</strong> {fmtCOP(ingresoDetalle.totalCosto)}</p>
                </div>
              )}
            </div>
          </div>

          {ingresoDetalle && form.detalles.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Productos a Devolver</h3>
              <table className="table" style={{ width: "100%", marginTop: "0.5rem" }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad Original</th>
                    <th>Cantidad Disponible</th>
                    <th>Cantidad a Devolver</th>
                    <th>Costo Unitario</th>
                    <th>Total Línea</th>
                  </tr>
                </thead>
                <tbody>
                  {form.detalles.map((det, index) => {
                    const cantidad = Number(det.cantidad) || 0;
                    const costoUnitario = Number(det.costoUnitario) || 0;
                    const totalLinea = cantidad * costoUnitario;

                    return (
                      <tr key={det.ingresoDetalleId}>
                        <td>
                          <strong>{det.producto?.nombre || "-"}</strong>
                          <br />
                          <small>{det.producto?.codigo || det.producto?.sku || ""}</small>
                        </td>
                        <td>{det.cantidadOriginal}</td>
                        <td>{det.cantidadDisponible}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={det.cantidadDisponible}
                            value={det.cantidad}
                            onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                            placeholder="0"
                            disabled={loading}
                            style={{ width: "80px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={det.costoUnitario}
                            onChange={(e) => handleDetalleChange(index, "costoUnitario", e.target.value)}
                            disabled={loading}
                            style={{ width: "100px" }}
                          />
                        </td>
                        <td><strong>{fmtCOP(totalLinea)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              {loading ? "Guardando..." : isEditMode ? "Actualizar Devolución" : "Crear Devolución"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de búsqueda de ingreso */}
      {showIngresoModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowIngresoModal(false)}
        >
          <div
            className="modal-container"
            style={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Buscar Ingreso</h3>
              <button
                type="button"
                onClick={() => setShowIngresoModal(false)}
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
              placeholder="Buscar por ID, proveedor o número de factura..."
              value={ingresoSearchModal}
              onChange={(e) => setIngresoSearchModal(e.target.value)}
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
              {ingresos.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
                  No hay ingresos disponibles
                </p>
              ) : (
                ingresos
                  .filter((ing) => {
                    const searchTerm = ingresoSearchModal.toLowerCase();
                    const id = String(ing.id).toLowerCase();
                    const proveedor = (ing.proveedor?.nombre || "").toLowerCase();
                    const factura = (ing.numeroFactura || "").toLowerCase();
                    return (
                      id.includes(searchTerm) ||
                      proveedor.includes(searchTerm) ||
                      factura.includes(searchTerm)
                    );
                  })
                  .map((ing) => (
                    <div
                      key={ing.id}
                      onClick={() => handleIngresoChange(ing)}
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
                        Ingreso #{ing.id}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        Proveedor: {ing.proveedor?.nombre || "Sin proveedor"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        Factura: {ing.numeroFactura || "Sin factura"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                        Fecha: {ing.fecha ? new Date(ing.fecha).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

