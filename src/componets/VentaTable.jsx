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
  
  // Estado para el modal de corte
  const [modalCorte, setModalCorte] = useState({
    isOpen: false,
    producto: null
  });

  const isVidrio = (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");
  // Si la categoría seleccionada es VIDRIO (ID: 26), solo mostrar INSULA
  const isCategoriaVidrio = categoryId === 26;

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
    console.log("🔧 DEBUG handleAgregarKit - Inicio");
    console.log("Producto recibido:", producto);
    console.log("Producto completo:", JSON.stringify(producto, null, 2));
    console.log("uniqueKey:", uniqueKey);
    
    // Obtener la cantidad del input (por defecto 1 si está vacío)
    const cantidad = parseInt(cantidadesVenta[uniqueKey]) || 1;
    console.log("Cantidad:", cantidad);
    
    if (cantidad <= 0) {
      console.warn("La cantidad debe ser mayor a 0");
      return;
    }
    
    // Obtener el nombre de la categoría (puede venir como string o como objeto)
    const categoriaNombre = typeof producto.categoria === 'string' 
      ? producto.categoria 
      : (producto.categoria?.nombre || '');
    console.log("Categoría extraída:", categoriaNombre);
    
    // Obtener el código y color del producto actual para buscar productos del mismo color
    const codigoProductoActual = producto.codigo || '';
    const colorProductoActual = producto.color || '';
    console.log("Código producto actual:", codigoProductoActual);
    console.log("Color producto actual:", colorProductoActual);
    
    // Obtener los códigos de productos que componen el kit
    const codigosKit = obtenerCodigosKit(categoriaNombre);
    console.log("Códigos del kit obtenidos:", codigosKit);
    
    if (codigosKit.length === 0) {
      console.warn(`No hay productos configurados para el kit de categoría: ${categoriaNombre}`);
      return;
    }
    
    // Buscar los productos del kit en el catálogo completo
    // IMPORTANTE: Buscar por código Y color para que coincidan con el producto actual
    const catalogo = todosLosProductos.length > 0 ? todosLosProductos : data;
    console.log("Catálogo usado:", catalogo.length > 0 ? `todosLosProductos (${todosLosProductos.length} items)` : `data (${data.length} items)`);
    console.log("Primeros 3 productos del catálogo:", catalogo.slice(0, 3).map(p => ({ codigo: p.codigo, color: p.color, categoria: p.categoria })));
    
    const productosKit = codigosKit
      .map(codigo => {
        console.log(`Buscando código: ${codigo}`);
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
          
          console.log(`  - Producto: ${codigoProducto} (${colorProducto}) - Código coincide: ${codigoCoincide}, Color coincide: ${colorCoincide}`);
          
          return codigoCoincide && colorCoincide;
        });
        
        if (productoEncontrado) {
          console.log(`  ✅ Encontrado: ${productoEncontrado.codigo} - ${productoEncontrado.nombre} (Color: ${productoEncontrado.color})`);
        } else {
          console.log(`  ❌ No encontrado para código ${codigo} con color ${colorProductoActual}`);
          // Intentar buscar sin filtro de color para debug
          const sinColor = catalogo.find(p => String(p.codigo || '').trim() === String(codigo).trim());
          if (sinColor) {
            console.log(`  ⚠️  Producto encontrado SIN color: ${sinColor.codigo} - Color del producto: ${sinColor.color}, Color buscado: ${colorProductoActual}`);
          }
        }
        
        return productoEncontrado;
      })
      .filter(p => p !== undefined && p !== null); // Filtrar productos no encontrados
    
    console.log("Productos del kit encontrados:", productosKit.length);
    console.log("Productos encontrados:", productosKit.map(p => ({ codigo: p.codigo, nombre: p.nombre, color: p.color })));
    
    if (productosKit.length === 0) {
      console.warn(`No se encontraron productos del kit para la categoría ${categoriaNombre} con código ${codigoProductoActual} y color ${colorProductoActual}`);
      return;
    }
    
    // Agregar cada producto del kit al carrito con la cantidad especificada
    console.log("Agregando productos al carrito...");
    console.log(`Cantidad de kits a agregar: ${cantidad}`);
    console.log(`Productos en el kit: ${productosKit.length}`);
    
    // Agregar todos los productos del kit uno por uno de forma síncrona
    // Esto asegura que cada actualización de estado se procese antes de la siguiente
    productosKit.forEach((productoKit, index) => {
      const precioSeleccionado = isAdmin ? productoKit.precio1 :
        (userSede === "Insula" ? productoKit.precio1 :
         userSede === "Centro" ? productoKit.precio2 :
         userSede === "Patios" ? productoKit.precio3 : productoKit.precio1);
      
      console.log(`  [${index + 1}/${productosKit.length}] Agregando: ${productoKit.codigo} - ${productoKit.nombre} (Cantidad: ${cantidad}, Precio: ${precioSeleccionado})`);
      
      if (onAgregarProducto) {
        console.log(`    → Llamando onAgregarProducto para ${productoKit.codigo} con cantidad ${cantidad}`);
        onAgregarProducto(productoKit, cantidad, precioSeleccionado);
      } else {
        console.error("❌ onAgregarProducto no está definido!");
      }
    });
    
    console.log(`✅ Kit agregado correctamente - ${productosKit.length} productos agregados`);
    
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
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={
                isAdmin 
                  ? (isCategoriaVidrio ? (isVidrio ? 8 : 5) : (isVidrio ? 12 : 9))
                  : (isVidrio ? 8 : 5)
              } className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={
                isAdmin 
                  ? (isCategoriaVidrio ? (isVidrio ? 8 : 5) : (isVidrio ? 12 : 9))
                  : (isVidrio ? 8 : 5)
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
              <tr key={uniqueKey} className={sinStock ? "row-sin-stock" : stockNegativo ? "row-stock-negativo" : ""}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1m2 ?? "-"}</td>}
                {isVidrio && <td>{p.laminas ?? "-"}</td>}
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    {/* Si la categoría es VIDRIO, solo mostrar INSULA */}
                    {isCategoriaVidrio ? (
                      <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                        <strong>{p.cantidadInsula ?? 0}</strong>
                        {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> ⚠️</span>}
                      </td>
                    ) : (
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
                    )}
                  </>
                ) : (
                  // Para VENDEDOR: mostrar solo la cantidad de su sede
                  <td className={stockNegativo ? "stock-negativo" : ""}>
                    <strong>{cantidadDisponible}</strong>
                    {stockNegativo && <span className="badge-negativo"> ⚠️ Faltan {Math.abs(cantidadDisponible)}</span>}
                  </td>
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAgregarCarrito(p, uniqueKey);
                      }}
                      className="btnLink"
                      disabled={!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
                      title={stockNegativo ? "⚠️ Venta anticipada permitida" : ""}
                      type="button"
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("🔘 Botón Kit clickeado - Producto:", p);
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