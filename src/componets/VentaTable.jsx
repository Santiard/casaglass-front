// src/componets/VentaTable.jsx
import { useState } from "react";
import "../styles/Table.css";

export default function VentaTable({ 
  data = [], 
  loading, 
  isAdmin = false, 
  userSede = "",
  onAgregarProducto
}) {
  const [cantidadesVenta, setCantidadesVenta] = useState({});
  const [preciosSeleccionados, setPreciosSeleccionados] = useState({});

  const isVidrio = (data || []).some(p => (p.categoria || "").toLowerCase() === "vidrio");

  // Funciones para manejar la venta
  const handleCantidadChange = (productId, cantidad) => {
    setCantidadesVenta(prev => ({
      ...prev,
      [productId]: cantidad
    }));
  };

  const handlePrecioChange = (productId, precio) => {
    setPreciosSeleccionados(prev => ({
      ...prev,
      [productId]: precio
    }));
  };

  const handleAgregarCarrito = (producto) => {
    const cantidad = parseInt(cantidadesVenta[producto.id] || 1);
    const precioSeleccionado = preciosSeleccionados[producto.id] || 
      (userSede === "Insula" ? producto.precio1 :
       userSede === "Centro" ? producto.precio2 :
       userSede === "Patios" ? producto.precio3 : producto.precio1);

    if (cantidad > 0 && onAgregarProducto) {
      onAgregarProducto(producto, cantidad, precioSeleccionado);
      // Limpiar valores después de agregar
      setCantidadesVenta(prev => ({ ...prev, [producto.id]: 1 }));
    }
  };

  return (
    <div className="table-wrapper venta-table">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Categoría</th>
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
              <>
                <th>Precio 1</th>
                <th>Precio 2</th>
                <th>Precio 3</th>
                <th>Precio especial</th>
              </>
            ) : (
              <th>Precio</th>
            )}
            
            {/* Columnas específicas de venta */}
            <th>Cantidad</th>
            {isAdmin && <th>Precio a usar</th>}
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={isAdmin ? (isVidrio ? 15 : 12) : (isVidrio ? 13 : 10)} className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? (isVidrio ? 15 : 12) : (isVidrio ? 13 : 10)} className="empty">
                Sin resultados
              </td>
            </tr>
          )}
          {!loading && data.map((p) => {
            const total = Number(p.cantidadTotal || 0) || 
              (Number(p.cantidadInsula || 0) + Number(p.cantidadCentro || 0) + Number(p.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica para validaciones
            const cantidadDisponible = isAdmin ? total : (
              userSede === "Insula" ? Number(p.cantidadInsula || 0) :
              userSede === "Centro" ? Number(p.cantidadCentro || 0) :
              userSede === "Patios" ? Number(p.cantidadPatios || 0) : 0
            );

            // Determinar si la fila debe pintarse de rojo (sin stock)
            const sinStock = isAdmin ? total === 0 : cantidadDisponible === 0;

            return (
              <tr key={p.id} className={sinStock ? "row-sin-stock" : ""}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                {isVidrio && <td>{p.mm ?? "-"}</td>}
                {isVidrio && <td>{p.m1m2 ?? "-"}</td>}
                {isVidrio && <td>{p.laminas ?? "-"}</td>}
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td>{p.cantidadInsula ?? 0}</td>
                    <td>{p.cantidadCentro ?? 0}</td>
                    <td>{p.cantidadPatios ?? 0}</td>
                    <td><strong>{total}</strong></td>
                  </>
                ) : (
                  // Para VENDEDOR: mostrar cantidades de todas las sedes pero sin total
                  <>
                    <td>{p.cantidadInsula ?? 0}</td>
                    <td>{p.cantidadCentro ?? 0}</td>
                    <td>{p.cantidadPatios ?? 0}</td>
                  </>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <>
                    <td>${p.precio1 ?? "-"}</td>
                    <td>${p.precio2 ?? "-"}</td>
                    <td>${p.precio3 ?? "-"}</td>
                    <td>${p.precioEspecial ?? "-"}</td>
                  </>
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
                    max={cantidadDisponible}
                    value={cantidadesVenta[p.id] || 1}
                    onChange={(e) => handleCantidadChange(p.id, e.target.value)}
                    className="cantidad-input"
                    disabled={cantidadDisponible <= 0}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                </td>
                
                {/* Selector de precio (solo para admin) */}
                {isAdmin && (
                  <td>
                    <select
                      value={preciosSeleccionados[p.id] || p.precio1}
                      onChange={(e) => handlePrecioChange(p.id, e.target.value)}
                      className="precio-select"
                      style={{ width: '100px', fontSize: '12px' }}
                    >
                      {p.precio1 && <option value={p.precio1}>P1: ${p.precio1}</option>}
                      {p.precio2 && <option value={p.precio2}>P2: ${p.precio2}</option>}
                      {p.precio3 && <option value={p.precio3}>P3: ${p.precio3}</option>}
                      {p.precioEspecial && <option value={p.precioEspecial}>Esp: ${p.precioEspecial}</option>}
                    </select>
                  </td>
                )}
                
                {/* Botón agregar al carrito */}
                <td>
                  <button
                    onClick={() => handleAgregarCarrito(p)}
                    className="agregar-btn"
                    disabled={cantidadDisponible <= 0 || !cantidadesVenta[p.id] || cantidadesVenta[p.id] <= 0}
                    style={{
                      background: cantidadDisponible > 0 ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: cantidadDisponible > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '12px'
                    }}
                  >
                    Agregar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}