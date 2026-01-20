// src/componets/InventoryTable.jsx
import "../styles/Table.css"
import { useState } from "react";
import eliminar from "../assets/eliminar.png";
import editar from "../assets/editar.png";

export default function InventoryTable({ data = [], filters, loading, onEditar, onEliminar, isAdmin = true, userSede = "", selectedCategoryId = null, categories = [] }) {
  // Estado para el producto seleccionado (para mostrar descripción)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Detectar si la categoría seleccionada es VIDRIO
  // IMPORTANTE: Solo usar la categoría seleccionada para determinar si mostrar columnas de vidrio
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const isVidrio = selectedCategory?.nombre?.toUpperCase().trim() === "VIDRIO";

  // Agregar clase para identificar si es admin o vendedor en CSS
  const tableClassName = `table ${isVidrio ? 'vidrio-table' : ''} ${isAdmin ? 'admin-table' : 'vendedor-table'}`;

  // Función helper para formatear precio
  const fmtPrice = (precio) => {
    return precio ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precio) : "-";
  };

  // Función helper para formatear cantidad
  const fmtCantidad = (cantidad) => {
    if (cantidad === undefined || cantidad === null) return '0';
    return Number(cantidad) % 1 === 0 ? Number(cantidad).toFixed(0) : Number(cantidad).toFixed(2);
  };

  return (
    <div className="table-container">
      {/* Vista de tabla (desktop) */}
      <div className="table-wrapper">
        <table className={tableClassName}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th className="th-color">Color</th>
            {isVidrio ? (
              <>
                <th style={{ width: '8%' }}>mm</th>
                <th style={{ width: '10%' }}>m1</th>
                <th style={{ width: '10%' }}>m2</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Cantidad</th>
                {isAdmin && (
                  <th style={{ width: '15%' }}>Costo</th>
                )}
                <th style={{ width: '20%' }}>Precio</th>
              </>
            ) : (
              <>
                {isAdmin ? (
                  <>
                    <th>Insula</th>
                    <th>Centro</th>
                    <th>Patios</th>
                    <th>Total</th>
                  </>
                ) : (
                  <th>Cantidad ({userSede})</th>
                )}
                {isAdmin && <th>Costo</th>}
                {isAdmin ? (
                  <>
                    <th className="precio-principal">Precio</th>
                    <th className="precio-secundario">P. Centro</th>
                    <th className="precio-secundario">P. Patios</th>
                  </>
                ) : (
                  <th>Precio</th>
                )}
              </>
            )}
            <th
              style={isVidrio
                ? { width: '90px', minWidth: '90px', textAlign: 'center' }
                : { width: '120px', textAlign: 'center' }
              }
            >Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 10 : 13) : (isVidrio ? 6 : 6)} className="empty">Cargando…</td></tr>
          )}
          {!loading && data.length === 0 && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 10 : 13) : (isVidrio ? 6 : 6)} className="empty">Sin resultados</td></tr>
          )}
          {!loading && data.map((p) => {
            const total = Number(p.cantidadTotal || 0) || 
              (Number(p.cantidadInsula || 0) + Number(p.cantidadCentro || 0) + Number(p.cantidadPatios || 0));

            // Para vendedores, obtener la cantidad de su sede específica
            const cantidadVendedor = isAdmin ? total : (
              userSede === "Insula" ? Number(p.cantidadInsula || 0) :
              userSede === "Centro" ? Number(p.cantidadCentro || 0) :
              userSede === "Patios" ? Number(p.cantidadPatios || 0) : 0
            );

            // Determinar si la fila debe pintarse de rojo (sin stock)
            // Solo considerar exactamente 0 como sin stock, los valores negativos son ventas anticipadas
            const sinStock = isAdmin ? total === 0 : cantidadVendedor === 0;
            
            // Determinar si hay stock negativo (venta anticipada)
            const stockNegativo = isAdmin ? total < 0 : cantidadVendedor < 0;

            return (
              <tr 
                key={p.id} 
                className={`${sinStock ? "row-sin-stock" : stockNegativo ? "row-stock-negativo" : ""} ${productoSeleccionado?.id === p.id ? "row-selected" : ""}`}
                onClick={() => setProductoSeleccionado(p)}
                style={{ cursor: 'pointer' }}
              >
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td className="td-color">
                  <span className={`color-badge color-${(p.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}>
                    {p.color ?? "N/A"}
                  </span>
                </td>
                {isVidrio ? (
                  <>
                    {/* Columnas específicas para VIDRIO */}
                    <td style={{ textAlign: 'center' }}>{p.mm ?? "-"}</td>
                    <td style={{ textAlign: 'center' }}>{p.m1 ?? "-"}</td>
                    <td style={{ textAlign: 'center' }}>{p.m2 ?? "-"}</td>
                    {/* Cantidad después de m2 */}
                    <td style={{ textAlign: 'center' }} className={(() => {
                      if (isAdmin) return Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : "";
                      if (userSede === "Insula") return Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : "";
                      if (userSede === "Centro") return Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : "";
                      if (userSede === "Patios") return Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : "";
                      return "";
                    })()}>
                      {isAdmin
                        ? (p.cantidadInsula !== undefined && p.cantidadInsula !== null ? (Number(p.cantidadInsula) % 1 === 0 ? Number(p.cantidadInsula).toFixed(0) : Number(p.cantidadInsula).toFixed(2)) : '0')
                        : userSede === "Insula" ? (p.cantidadInsula !== undefined && p.cantidadInsula !== null ? (Number(p.cantidadInsula) % 1 === 0 ? Number(p.cantidadInsula).toFixed(0) : Number(p.cantidadInsula).toFixed(2)) : '0')
                        : userSede === "Centro" ? (p.cantidadCentro !== undefined && p.cantidadCentro !== null ? (Number(p.cantidadCentro) % 1 === 0 ? Number(p.cantidadCentro).toFixed(0) : Number(p.cantidadCentro).toFixed(2)) : '0')
                        : userSede === "Patios" ? (p.cantidadPatios !== undefined && p.cantidadPatios !== null ? (Number(p.cantidadPatios) % 1 === 0 ? Number(p.cantidadPatios).toFixed(0) : Number(p.cantidadPatios).toFixed(2)) : '0')
                        : '0'
                      }
                      {(() => {
                        if (isAdmin) return Number(p.cantidadInsula || 0) < 0 ? <span className="badge-negativo"> </span> : null;
                        if (userSede === "Insula") return Number(p.cantidadInsula || 0) < 0 ? <span className="badge-negativo"> </span> : null;
                        if (userSede === "Centro") return Number(p.cantidadCentro || 0) < 0 ? <span className="badge-negativo"> </span> : null;
                        if (userSede === "Patios") return Number(p.cantidadPatios || 0) < 0 ? <span className="badge-negativo"> </span> : null;
                        return null;
                      })()}
                    </td>
                    {/* Mostrar Costo solo para VIDRIO y solo para admin */}
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {p.costo ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.costo) : "-"}
                      </td>
                    )}
                    {/* Mostrar precio según el rol y sede */}
                    <td style={{ textAlign: 'right' }}>
                      {isAdmin
                        ? (p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-")
                        : (userSede === "Insula" ? (p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-")
                          : userSede === "Centro" ? (p.precio2 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio2) : "-")
                          : userSede === "Patios" ? (p.precio3 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio3) : "-")
                          : "-")
                      }
                    </td>
                  </>
                ) : (
                  <>
                    {/* Columnas normales para otras categorías */}
                    {/* Columnas de inventario según el rol */}
                    {isAdmin ? (
                      <>
                        <td className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadInsula !== undefined && p.cantidadInsula !== null ? (Number(p.cantidadInsula) % 1 === 0 ? Number(p.cantidadInsula).toFixed(0) : Number(p.cantidadInsula).toFixed(2)) : '0'}
                          {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadCentro !== undefined && p.cantidadCentro !== null ? (Number(p.cantidadCentro) % 1 === 0 ? Number(p.cantidadCentro).toFixed(0) : Number(p.cantidadCentro).toFixed(2)) : '0'}
                          {Number(p.cantidadCentro || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadPatios !== undefined && p.cantidadPatios !== null ? (Number(p.cantidadPatios) % 1 === 0 ? Number(p.cantidadPatios).toFixed(0) : Number(p.cantidadPatios).toFixed(2)) : '0'}
                          {Number(p.cantidadPatios || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                        <td className={stockNegativo ? "stock-negativo" : ""} style={{ width: '12%', minWidth: '120px', maxWidth: '220px' }}>
                          <strong>{Number(total) % 1 === 0 ? Number(total).toFixed(0) : Number(total).toFixed(2)}</strong>
                          {stockNegativo && <span className="badge-negativo">  Faltan {Math.abs(total)}</span>}
                        </td>
                      </>
                    ) : (
                      // Para VENDEDOR: mostrar solo la cantidad de su sede
                      <td className={stockNegativo ? "stock-negativo" : ""}>
                        <strong>{cantidadVendedor}</strong>
                        {stockNegativo && <span className="badge-negativo">  Faltan {Math.abs(cantidadVendedor)}</span>}
                      </td>
                    )}
                    
                    {/* Columna de costo solo para administradores */}
                    {isAdmin && (
                      <td>{p.costo ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.costo) : "-"}</td>
                    )}
                    
                    {/* Precios según el rol */}
                    {isAdmin ? (
                      <>
                        <td className="precio-principal">{p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-"}</td>
                        <td className="precio-secundario">{p.precio2 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio2) : "-"}</td>
                        <td className="precio-secundario">{p.precio3 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio3) : "-"}</td>
                      </>
                    ) : (
                      // Para VENDEDOR: mostrar solo el precio de su sede
                      <td><strong>
                        {userSede === "Insula" ? (p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-") : 
                         userSede === "Centro" ? (p.precio2 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio2) : "-") :
                         userSede === "Patios" ? (p.precio3 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio3) : "-") : "-"}
                      </strong></td>
                    )}
                  </>
                )}
                
                {/* Acciones disponibles para todos los roles */}
                <td
                  className="acciones"
                  style={isVidrio
                    ? { width: '4px', minWidth: '4px', maxWidth: '8px', textAlign: 'center', padding: '0.01rem 0.01rem' }
                    : { width: '60px', textAlign: 'center', padding: '0.25rem 0.25rem' }
                  }
                >
                  <button className="btnEdit" style={{ padding: '2px 4px', marginRight: 2 }} onClick={e => { e.stopPropagation(); onEditar?.(p); }}>
                    <img src={editar} className="iconButton" style={{ width: 18, height: 18 }} />
                  </button>
                  <button className="btnDelete" style={{ padding: '2px 4px' }} onClick={e => { e.stopPropagation(); onEliminar?.(p.id); }}>
                    <img src={eliminar} className="iconButton" style={{ width: 18, height: 18 }} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Vista de tarjetas (móvil) */}
      <div className="mobile-cards">
        {loading && (
          <div className="mobile-card">
            <div className="mobile-card-body">
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Cargando…</div>
            </div>
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="mobile-card">
            <div className="mobile-card-body">
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Sin resultados</div>
            </div>
          </div>
        )}
        {!loading && data.map((p) => {
          const total = Number(p.cantidadTotal || 0) || 
            (Number(p.cantidadInsula || 0) + Number(p.cantidadCentro || 0) + Number(p.cantidadPatios || 0));

          const cantidadVendedor = isAdmin ? total : (
            userSede === "Insula" ? Number(p.cantidadInsula || 0) :
            userSede === "Centro" ? Number(p.cantidadCentro || 0) :
            userSede === "Patios" ? Number(p.cantidadPatios || 0) : 0
          );

          const sinStock = isAdmin ? total === 0 : cantidadVendedor === 0;
          const stockNegativo = isAdmin ? total < 0 : cantidadVendedor < 0;

          return (
            <div 
              key={p.id} 
              className={`mobile-card ${sinStock ? "stock-sin-stock" : stockNegativo ? "stock-negativo" : ""} ${productoSeleccionado?.id === p.id ? "selected" : ""}`}
              onClick={() => setProductoSeleccionado(p)}
            >
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <div className="mobile-card-title-row">
                    <h3>{p.nombre || "Sin nombre"}</h3>
                    <div className="mobile-card-actions-header">
                      <button className="btnEdit" onClick={e => { e.stopPropagation(); onEditar?.(p); }}>
                        <img src={editar} alt="Editar" />
                      </button>
                      <button className="btnDelete" onClick={e => { e.stopPropagation(); onEliminar?.(p.id); }}>
                        <img src={eliminar} alt="Eliminar" />
                      </button>
                    </div>
                  </div>
                  <div className="mobile-card-meta">
                    <span className="codigo">Código: {p.codigo || "N/A"}</span>
                    <span className={`color-badge color-${(p.color || 'NA').toLowerCase().replace(/\s+/g, '-')}`}>
                      {p.color ?? "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mobile-card-body">
                {isVidrio ? (
                  <>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">mm</span>
                      <span className="mobile-card-value">{p.mm ?? "-"}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">m1</span>
                      <span className="mobile-card-value">{p.m1 ?? "-"}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">m2</span>
                      <span className="mobile-card-value">{p.m2 ?? "-"}</span>
                    </div>
                    {isAdmin && (
                      <div className="mobile-card-field">
                        <span className="mobile-card-label">Costo</span>
                        <span className="mobile-card-value">{fmtPrice(p.costo)}</span>
                      </div>
                    )}
                    <div className="mobile-card-field">
                      <span className="mobile-card-label">Precio</span>
                      <span className="mobile-card-value">
                        {isAdmin
                          ? fmtPrice(p.precio1)
                          : userSede === "Insula" ? fmtPrice(p.precio1) :
                            userSede === "Centro" ? fmtPrice(p.precio2) :
                            userSede === "Patios" ? fmtPrice(p.precio3) : "-"}
                      </span>
                    </div>
                    <div className="mobile-card-field full-width">
                      <span className="mobile-card-label">Cantidad</span>
                      <span className={`mobile-card-value total-value ${stockNegativo ? "stock-negativo" : sinStock ? "stock-sin-stock" : ""}`}>
                        <strong>{isAdmin ? fmtCantidad(p.cantidadInsula) : fmtCantidad(cantidadVendedor)}</strong>
                        {stockNegativo && <span className="badge-warning"> (Faltan {Math.abs(isAdmin ? Number(p.cantidadInsula || 0) : cantidadVendedor)})</span>}
                        {sinStock && <span className="badge-warning"> (Sin stock)</span>}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {isAdmin ? (
                      <>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Insula</span>
                          <span className={`mobile-card-value ${Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}`}>
                            {fmtCantidad(p.cantidadInsula)}
                          </span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Centro</span>
                          <span className={`mobile-card-value ${Number(p.cantidadCentro || 0) < 0 ? "stock-negativo" : ""}`}>
                            {fmtCantidad(p.cantidadCentro)}
                          </span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Patios</span>
                          <span className={`mobile-card-value ${Number(p.cantidadPatios || 0) < 0 ? "stock-negativo" : ""}`}>
                            {fmtCantidad(p.cantidadPatios)}
                          </span>
                        </div>
                        <div className="mobile-card-field full-width">
                          <span className="mobile-card-label">Total Inventario</span>
                          <span className={`mobile-card-value total-value ${stockNegativo ? "stock-negativo" : sinStock ? "stock-sin-stock" : ""}`}>
                            <strong>{fmtCantidad(total)}</strong>
                            {stockNegativo && <span className="badge-warning"> (Faltan {Math.abs(total)})</span>}
                            {sinStock && <span className="badge-warning"> (Sin stock)</span>}
                          </span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Costo</span>
                          <span className="mobile-card-value">{fmtPrice(p.costo)}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Precio Insula</span>
                          <span className="mobile-card-value">{fmtPrice(p.precio1)}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Precio Centro</span>
                          <span className="mobile-card-value">{fmtPrice(p.precio2)}</span>
                        </div>
                        <div className="mobile-card-field">
                          <span className="mobile-card-label">Precio Patios</span>
                          <span className="mobile-card-value">{fmtPrice(p.precio3)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mobile-card-field full-width">
                          <span className="mobile-card-label">Cantidad ({userSede})</span>
                          <span className={`mobile-card-value total-value ${stockNegativo ? "stock-negativo" : sinStock ? "stock-sin-stock" : ""}`}>
                            <strong>{fmtCantidad(cantidadVendedor)}</strong>
                            {stockNegativo && <span className="badge-warning"> (Faltan {Math.abs(cantidadVendedor)})</span>}
                            {sinStock && <span className="badge-warning"> (Sin stock)</span>}
                          </span>
                        </div>
                        <div className="mobile-card-field full-width">
                          <span className="mobile-card-label">Precio ({userSede})</span>
                          <span className="mobile-card-value price-value">
                            <strong>
                              {userSede === "Insula" ? fmtPrice(p.precio1) : 
                               userSede === "Centro" ? fmtPrice(p.precio2) :
                               userSede === "Patios" ? fmtPrice(p.precio3) : "-"}
                            </strong>
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
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
    </div>
  );
}
