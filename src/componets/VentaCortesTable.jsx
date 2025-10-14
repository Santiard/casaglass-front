// src/componets/VentaCortesTable.jsx
import { useState } from "react";
import "../styles/Table.css";

export default function VentaCortesTable({ 
  data = [], 
  loading, 
  isAdmin = false, 
  userSede = "",
  onAgregarProducto
}) {
  const [cantidadesVenta, setCantidadesVenta] = useState({});
  const [preciosSeleccionados, setPreciosSeleccionados] = useState({});

  // Funciones para manejar la venta
  const handleCantidadChange = (corteId, cantidad) => {
    setCantidadesVenta(prev => ({
      ...prev,
      [corteId]: cantidad
    }));
  };

  const handlePrecioChange = (corteId, precio) => {
    setPreciosSeleccionados(prev => ({
      ...prev,
      [corteId]: precio
    }));
  };

  const handleAgregarCarrito = (corte) => {
    const cantidad = parseInt(cantidadesVenta[corte.id] || 1);
    const precioSeleccionado = preciosSeleccionados[corte.id] || 
      (userSede === "Insula" ? corte.precio1 :
       userSede === "Centro" ? corte.precio2 :
       userSede === "Patios" ? corte.precio3 : corte.precio1);

    if (cantidad > 0 && onAgregarProducto) {
      onAgregarProducto(corte, cantidad, precioSeleccionado);
      // Limpiar valores después de agregar
      setCantidadesVenta(prev => ({ ...prev, [corte.id]: 1 }));
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
            <th>Largo (cm)</th>
            
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
            
            <th>Observación</th>
            
            {/* Columnas específicas de venta */}
            <th>Cantidad</th>
            {isAdmin && <th>Precio a usar</th>}
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={isAdmin ? 15 : 12} className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 15 : 12} className="empty">
                Sin resultados
              </td>
            </tr>
          )}
          {!loading && data.map((c) => {
            const total = Number(c.cantidadTotal || 0) || 
              (Number(c.cantidadInsula || 0) + Number(c.cantidadCentro || 0) + Number(c.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica para validaciones
            const cantidadDisponible = isAdmin ? total : (
              userSede === "Insula" ? Number(c.cantidadInsula || 0) :
              userSede === "Centro" ? Number(c.cantidadCentro || 0) :
              userSede === "Patios" ? Number(c.cantidadPatios || 0) : 0
            );

            // Determinar si la fila debe pintarse de rojo (sin stock)
            const sinStock = isAdmin ? total === 0 : cantidadDisponible === 0;

            return (
              <tr key={c.id} className={sinStock ? "row-sin-stock" : ""}>
                <td>{c.codigo}</td>
                <td>{c.nombre}</td>
                <td>{c.categoria}</td>
                <td>{c.largoCm ?? "-"}</td>
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td>{c.cantidadInsula ?? 0}</td>
                    <td>{c.cantidadCentro ?? 0}</td>
                    <td>{c.cantidadPatios ?? 0}</td>
                    <td><strong>{total}</strong></td>
                  </>
                ) : (
                  // Para VENDEDOR: mostrar cantidades de todas las sedes pero sin total
                  <>
                    <td>{c.cantidadInsula ?? 0}</td>
                    <td>{c.cantidadCentro ?? 0}</td>
                    <td>{c.cantidadPatios ?? 0}</td>
                  </>
                )}
                
                {/* Precios según el rol */}
                {isAdmin ? (
                  <>
                    <td>${c.precio1 ?? "-"}</td>
                    <td>${c.precio2 ?? "-"}</td>
                    <td>${c.precio3 ?? "-"}</td>
                    <td>${c.precioEspecial ?? "-"}</td>
                  </>
                ) : (
                  <td><strong>
                    ${userSede === "Insula" ? (c.precio1 ?? "-") : 
                      userSede === "Centro" ? (c.precio2 ?? "-") :
                      userSede === "Patios" ? (c.precio3 ?? "-") : "-"}
                  </strong></td>
                )}
                
                <td>{c.observacion || "-"}</td>
                
                {/* Input de cantidad a vender */}
                <td>
                  <input
                    type="number"
                    min="1"
                    max={cantidadDisponible}
                    value={cantidadesVenta[c.id] || 1}
                    onChange={(e) => handleCantidadChange(c.id, e.target.value)}
                    className="cantidad-input"
                    disabled={cantidadDisponible <= 0}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                </td>
                
                {/* Selector de precio (solo para admin) */}
                {isAdmin && (
                  <td>
                    <select
                      value={preciosSeleccionados[c.id] || c.precio1}
                      onChange={(e) => handlePrecioChange(c.id, e.target.value)}
                      className="precio-select"
                      style={{ width: '100px', fontSize: '12px' }}
                    >
                      {c.precio1 && <option value={c.precio1}>P1: ${c.precio1}</option>}
                      {c.precio2 && <option value={c.precio2}>P2: ${c.precio2}</option>}
                      {c.precio3 && <option value={c.precio3}>P3: ${c.precio3}</option>}
                      {c.precioEspecial && <option value={c.precioEspecial}>Esp: ${c.precioEspecial}</option>}
                    </select>
                  </td>
                )}
                
                {/* Botón agregar al carrito */}
                <td>
                  <button
                    onClick={() => handleAgregarCarrito(c)}
                    className="agregar-btn"
                    disabled={cantidadDisponible <= 0 || !cantidadesVenta[c.id] || cantidadesVenta[c.id] <= 0}
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