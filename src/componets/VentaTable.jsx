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
  todosLosProductos = [], // Array completo de productos para buscar los del kit
  categoryId = null // ID de la categoría seleccionada (26 = VIDRIO)
}) {
  const [cantidadesVenta, setCantidadesVenta] = useState({});
  const [preciosSeleccionados, setPreciosSeleccionados] = useState({});
  
  // Estado para el producto seleccionado (para mostrar descripción)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Estado para el modal de corte
  const [modalCorte, setModalCorte] = useState({
    isOpen: false,
    producto: null
  });

  const isVidrio = (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");
  // Si la categoría seleccionada es VIDRIO (ID: 26), solo mostrar INSULA
  const isCategoriaVidrio = categoryId === 26;

  // Funciones para manejar la venta
  const handleCantidadChange = (productId, cantidad, esVidrio = false) => {
    setCantidadesVenta(prev => ({
      ...prev,
      [productId]: cantidad === "" ? "" : esVidrio ? cantidad : parseInt(cantidad) || ""
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
    const esVidrio = (producto.categoria || "").toLowerCase() === "vidrio" || producto.esVidrio;
    let cantidad = cantidadesVenta[uniqueKey];
    cantidad = esVidrio ? (parseFloat(cantidad) || 0) : (parseInt(cantidad) || 1);
    cantidad = Math.round(cantidad * 100) / 100;
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

  // Doble clic en la fila: agrega el producto con la cantidad ingresada o 1 por defecto
  const handleRowDoubleClick = (event, producto, uniqueKey) => {
    // Evitar disparar cuando el doble clic fue sobre un input o botón
    const target = event.target;
    if (target?.closest && target.closest("input, button, select, textarea")) return;
    handleAgregarCarrito(producto, uniqueKey);
  };

  // Función para agregar todos los productos del kit al carrito
  const handleAgregarKit = (producto, uniqueKey) => {
    // Obtener la cantidad del input (por defecto 1 si está vacío)
    const cantidad = parseInt(cantidadesVenta[uniqueKey]) || 1;
    
    if (cantidad <= 0) {
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
      return;
    }
    
    // Buscar los productos del kit en el catálogo completo
    // IMPORTANTE: Buscar por código Y color para que coincidan con el producto actual
    const catalogo = todosLosProductos.length > 0 ? todosLosProductos : data;
    
    const productosKit = codigosKit
      .map(codigo => {
        // Buscar producto que coincida en código Y color
        const productoEncontrado = catalogo.find(p => {
          // Normalizar código: convertir a string y limpiar espacios
          const codigoProducto = String(p.codigo || '').trim();
          const codigoBuscado = String(codigo).trim();
          const codigoCoincide = codigoProducto === codigoBuscado;
          
          // Normalizar color: convertir a string, mayúsculas y limpiar espacios
          const colorProducto = String(p.color || '').toUpperCase().trim();
          const colorBuscado = String(colorProductoActual || '').toUpperCase().trim();
          const colorCoincide = colorProducto === colorBuscado;
          
          return codigoCoincide && colorCoincide;
        });
        
        return productoEncontrado;
      })
      .filter(p => p !== undefined && p !== null); // Filtrar productos no encontrados
    
    if (productosKit.length === 0) {
      return;
    }
    
    // Agregar cada producto del kit al carrito con la cantidad especificada
    // Agregar todos los productos del kit uno por uno de forma síncrona
    // Esto asegura que cada actualización de estado se procese antes de la siguiente
    productosKit.forEach((productoKit, index) => {
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
    <div className="table-container">
      <div className={`table-wrapper venta-table ${isCategoriaVidrio ? 'venta-vidrio' : ''} ${!isAdmin ? 'venta-vendedor' : ''}`}>
        <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th style={{ minWidth: '16rem', maxWidth: '24rem' }}>Nombre</th>
            <th>Color</th>
            {isVidrio && <th>mm</th>}
            {isVidrio && <th>m1</th>}
            {isVidrio && <th>m2</th>}
            
            {/* Inventario según el rol */}
            {isAdmin ? (
              <>
                {/* Si la categoría es VIDRIO, solo mostrar INSULA */}
                {isCategoriaVidrio ? (
                  <th>Insula</th>
                ) : (
                  <>
                    <th>Insula</th>
                    <th>Centro</th>
                    <th>Patios</th>
                    <th>Total</th>
                  </>
                )}
              </>
            ) : (
              // Para VENDEDOR: mostrar solo la cantidad de su sede
              <th>Cantidad ({userSede})</th>
            )}
            
            {/* Precios según el rol */}
            {isAdmin ? (
              <th>P. Venta</th>
            ) : (
              <th>P. Venta</th>
            )}
            
            {/* Columnas específicas de venta */}
            <th>Cant</th>
            {/* Ocultar columna Acción si es categoría VIDRIO */}
            {!isCategoriaVidrio && <th>Acción</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={
                isAdmin 
                  ? (isCategoriaVidrio ? (isVidrio ? 7 : 4) : (isVidrio ? 11 : 9))
                  : (isVidrio ? (isCategoriaVidrio ? 7 : 7) : (isCategoriaVidrio ? 4 : 5))
              } className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={
                isAdmin 
                  ? (isCategoriaVidrio ? (isVidrio ? 7 : 4) : (isVidrio ? 11 : 9))
                  : (isVidrio ? (isCategoriaVidrio ? 7 : 7) : (isCategoriaVidrio ? 4 : 5))
              } className="empty">
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
              <tr
                key={uniqueKey}
                className={`${sinStock ? "row-sin-stock" : stockNegativo ? "row-stock-negativo" : ""} ${productoSeleccionado?.id === p.id ? "row-selected" : ""}`}
                onClick={() => setProductoSeleccionado(p)}
                onDoubleClick={(e) => handleRowDoubleClick(e, p, uniqueKey)}
                title="Clic para ver descripción | Doble clic para agregar al carrito"
                style={{ cursor: "pointer" }}
              >
                <td>{p.codigo}</td>
                <td style={{ minWidth: '16rem', maxWidth: '24rem', whiteSpace: 'normal' }}>{p.nombre}</td>
                <td>
                  {p.color ? (
                    <span className={`color-badge color-${(p.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}>{p.color}</span>
                  ) : (
                    <span style={{ color: '#bbb', fontStyle: 'italic' }}>N/A</span>
                  )}
                </td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1 ?? "-"}</td>}
                {isVidrio && <td>{p.m2 ?? "-"}</td>}
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    {/* Si la categoría es VIDRIO, solo mostrar INSULA */}
                    {isCategoriaVidrio ? (
                      <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                        <strong>{p.cantidadInsula ?? 0}</strong>
                        {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> </span>}
                      </td>
                    ) : (
                      <>
                        <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadInsula ?? 0}
                          {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadCentro ?? 0}
                          {Number(p.cantidadCentro || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadPatios ?? 0}
                          {Number(p.cantidadPatios || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={stockNegativo ? "stock-negativo" : ""}>
                          <strong>{total}</strong>
                          {stockNegativo && <span className="badge-negativo">  Faltan {Math.abs(total)}</span>}
                        </td>
                      </>
                    )}
                  </>
                ) : (
                  // Para VENDEDOR: mostrar solo la cantidad de su sede
                  <td className={stockNegativo ? "stock-negativo" : ""}>
                    <strong>{cantidadDisponible}</strong>
                    {stockNegativo && <span className="badge-negativo">  Faltan {Math.abs(cantidadDisponible)}</span>}
                  </td>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <td><strong>
                    {p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-"}
                  </strong></td>
                ) : (
                  <td><strong>
                    {userSede === "Insula" ? (p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-") : 
                      userSede === "Centro" ? (p.precio2 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio2) : "-") :
                      userSede === "Patios" ? (p.precio3 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio3) : "-") : "-"}
                  </strong></td>
                )}
                
                {/* Input de cantidad a vender */}
                <td>
                  <input
                    type="number"
                    min={((p.categoria || "").toLowerCase() === "vidrio" || p.esVidrio) ? "0.01" : "1"}
                    step={((p.categoria || "").toLowerCase() === "vidrio" || p.esVidrio) ? "0.01" : "1"}
                    value={cantidadesVenta[uniqueKey] ?? ""}
                    placeholder={((p.categoria || "").toLowerCase() === "vidrio" || p.esVidrio) ? "0.01" : "1"}
                    onChange={(e) => handleCantidadChange(uniqueKey, e.target.value, (p.categoria || "").toLowerCase() === "vidrio" || p.esVidrio)}
                    className="cantidad-input"
                    style={{ width: '60px', textAlign: 'center' }}
                    title={stockNegativo ? ` Stock negativo: Faltan ${Math.abs(cantidadDisponible)} unidades. Puedes vender anticipadamente.` : ""}
                    pattern={((p.categoria || "").toLowerCase() === "vidrio" || p.esVidrio) ? "^\\d+(\\.\\d{1,2})?$" : undefined}
                  />
                  {stockNegativo && (
                    <small style={{ display: 'block', color: '#ff9800', fontSize: '10px', marginTop: '2px' }}>
 Faltan {Math.abs(cantidadDisponible)}
                    </small>
                  )}
                </td>
                
                {/* Botones de acción - Ocultar si es categoría VIDRIO */}
                {!isCategoriaVidrio && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {p.tipo === "PERFIL" && (
                        <button
                          className="btnLink"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirModalCorte(p);
                          }}
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAgregarKit(p, uniqueKey);
                            }}
                            disabled={!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
                            title={`Agregar ${cantidadKit} kit(s) completo(s) de ${categoriaNombre}`}
                            type="button"
                          >
                            Kit
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      
      {/* Pie de página con descripción */}
      <div className="table-description-footer">
        <div className="table-description-content">
          <span className="table-description-label">Descripción: </span>
          <span className="table-description-text">
            {productoSeleccionado?.descripcion || "Seleccione un producto para ver su descripción"}
          </span>
        </div>
      </div>
      
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