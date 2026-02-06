import React, { useState, useEffect } from "react";
import "../styles/Modal.css";
import { useToast } from "../context/ToastContext.jsx";
import { actualizarFactura, obtenerFactura } from "../services/FacturasService.js";
import { listarClientes } from "../services/ClientesService.js";

export default function EditarFacturaModal({ isOpen, onClose, factura, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [facturaCompleta, setFacturaCompleta] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");

  useEffect(() => {
    if (!isOpen || !factura?.id) return;

    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [facturaData, clientesData] = await Promise.all([
          obtenerFactura(factura.id),
          listarClientes()
        ]);

        setFacturaCompleta(facturaData);
        setClientes(clientesData || []);
        setClienteId(facturaData?.cliente?.id ?? "");
        setClienteSeleccionado(facturaData?.cliente ?? null);
        setNumeroFactura(facturaData?.numeroFactura || facturaData?.numero || "");
      } catch (error) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "No se pudieron cargar los datos de la factura.";
        showError(msg);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [isOpen, factura, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!facturaCompleta || !facturaCompleta.id) {
      showError("No se pudo identificar la factura a editar.");
      return;
    }

    // Validar número de factura si se cambió
    const numeroFacturaTrimmed = numeroFactura.trim();
    if (!numeroFacturaTrimmed) {
      showError("El número de factura no puede estar vacío.");
      return;
    }

    // Validar cliente si se cambió
    if (!clienteId || !clienteSeleccionado) {
      showError("Debes seleccionar un cliente.");
      return;
    }

    setSaving(true);
    try {
      // Construir payload solo con los campos que cambiaron (actualización parcial)
      const payload = {};
      
      // Solo incluir numeroFactura si cambió
      const numeroOriginal = facturaCompleta.numeroFactura || facturaCompleta.numero || "";
      if (numeroFacturaTrimmed !== numeroOriginal) {
        payload.numeroFactura = numeroFacturaTrimmed;
      }
      
      // Solo incluir clienteId si cambió
      const clienteIdOriginal = facturaCompleta.cliente?.id;
      if (Number(clienteId) !== clienteIdOriginal) {
        payload.clienteId = Number(clienteId);
      }

      // Si no hay cambios, mostrar mensaje y salir
      if (Object.keys(payload).length === 0) {
        showError("No se detectaron cambios para guardar.");
        setSaving(false);
        return;
      }

      await actualizarFactura(facturaCompleta.id, payload);
      
      // Mensaje de éxito según qué se actualizó
      const cambios = [];
      if (payload.numeroFactura) cambios.push("número de factura");
      if (payload.clienteId) cambios.push("cliente");
      const mensaje = `Factura actualizada exitosamente. ${cambios.length > 0 ? `Se actualizó: ${cambios.join(" y ")}.` : ""}`;
      
      showSuccess(mensaje);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "No se pudo actualizar la factura.";
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const estaCargando = loading || !facturaCompleta;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px" }}
      >
        <div className="modal-header">
          <h2>Editar Factura</h2>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {estaCargando ? (
          <div className="modal-body">
            <p style={{ textAlign: "center", padding: "1.5rem" }}>
              Cargando datos de la factura...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div style={{ marginBottom: "1rem" }}>
                <p
                  style={{
                    color: "#666",
                    fontSize: "0.9rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  Factura ID: <strong>#{facturaCompleta?.id}</strong>
                  {facturaCompleta?.estado && (
                    <>
                      {" "}— Estado:{" "}
                      <strong
                        style={{
                          color:
                            facturaCompleta.estado?.toLowerCase() === "pagada"
                              ? "#28a745"
                              : facturaCompleta.estado?.toLowerCase() ===
                                "anulada"
                              ? "#dc3545"
                              : "#ffc107",
                        }}
                      >
                        {facturaCompleta.estado}
                      </strong>
                    </>
                  )}
                </p>
                {facturaCompleta?.estado?.toLowerCase() === "pagada" ||
                facturaCompleta?.estado?.toLowerCase() === "anulada" ? (
                  <p
                    style={{
                      color: "#dc3545",
                      fontSize: "0.85rem",
                      marginBottom: "0.75rem",
                      fontWeight: "500",
                    }}
                  >
                    ⚠️ No se puede actualizar una factura{" "}
                    {facturaCompleta.estado?.toLowerCase()}.
                  </p>
                ) : null}
              </div>

              <label style={{ display: "block", marginBottom: "1rem" }}>
                Número de Factura
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ingrese el número de factura"
                  disabled={
                    saving ||
                    facturaCompleta?.estado?.toLowerCase() === "pagada" ||
                    facturaCompleta?.estado?.toLowerCase() === "anulada"
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    border: "1px solid #d2d5e2",
                    borderRadius: "5px",
                    backgroundColor:
                      facturaCompleta?.estado?.toLowerCase() === "pagada" ||
                      facturaCompleta?.estado?.toLowerCase() === "anulada"
                        ? "#f8f9fa"
                        : "#fff",
                  }}
                />
                <small
                  style={{
                    display: "block",
                    color: "#666",
                    fontSize: "0.75rem",
                    marginTop: "0.25rem",
                  }}
                >
                  El número debe ser único en el sistema.
                </small>
              </label>

              <label style={{ display: "block", marginTop: "0.5rem" }}>
                Cliente
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginTop: "0.25rem",
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={
                      clienteSeleccionado
                        ? `${clienteSeleccionado.nombre}${
                            clienteSeleccionado.nit
                              ? ` (${clienteSeleccionado.nit})`
                              : ""
                          }`
                        : ""
                    }
                    onClick={() => setShowClienteModal(true)}
                    placeholder="Haz clic para buscar cliente..."
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "1px solid #d2d5e2",
                      borderRadius: "5px",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowClienteModal(true)}
                    className="btn-guardar"
                    style={{ whiteSpace: "nowrap", padding: "0.45rem 0.9rem" }}
                    disabled={saving}
                  >
                    Buscar
                  </button>
                </div>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancelar"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-guardar"
                disabled={
                  saving ||
                  !numeroFactura.trim() ||
                  !clienteId ||
                  !clienteSeleccionado ||
                  facturaCompleta?.estado?.toLowerCase() === "pagada" ||
                  facturaCompleta?.estado?.toLowerCase() === "anulada"
                }
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de selección de clientes (reutilizado estilo global) */}
      {showClienteModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 100001 }}
          onClick={() => {
            setClienteSearchModal("");
            setShowClienteModal(false);
          }}
        >
          <div
            className="modal-container"
            style={{
              maxWidth: "900px",
              width: "95vw",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2>Seleccionar Cliente</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setClienteSearchModal("");
                  setShowClienteModal(false);
                }}
              >
                ✕
              </button>
            </header>

            <div
              style={{
                marginBottom: "1rem",
                flexShrink: 0,
                padding: "1.2rem",
              }}
            >
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{
                  width: "100%",
                  fontSize: "1rem",
                  padding: "0.5rem",
                  border: "1px solid #d2d5e2",
                  borderRadius: "5px",
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [
                        c.nombre,
                        c.nit,
                        c.correo,
                        c.ciudad,
                        c.direccion,
                      ]
                        .filter(Boolean)
                        .some((v) =>
                          String(v).toLowerCase().includes(searchTerm)
                        )
                    )
                  : clientes;
                return (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.85rem",
                      color: "#666",
                      textAlign: "right",
                    }}
                  >
                    {filtered.length} cliente
                    {filtered.length !== 1 ? "s" : ""} encontrado
                    {filtered.length !== 1 ? "s" : ""}
                  </div>
                );
              })()}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                border: "1px solid #e6e8f0",
                borderRadius: "8px",
                margin: "0 1.2rem",
                marginBottom: "1.2rem",
              }}
            >
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [
                        c.nombre,
                        c.nit,
                        c.correo,
                        c.ciudad,
                        c.direccion,
                      ]
                        .filter(Boolean)
                        .some((v) =>
                          String(v).toLowerCase().includes(searchTerm)
                        )
                    )
                  : clientes;

                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  if (nombreA === "varios") return -1;
                  if (nombreB === "varios") return 1;
                  return nombreA.localeCompare(nombreB, "es", {
                    sensitivity: "base",
                  });
                });

                if (sorted.length === 0) {
                  return (
                    <div
                      style={{
                        padding: "2rem",
                        color: "#666",
                        textAlign: "center",
                      }}
                    >
                      No se encontraron clientes
                    </div>
                  );
                }

                return (
                  <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                    <table
                      className="table"
                      style={{ tableLayout: "fixed", width: "100%" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Nombre</th>
                          <th style={{ width: "15%" }}>NIT</th>
                          <th style={{ width: "20%" }}>Correo</th>
                          <th style={{ width: "10%" }}>Ciudad</th>
                          <th
                            style={{
                              width: "20%",
                              textAlign: "center",
                            }}
                          >
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => {
                          const handleSelect = () => {
                            setClienteSeleccionado(c);
                            setClienteId(c.id);
                            setClienteSearchModal("");
                            setShowClienteModal(false);
                          };
                          return (
                            <tr
                              key={c.id}
                              style={{
                                transition: "background-color 0.2s",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#f9fbff")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                              onClick={handleSelect}
                              onDoubleClick={handleSelect}
                            >
                              <td
                                title={c.nombre || "-"}
                                style={{
                                  fontWeight: "500",
                                  color: "#1e2753",
                                }}
                              >
                                {c.nombre || "-"}
                              </td>
                              <td title={c.nit || "-"}>{c.nit || "-"}</td>
                              <td title={c.correo || "-"}>{c.correo || "-"}</td>
                              <td title={c.ciudad || "-"}>{c.ciudad || "-"}</td>
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "0.75rem",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect();
                                  }}
                                  className="btn-save"
                                  style={{
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

