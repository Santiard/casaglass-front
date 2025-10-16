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
    const valor = parseInt(cantidad) || "";
    setCantidadesVenta(prev => ({
      ...prev,
      [corteId]: valor
    }));
  };

  const handlePrecioChange = (corteId, precio) => {
    setPreciosSeleccionados(prev => ({
      ...prev,
      [corteId]: precio
    }));
  };

  const handleAgregarCarrito = (corte, uniqueKey) => {
    const cantidad = parseInt(cantidadesVenta[uniqueKey]) || 1;
    // Usar siempre el precio correspondiente a la sede (admin usa precio1, vendedores su sede)
    const precioSeleccionado = isAdmin ? corte.precio1 :
      (userSede === "Insula" ? corte.precio1 :
       userSede === "Centro" ? corte.precio2 :
       userSede === "Patios" ? corte.precio3 : corte.precio1);

    if (cantidad > 0 && onAgregarProducto) {
      onAgregarProducto(corte, cantidad, precioSeleccionado);
      // Limpiar valores después de agregar
      setCantidadesVenta(prev => ({ ...prev, [uniqueKey]: "" }));
    }
  };

  return (
    <div className="table-wrapper venta-table">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
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
              <th>Precio de venta</th>
            ) : (
              <th>Precio de venta</th>
            )}
            
            <th>Observación</th>
            
            {/* Columnas específicas de venta */}
            <th>Cantidad</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={isAdmin ? 11 : 10} className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 11 : 10} className="empty">
                Sin resultados
              </td>
            </tr>
          )}
          {!loading && data.map((c, index) => {
            // Crear una clave única que combine ID, código y índice
            const uniqueKey = `corte-${c.id || 'no-id'}-${c.codigo || 'no-codigo'}-${index}`;
            
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
              <tr key={uniqueKey} className={sinStock ? "row-sin-stock" : ""}>
                <td>{c.codigo}</td>
                <td>{c.nombre}</td>
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
                  <td><strong>${c.precio1 ?? "-"}</strong></td>
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
                    value={cantidadesVenta[uniqueKey] ?? ""}
                    placeholder="1"
                    onChange={(e) => handleCantidadChange(uniqueKey, e.target.value)}
                    className="cantidad-input"
                    disabled={cantidadDisponible <= 0}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                </td>
                
                {/* Botón agregar al carrito */}
                <td>
                  <button
                    onClick={() => handleAgregarCarrito(c, uniqueKey)}
                    className="agregar-btn"
                    disabled={cantidadDisponible <= 0 || !cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
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