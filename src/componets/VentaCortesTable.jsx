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
              // Para VENDEDOR: mostrar solo la cantidad de su sede
              <th>Cantidad ({userSede})</th>
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
              <td colSpan={isAdmin ? 11 : 8} className="empty">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 11 : 8} className="empty">
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
            // Solo considerar exactamente 0 como sin stock, los valores negativos son ventas anticipadas
            const sinStock = isAdmin ? total === 0 : cantidadDisponible === 0;
            
            // Determinar si hay stock negativo (venta anticipada)
            const stockNegativo = isAdmin ? total < 0 : cantidadDisponible < 0;

            return (
              <tr key={uniqueKey} className={sinStock ? "row-sin-stock" : stockNegativo ? "row-stock-negativo" : ""}>
                <td>{c.codigo}</td>
                <td>{c.nombre}</td>
                <td>{c.largoCm ?? "-"}</td>
                
                {/* Columnas de inventario según el rol */}
                {isAdmin ? (
                  <>
                    <td className={Number(c.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                      {c.cantidadInsula ?? 0}
                      {Number(c.cantidadInsula || 0) < 0 && <span className="badge-negativo"> </span>}
                    </td>
                    <td className={Number(c.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}>
                      {c.cantidadCentro ?? 0}
                      {Number(c.cantidadCentro || 0) < 0 && <span className="badge-negativo"> </span>}
                    </td>
                    <td className={Number(c.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}>
                      {c.cantidadPatios ?? 0}
                      {Number(c.cantidadPatios || 0) < 0 && <span className="badge-negativo"> </span>}
                    </td>
                    <td className={stockNegativo ? "stock-negativo" : ""}>
                      <strong>{total}</strong>
                      {stockNegativo && <span className="badge-negativo">  Faltan {Math.abs(total)}</span>}
                    </td>
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
                    value={cantidadesVenta[uniqueKey] ?? ""}
                    placeholder="1"
                    onChange={(e) => handleCantidadChange(uniqueKey, e.target.value)}
                    className="cantidad-input"
                    style={{ width: '60px', textAlign: 'center' }}
                    title={stockNegativo ? ` Stock negativo: Faltan ${Math.abs(cantidadDisponible)} unidades. Puedes vender anticipadamente.` : ""}
                  />
                  {stockNegativo && (
                    <small style={{ display: 'block', color: '#ff9800', fontSize: '10px', marginTop: '2px' }}>
 Faltan {Math.abs(cantidadDisponible)}
                    </small>
                  )}
                </td>
                
                {/* Botón agregar al carrito */}
                <td>
                  <button
                    onClick={() => handleAgregarCarrito(c, uniqueKey)}
                    className="agregar-btn"
                    disabled={!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      opacity: (!cantidadesVenta[uniqueKey] || cantidadesVenta[uniqueKey] <= 0) ? 0.5 : 1
                    }}
                    title={stockNegativo ? " Venta anticipada permitida" : ""}
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