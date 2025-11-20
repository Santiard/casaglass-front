// src/componets/VentaTable.jsx
import { useState } from "react";
import "../styles/Table.css";
import CortarModal from "../modals/CortarModal.jsx";
import { obtenerCodigosKit } from "../config/kits.js";

export default function VentaTable({ 
  data = [], 
  loading, 
  isAdmin = false, 
  userSede = "",
  onAgregarProducto,
  onCortarProducto,
  todosLosProductos = [] // Array completo de productos para buscar los del kit
}) {
  const [cantidadesVenta, setCantidadesVenta] = useState({});
  const [preciosSeleccionados, setPreciosSeleccionados] = useState({});
  
  // Estado para el modal de corte
  const [modalCorte, setModalCorte] = useState({
    isOpen: false,
    producto: null
  });

  const isVidrio = (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");

  // Funciones para manejar la venta
  const handleCantidadChange = (productId, cantidad) => {
    setCantidadesVenta(prev => ({
      ...prev,
      [productId]: cantidad === "" ? "" : parseInt(cantidad) || ""
    }));
  };

  const handlePrecioChange = (productId, precio) => {
    setPreciosSeleccionados(prev => ({
      ...prev,
      [productId]: precio
    }));
  };

  // Funciones para manejar el modal de corte
  const handleAbrirModalCorte = (producto) => {
    // Calcular el precio según la sede del usuario
    const precioSegunSede = isAdmin ? producto.precio1 :
      (userSede === "Insula" ? producto.precio1 :
       userSede === "Centro" ? producto.precio2 :
       userSede === "Patios" ? producto.precio3 : producto.precio1);
    
    setModalCorte({
      isOpen: true,
      producto: {
        ...producto,
        precioUsado: precioSegunSede // Agregar el precio calculado
      }
    });
  };

  const handleCerrarModalCorte = () => {
    setModalCorte({
      isOpen: false,
      producto: null
    });
  };

  const handleCortar = async (corteParaVender, corteSobrante) => {
    
    if (onCortarProducto) {
      await onCortarProducto(corteParaVender, corteSobrante);
    }
  };

  const handleAgregarCarrito = (producto, uniqueKey) => {
    const cantidad = parseInt(cantidadesVenta[uniqueKey]) || 1;
    // Usar siempre el precio correspondiente a la sede (admin usa precio1, vendedores su sede)
    const precioSeleccionado = isAdmin ? producto.precio1 :
      (userSede === "Insula" ? producto.precio1 :
       userSede === "Centro" ? producto.precio2 :
       userSede === "Patios" ? producto.precio3 : producto.precio1);

    if (cantidad > 0 && onAgregarProducto) {
      onAgregarProducto(producto, cantidad, precioSeleccionado);
      // Limpiar valores después de agregar
      setCantidadesVenta(prev => ({ ...prev, [uniqueKey]: "" }));
    }
  };

  // Función para agregar todos los productos del kit al carrito
  const handleAgregarKit = (producto, uniqueKey) => {
    // Obtener la cantidad del input (por defecto 1 si está vacío)
    const cantidad = parseInt(cantidadesVenta[uniqueKey]) || 1;
    
    if (cantidad <= 0) {
      console.warn("La cantidad debe ser mayor a 0");
      return;
    }
    
    // Obtener el nombre de la categoría (puede venir como string o como objeto)
    const categoriaNombre = typeof producto.categoria === 'string' 
      ? producto.categoria 
      : (producto.categoria?.nombre || '');
    
    // Obtener el código y color del producto actual para buscar productos del mismo color
    const codigoProductoActual = producto.codigo || '';
    const colorProductoActual = producto.color || '';
    
    // Obtener los códigos de productos que componen el kit
    const codigosKit = obtenerCodigosKit(categoriaNombre);
    
    if (codigosKit.length === 0) {
      console.warn(`No hay productos configurados para el kit de categoría: ${categoriaNombre}`);
      return;
    }
    
    // Buscar los productos del kit en el catálogo completo
    // IMPORTANTE: Buscar por código Y color para que coincidan con el producto actual
    const productosKit = codigosKit
      .map(codigo => {
        // Buscar en todosLosProductos primero, si no está, buscar en data (productos filtrados)
        const catalogo = todosLosProductos.length > 0 ? todosLosProductos : data;
        
        // Buscar producto que coincida en código Y color
        const productoEncontrado = catalogo.find(p => {
          const codigoCoincide = (p.codigo || '').toString() === codigo.toString();
          const colorCoincide = (p.color || '').toUpperCase() === colorProductoActual.toUpperCase();
          return codigoCoincide && colorCoincide;
        });
        
        return productoEncontrado;
      })
      .filter(p => p !== undefined); // Filtrar productos no encontrados
    
    if (productosKit.length === 0) {
      console.warn(`No se encontraron productos del kit para la categoría ${categoriaNombre} con código ${codigoProductoActual} y color ${colorProductoActual}`);
      return;
    }
    
    // Agregar cada producto del kit al carrito con la cantidad especificada
    productosKit.forEach(productoKit => {
      const precioSeleccionado = isAdmin ? productoKit.precio1 :
        (userSede === "Insula" ? productoKit.precio1 :
         userSede === "Centro" ? productoKit.precio2 :
         userSede === "Patios" ? productoKit.precio3 : productoKit.precio1);
      
      if (onAgregarProducto) {
        onAgregarProducto(productoKit, cantidad, precioSeleccionado);
      }
    });
    
    // Limpiar el input de cantidad después de agregar
    setCantidadesVenta(prev => ({ ...prev, [uniqueKey]: "" }));
    
  };

  return (
    <div className="table-wrapper venta-table">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            {isVidrio && <th>mm</th>}
            {isVidrio && <th>m²</th>}
            {isVidrio && <th>Láminas</th>}
            
            {/* Inventario según el rol */}
            {isAdmin ? (
              <>
                <th>Insula</th>
                <th>Centro</th>
                <th>Patios</th>
                <th>Total</th>
              </>
            ) : (
              // Para VENDEDOR: mostrar cantidades de todas las sedes pero sin total
              <>
                <th>Insula</th>
                <th>Centro</th>
                <th>Patios</th>
              </>
            )}
            
            {/* Precios según el rol */}
            {isAdmin ? (
              <th>P. Venta</th>
            ) : (
              <th>P. Venta</th>
            )}
            
            {/* Columnas específicas de venta */}
            <th>Cant</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={isAdmin ? (isVidrio ? 12 : 9) : (isVidrio ? 11 : 8)} className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? (isVidrio ? 12 : 9) : (isVidrio ? 11 : 8)} className="empty">
                Sin resultados
              </td>
            </tr>
          )}
          {!loading && data.map((p, index) => {
            // Crear una clave única que combine ID, código y índice
            const uniqueKey = `${p.id || 'no-id'}-${p.codigo || 'no-codigo'}-${index}`;
            
            const total = Number(p.cantidadTotal || 0) || 
              (Number(p.cantidadInsula || 0) + Number(p.cantidadCentro || 0) + Number(p.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica para validaciones
            const cantidadDisponible = isAdmin ? total : (
              userSede === "Insula" ? Number(p.cantidadInsula || 0) :
              userSede === "Centro" ? Number(p.cantidadCentro || 0) :
              userSede === "Patios" ? Number(p.cantidadPatios || 0) : 0
            );

            // Determinar si la fila debe pintarse de rojo (sin stock)
            // Solo considerar exactamente 0 como sin stock, los valores negativos son ventas anticipadas
            const sinStock = isAdmin ? total === 0 : cantidadDisponible === 0;
            
            // Determinar si hay stock negativo (venta anticipada)
            const stockNegativo = isAdmin ? total < 0 : cantidadDisponible < 0;

            return (
              <tr key={uniqueKey} className={sinStock ? "row-sin-stock" : stockNegativo ? "row-stock-negativo" : ""}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1m2 ?? "-"}</td>}
                {isVidrio && <td>{p.laminas ?? "-"}</td>}
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadInsula ?? 0}
                      {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                    <td className={Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadCentro ?? 0}
                      {Number(p.cantidadCentro || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                    <td className={Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadPatios ?? 0}
                      {Number(p.cantidadPatios || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                    <td className={stockNegativo ? "stock-negativo" : ""}>
                      <strong>{total}</strong>
                      {stockNegativo && <span className="badge-negativo"> ⚠️ Faltan {Math.abs(total)}</span>}
                    </td>
                  </>
                ) : (
                  // Para VENDEDOR: mostrar cantidades de todas las sedes pero sin total
                  <>
                    <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadInsula ?? 0}
                      {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                    <td className={Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadCentro ?? 0}
                      {Number(p.cantidadCentro || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                    <td className={Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}>
                      {p.cantidadPatios ?? 0}
                      {Number(p.cantidadPatios || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                    </td>
                  </>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <td><strong>${p.precio1 ?? "-"}</strong></td>
                ) : (
                  <td><strong>
                    ${userSede === "Insula" ? (p.precio1 ?? "-") : 
                      userSede === "Centro" ? (p.precio2 ?? "-") :
                      userSede === "Patios" ? (p.precio3 ?? "-") : "-"}
                  </strong></td>
                )}
                
                {/* Input de cantidad a vender */}
                <td>
                  <input
                    type="number"
                    min="1"
                    value={cantidadesVenta[uniqueKey] ?? ""}
                    placeholder="1"
                    onChange={(e) => handleCantidadChange(uniqueKey, e.target.value)}
                    className="cantidad-input"
                    style={{ width: '60px', textAlign: 'center' }}
                    title={stockNegativo ? `⚠️ Stock negativo: Faltan ${Math.abs(cantidadDisponible)} unidades. Puedes vender anticipadamente.` : ""}
                  />
                  {stockNegativo && (
                    <small style={{ display: 'block', color: '#ff9800', fontSize: '10px', marginTop: '2px' }}>
                      ⚠️ Faltan {Math.abs(cantidadDisponible)}
                    </small>
                  )}
                </td>
                
                {/* Botones de acción */}
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => handleAgregarCarrito(p, uniqueKey)}
                      className="btnLink"
                      disabled={!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
                      title={stockNegativo ? "⚠️ Venta anticipada permitida" : ""}
                    >
                      Agregar
                    </button>
                    {p.tipo === "PERFIL" && (
                      <button
                        className="btnLink"
                        onClick={() => handleAbrirModalCorte(p)}
                      >
                        Cortar
                      </button>
                    )}
                    {/* Botón Kit solo para categorías específicas */}
                    {(() => {
                      // Obtener el nombre de la categoría (puede venir como string o como objeto)
                      const categoriaNombre = typeof p.categoria === 'string' 
                        ? p.categoria 
                        : (p.categoria?.nombre || '');
                      
                      // Categorías permitidas para mostrar el botón Kit
                      const categoriasPermitidas = ['5020', '744', '7038', '8025'];
                      const mostrarKit = categoriasPermitidas.includes(categoriaNombre);
                      
                      const cantidadKit = parseInt(cantidadesVenta[uniqueKey]) || 1;
                      
                      return mostrarKit ? (
                        <button
                          className="btnLink"
                          onClick={() => handleAgregarKit(p, uniqueKey)}
                          disabled={!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
                          title={`Agregar ${cantidadKit} kit(s) completo(s) de ${categoriaNombre}`}
                        >
                          Kit
                        </button>
                      ) : null;
                    })()}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Modal de Corte */}
      <CortarModal
        isOpen={modalCorte.isOpen}
        onClose={handleCerrarModalCorte}
        producto={modalCorte.producto}
        onCortar={handleCortar}
      />
    </div>
  );
}