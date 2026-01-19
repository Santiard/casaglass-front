import { useState, useEffect } from "react";
import OrdenModal from "../modals/OrdenModal.jsx";
import OrdenImprimirModal from "../modals/OrdenImprimirModal.jsx";
import "../styles/ListadoOrden.css";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ListadoOrden({ productosCarrito, subtotal, total, limpiarCarrito, eliminarProducto, actualizarCantidad, cortesPendientes, inventarioCompleto = [], cortesCompletos = [] }) {
  const { showError } = useToast();
  const [items, setItems] = useState([]);
  const [isFacturarOpen, setIsFacturarOpen] = useState(false);
  const [isImprimirOpen, setIsImprimirOpen] = useState(false);
  const [ordenTemporal, setOrdenTemporal] = useState(null);
  const { user, sedeId, sede } = useAuth();
  // Cargar productos desde props
  useEffect(() => {
    setItems(productosCarrito || []);
  }, [productosCarrito]);


  // --- Nueva función para imprimir precios de TODO el inventario y cortes ---
  const handleImprimirPrecios = () => {
    // Generar HTML para impresión
    const productos = Array.isArray(inventarioCompleto) ? inventarioCompleto : [];
    const cortes = Array.isArray(cortesCompletos) ? cortesCompletos : [];

    // Función para formatear precios y cantidades
    const fmt = (n) => n != null ? Number(n).toLocaleString('es-CO') : '';

    // Tabla de productos
    const productosRows = productos.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')).map(p => `
      <tr>
        <td>${p.codigo || ''}</td>
        <td>${p.nombre || ''}</td>
        <td>${p.color || ''}</td>
        <td>${fmt(p.cantidadInsula)}</td>
        <td>${fmt(p.cantidadCentro)}</td>
        <td>${fmt(p.cantidadPatios)}</td>
        <td><b>${fmt((+p.cantidadInsula||0)+(+p.cantidadCentro||0)+(+p.cantidadPatios||0))}</b></td>
        <td>${fmt(p.precioInsula || p.precio1 || p.precio || 0)}</td>
        <td>${fmt(p.precioCentro || p.precio2 || 0)}</td>
        <td>${fmt(p.precioPatios || p.precio3 || 0)}</td>
      </tr>`).join('');

    // Tabla de cortes
    const cortesRows = cortes.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')).map(c => `
      <tr>
        <td>${c.codigo || ''}</td>
        <td>${c.nombre || ''}</td>
        <td>${c.color || ''}</td>
        <td>${fmt(c.cantidadInsula)}</td>
        <td>${fmt(c.cantidadCentro)}</td>
        <td>${fmt(c.cantidadPatios)}</td>
        <td><b>${fmt((+c.cantidadInsula||0)+(+c.cantidadCentro||0)+(+c.cantidadPatios||0))}</b></td>
        <td>${fmt(c.precioInsula || c.precio1 || c.precio || 0)}</td>
        <td>${fmt(c.precioCentro || c.precio2 || 0)}</td>
        <td>${fmt(c.precioPatios || c.precio3 || 0)}</td>
      </tr>`).join('');

    const html = `
      <html>
      <head>
        <title>Listado de Precios</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { margin-top: 2rem; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
          th, td { border: 1px solid #888; padding: 4px 8px; font-size: 13px; }
          th { background: #f0f0f0; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Listado de Precios - Inventario Completo</h1>
        <h2>Productos</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Color</th><th>Insula</th><th>Centro</th><th>Patios</th><th>Total</th><th>P. Insula</th><th>P. Centro</th><th>P. Patios</th>
            </tr>
          </thead>
          <tbody>
            ${productosRows}
          </tbody>
        </table>
        <h2>Cortes</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Color</th><th>Insula</th><th>Centro</th><th>Patios</th><th>Total</th><th>P. Insula</th><th>P. Centro</th><th>P. Patios</th>
            </tr>
          </thead>
          <tbody>
            ${cortesRows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => { window.close(); }, 5000);
          };
        </script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // Crear objeto orden temporal para el modal de impresión (solo usado para imprimir precios)
  const ordenTemporalPrecios = {
    id: null,
    numero: "COT-" + Date.now(),
    fecha: new Date().toISOString(),
    obra: "",
    venta: false,
    credito: false,
    estado: "ACTIVA",
    cliente: { nombre: "Cliente" }, // Se puede mejorar después
    sede: { nombre: sede || "Sede" },
    trabajador: { nombre: user?.nombre || "Trabajador" },
    items: items.map(item => ({
      id: null,
      cantidad: item.cantidadVender || 0,
      precioUnitario: item.precioUsado || 0,
      totalLinea: (item.precioUsado || 0) * (item.cantidadVender || 0),
      descripcion: "",
      producto: {
        codigo: item.codigo || "",
        nombre: item.nombre || "",
        color: item.color || "",
        tipo: item.tipo || ""
      }
    }))
  };

  const eliminarProductoLocal = (index) => {
    eliminarProducto(index);
  };

  return (
    <div className="listado-orden">
      <div className="orden-header">
        <h3>Listado de Orden</h3>
        <span className="item-count">({items.length} productos)</span>
      </div>

      <div className="orden-content">
        {items.length === 0 ? (
          <div className="empty-orden">
            <p>No hay productos agregados</p>
            <small>Agrega productos desde la tabla para crear una orden</small>
          </div>
        ) : (
          <div className="productos-lista">
            {items.map((item, index) => (
              <div key={index} className="producto-item">
                <div className="producto-info">
                  <h4>{item.nombre}</h4>
                  <p className="codigo">Código: {item.codigo}</p>
                  {item.color && item.color !== 'N/A' && (
                    <p className="color-info" style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                      Color: <span className={`color-badge color-${item.color.toLowerCase().replace(/\s+/g, '-')}`}>{item.color}</span>
                    </p>
                  )}
                  <div className="cantidad-precio">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Cantidad:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidadVender || 1}
                        onChange={(e) => {
                          const nuevaCantidad = e.target.value;
                          if (actualizarCantidad) {
                            actualizarCantidad(index, nuevaCantidad);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        style={{
                          width: '60px',
                          padding: '0.25rem',
                          textAlign: 'center',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}
                        title="Editar cantidad"
                      />
                    </div>
                    <span>Precio: ${item.precioUsado?.toLocaleString()}</span>
                  </div>
                  <div className="subtotal-item">
                    Subtotal: ${(item.precioUsado * item.cantidadVender)?.toLocaleString()}
                  </div>
                </div>
                <button 
                  className="btn-eliminar"
                  onClick={() => eliminarProductoLocal(index)}
                  title="Eliminar producto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="orden-resumen">
        <div className="totales">
          <div className="subtotal">
            <span>Subtotal (sin IVA):</span>
            <span>${total ? ((total * 0.81)?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : 0}</span>
          </div>
          <div className="iva">
            <span>IVA (19%):</span>
            <span>${total ? ((total * 0.19)?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : 0}</span>
          </div>
          <div className="total">
            <span>Total (IVA incluido):</span>
            <span>${total?.toLocaleString()}</span>
          </div>
        </div>

        <div className="orden-acciones">
          <button 
            className="btn-facturar"
            onClick={() => setIsFacturarOpen(true)}
            disabled={items.length === 0}
          >
            Crear Orden
          </button>
          <button 
            className="btn-imprimir"
            onClick={handleImprimirPrecios}
          >
            Imprimir Precios
          </button>
        </div>
      </div>

      <OrdenModal
        isOpen={isFacturarOpen}
        onClose={() => setIsFacturarOpen(false)}
        orden={null}
        productosCarrito={items}
        defaultTrabajadorId={user?.id}
        defaultTrabajadorNombre={user?.nombre}
        defaultSedeId={sedeId}
        defaultSedeNombre={user?.sedeNombre || sede}
        cortesPendientes={cortesPendientes}
        onSave={(orden) => {
          limpiarCarrito();
          setIsFacturarOpen(false);
        }}
        onImprimir={async (ordenCreada) => {
          try {
            // La respuesta del backend puede venir como { orden: {...}, numero: ..., mensaje: ... }
            // o directamente como la orden
            const ordenId = ordenCreada.orden?.id || ordenCreada.id;
            
            if (!ordenId) {
              // Si no hay ID, usar los datos básicos
              setOrdenTemporal(ordenCreada.orden || ordenCreada);
              setIsImprimirOpen(true);
              return;
            }
            
            // Obtener la orden detallada para imprimir
            const { obtenerOrdenDetalle } = await import("../services/OrdenesService.js");
            const ordenDetallada = await obtenerOrdenDetalle(ordenId);
            setOrdenTemporal(ordenDetallada);
            setIsImprimirOpen(true);
          } catch (error) {
            // Si falla obtener detalle, usar la orden básica (puede venir en ordenCreada.orden o directamente)
            const ordenParaImprimir = ordenCreada.orden || ordenCreada;
            setOrdenTemporal(ordenParaImprimir);
            setIsImprimirOpen(true);
          }
        }}
      />

      <OrdenImprimirModal
        isOpen={isImprimirOpen}
        orden={ordenTemporal}
        onClose={() => {
          setIsImprimirOpen(false);
          setOrdenTemporal(null);
        }}
      />

    </div>
  );
}