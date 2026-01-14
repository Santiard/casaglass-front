import React, { useEffect, useState, useCallback } from "react";
import { listarClientes } from "../services/ClientesService";
import OrdenesTable from "../componets/OrdenesTable";
import "../styles/Table.css";
import {
  listarOrdenes,
  listarOrdenesTabla,
  crearOrden,
  actualizarOrden,
  anularOrden,
  marcarOrdenComoFacturada,
  confirmarVenta,
  obtenerOrden,
  obtenerOrdenDetalle,
} from "../services/OrdenesService";
import { crearFactura, marcarFacturaComoPagada, obtenerFacturaPorOrden } from "../services/FacturasService";
import { useConfirm } from "../hooks/useConfirm.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getTodayLocalDate } from "../lib/dateUtils.js";

export default function OrdenesPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showSuccess, showError } = useToast();
  const { isAdmin, sedeId } = useAuth(); // Obtener info del usuario logueado
  const [data, setData] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteSearchModal, setClienteSearchModal] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = useCallback(async (page = 1, size = 20, clienteId = null) => {
    setLoading(true);
    try {
      // Si no es admin, filtrar por sede del usuario
      const params = {
        ...(isAdmin ? {} : { sedeId }),
        ...(clienteId ? { clienteId } : {}),
        page: page,
        size: size
      };
      // Usar SIEMPRE el endpoint de tabla con paginación
      const response = await listarOrdenesTabla(params);
      if (response && typeof response === 'object' && 'content' in response) {
        // Respuesta paginada
        const norm = Array.isArray(response.content)
          ? response.content.map((o) => ({
            ...o,
            facturada: Boolean(o.facturada ?? o.factura ?? o.facturaId ?? o.numeroFactura),
          }))
        : [];
        setData(norm);
        setTotalElements(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
        setCurrentPage(response.page || page);
      } else {
        // Respuesta sin paginación (fallback)
        const arr = Array.isArray(response) ? response : [];
        const norm = arr.map((o) => ({
          ...o,
          facturada: Boolean(o.facturada ?? o.factura ?? o.facturaId ?? o.numeroFactura),
        }));
        setData(norm);
        setTotalElements(arr.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [isAdmin, sedeId]);

  // Cargar datos iniciales
  // Cargar clientes al abrir modal de búsqueda
  useEffect(() => {
    if (showClienteModal) {
      listarClientes().then(setClientes);
    }
  }, [showClienteModal]);

  // Cargar datos iniciales y cuando cambia el cliente seleccionado
  useEffect(() => {
    fetchData(1, pageSize, clienteSeleccionado?.id || null);
  }, [isAdmin, sedeId, clienteSeleccionado, pageSize]);

  //  Guardar (editar o crear)
  const handleGuardar = async (orden, isEdit) => {
    try {
      // Si orden es null, solo refrescar (modal ya guardó)
      if (!orden) {
        await fetchData();
        return;
      }

      let updated;
      if (isEdit) {
        updated = await actualizarOrden(orden.id, orden);
      } else {
        updated = await crearOrden(orden);
      }

      await fetchData(); // refrescar tabla
    } catch (e) {
      showError("No se pudo guardar la orden. Revisa consola.");
    }
  };

  //  Confirmar venta (cambiar venta de false a true)
  const handleConfirmarVenta = async (orden) => {
    const esCotizacion = Boolean(orden.venta === false);
    const mensaje = esCotizacion
      ? `¿Estás seguro de que deseas confirmar la cotización #${orden.numero} como venta?\n\nEsta acción marcará la orden como vendida y la convertirá automáticamente en CRÉDITO (ya que no se pueden agregar métodos de pago al confirmar). Luego podrás hacer abonos para pagarla.`
      : `¿Estás seguro de que deseas confirmar la venta de la orden #${orden.numero}?\n\nEsta acción marcará la orden como vendida y permitirá manejarla en contabilidad.`;
    
    const confirmacion = await confirm({
      title: "Confirmar Venta",
      message: mensaje,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      type: "info"
    });
    
    if (!confirmacion) return;
    
    try {
      // Obtener la orden completa antes de confirmarla para asegurar que tenemos todos los datos
      // USAR obtenerOrdenDetalle en lugar de obtenerOrden para tener los productoId completos
      let ordenCompleta = orden;
      try {
        const detalleResponse = await obtenerOrdenDetalle(orden.id);
        // El endpoint detalle puede devolver {orden, items, ...} o directamente la orden
        // Validar la estructura antes de usar
        if (detalleResponse && detalleResponse.orden) {
          ordenCompleta = detalleResponse.orden;
          // Asegurarse de que los items estén en la orden
          if (detalleResponse.items && Array.isArray(detalleResponse.items)) {
            ordenCompleta.items = detalleResponse.items;
          }
        } else if (detalleResponse) {
          // Si la respuesta es directamente la orden
          ordenCompleta = detalleResponse;
        }
      } catch (err) {
        // Continuar con la orden de la tabla si falla
      }
      
      const response = await confirmarVenta(orden.id, ordenCompleta);
      
      if (esCotizacion) {
        showSuccess(`Cotización #${response.numero || orden.numero} confirmada como venta y convertida a CRÉDITO exitosamente. Ahora puedes hacer abonos para pagarla.`);
      } else {
        showSuccess(`Orden #${response.numero || orden.numero} confirmada como venta exitosamente.`);
      }
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo confirmar la venta.";
      showError(msg);
    }
  };

  //  Anular orden
  const handleAnular = async (orden) => {
    const confirmacion = await confirm({
      title: "Anular Orden",
      message: `¿Estás seguro de que deseas anular la orden #${orden.numero}?\n\nEsta acción cambiará el estado de la orden a 'Anulada'.`,
      confirmText: "Anular",
      cancelText: "Cancelar",
      type: "warning"
    });
    
    if (!confirmacion) return;
    
    try {
      const response = await anularOrden(orden.id);
      
      // Mostrar mensaje de éxito
      showSuccess(`Orden #${response.numero} anulada correctamente. Estado: ${response.estado}`);
      
      await fetchData(); // Refrescar tabla
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo anular la orden.";
      showError(msg);
    }
  };

  //  Facturar orden
  const handleFacturar = async (facturaPayload, isModal = false) => {
    try {
      // Si facturaPayload es null, solo refrescar los datos (caso de facturación múltiple)
      if (!facturaPayload) {
        await fetchData();
        return;
      }
      
      let facturaResponse;
      let yaTeniaFactura = false;

      // Crear factura (manejar caso 400: ya existe)
      try {
        facturaResponse = await crearFactura(facturaPayload);
        // Intentar marcarla como pagada inmediatamente
        try {
          if (facturaResponse?.id) {
            const hoy = getTodayLocalDate(); // YYYY-MM-DD
            await marcarFacturaComoPagada(facturaResponse.id, hoy);
          }
        } catch (pagoErr) {
        }
      } catch (err) {
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.error || err?.response?.data?.message || "";
        if (status === 400 && /ya tiene una factura/i.test(String(errMsg))) {
          yaTeniaFactura = true;
          // Intentar obtener la factura por orden y marcarla como pagada
          try {
            const facturaExistente = await obtenerFacturaPorOrden(facturaPayload.ordenId);
            if (facturaExistente?.id) {
              const hoy = getTodayLocalDate(); // YYYY-MM-DD
              await marcarFacturaComoPagada(facturaExistente.id, hoy);
            }
          } catch (lookupErr) {
          }
        } else {
          throw err;
        }
      }

      // Marcar como facturada solo si no falló el paso anterior por "ya tenía"
      try {
        const ordenResponse = await marcarOrdenComoFacturada(facturaPayload.ordenId, true);
        const numeroFactura = facturaResponse?.numeroFactura || ordenResponse?.numeroFactura || facturaResponse?.numero || "";
        if (!yaTeniaFactura) {
          showSuccess(`Factura creada exitosamente. Número: ${numeroFactura || "N/A"}`);
        }
      } catch (err) {
        // Si ya tenía factura, podemos ignorar este error; de lo contrario, reportar
        if (!yaTeniaFactura) {
        }
      }

      // Refrescar tabla de órdenes SIEMPRE
      await fetchData();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || "No se pudo crear la factura.";
      if (!/ya tiene una factura/i.test(String(msg))) {
        showError(msg);
      }
    }
  };

  // Handler para cambios de página desde OrdenesTable
  const handlePageChange = useCallback((newPage, newSize) => {
    if (newSize !== pageSize) {
      setPageSize(newSize);
      setCurrentPage(1);
      fetchData(1, newSize, clienteSeleccionado?.id || null);
    } else {
      setCurrentPage(newPage);
      fetchData(newPage, newSize, clienteSeleccionado?.id || null);
    }
  }, [pageSize, fetchData, clienteSeleccionado]);

  return (
    <div className="clientes-page">
      <div className="rowInferior fill">
        <OrdenesTable
          data={data}
          loading={loading}
          onEditar={handleGuardar}
          onAnular={handleAnular}
          onCrear={(o) => handleGuardar(o, false)}
          onFacturar={handleFacturar}
          onConfirmarVenta={handleConfirmarVenta}
          // Paginación del servidor
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          serverSidePagination={true}
          clienteSeleccionado={clienteSeleccionado}
          setClienteSeleccionado={setClienteSeleccionado}
          setShowClienteModal={setShowClienteModal}
        />
      </div>
      {/* Modal de búsqueda de clientes */}
      {showClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={() => setShowClienteModal(false)}>
          <div className="modal-container" style={{ maxWidth: '600px', width: '95vw', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <header className="modal-header" style={{ background: '#1e2753', color: '#fff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px 8px 0 0' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '600' }}>Buscar Cliente</h2>
              <button className="close-btn" onClick={() => setShowClienteModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </header>
            <div style={{ padding: '1.2rem' }}>
              <input
                type="text"
                value={clienteSearchModal}
                onChange={e => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', border: '1px solid #d2d5e2', borderRadius: '5px', marginBottom: '1rem' }}
                autoFocus
              />
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {clientes.filter(c => {
                  const q = clienteSearchModal.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    c.nombre?.toLowerCase().includes(q) ||
                    c.nit?.toLowerCase().includes(q) ||
                    c.ciudad?.toLowerCase().includes(q) ||
                    c.direccion?.toLowerCase().includes(q) ||
                    c.correo?.toLowerCase().includes(q)
                  );
                }).map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setShowClienteModal(false);
                      setClienteSearchModal("");
                    }}
                    style={{
                      padding: '0.7rem 1rem',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      background: clienteSeleccionado?.id === c.id ? '#e7f3ff' : 'transparent',
                      fontWeight: clienteSeleccionado?.id === c.id ? 600 : 400
                    }}
                  >
                    <span style={{ color: '#1e2753', fontWeight: 500 }}>{c.nombre}</span> <span style={{ color: '#888', fontSize: '0.95em' }}>({c.nit})</span> <span style={{ color: '#888', fontSize: '0.95em' }}>{c.ciudad}</span>
                  </div>
                ))}
                {clientes.length === 0 && (
                  <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>No hay clientes registrados.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
