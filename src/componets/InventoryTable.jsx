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

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Color</th>
            {isVidrio ? (
              <>
                {/* Columnas específicas para VIDRIO */}
                <th style={{ width: '70px' }}>mm</th>
                <th style={{ width: '80px' }}>m1</th>
                <th style={{ width: '80px' }}>m2</th>
                {isAdmin && <th style={{ width: '120px' }}>Precio Insula</th>}
                {isAdmin && <th style={{ width: '120px' }}>Cantidad Insula</th>}
              </>
            ) : (
              <>
                {/* Columnas normales para otras categorías */}
                {/* Para ADMINISTRADOR: mostrar todas las columnas de inventario */}
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
                {/* Columna de costo solo para administradores */}
                {isAdmin && <th>Costo</th>}
                {/* Precios según el rol */}
                {isAdmin ? (
                  <>
                    <th>P. Insula</th>
                    <th>P. Centro</th>
                    <th>P. Patios</th>
                  </>
                ) : (
                  <th>Precio</th>
                )}
              </>
            )}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 9 : 13) : (isVidrio ? 6 : 6)} className="empty">Cargando…</td></tr>
          )}
          {!loading && data.length === 0 && (
            <tr><td colSpan={isAdmin ? (isVidrio ? 9 : 13) : (isVidrio ? 6 : 6)} className="empty">Sin resultados</td></tr>
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
                <td>
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
                    {isAdmin && (
                      <>
                        <td style={{ textAlign: 'right' }}>{p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-"}</td>
                        <td style={{ textAlign: 'center' }} className={Number(p.cantidadInsula || 0) < 0 ? "stock-negativo" : ""}>
                          {p.cantidadInsula ?? 0}
                          {Number(p.cantidadInsula || 0) < 0 && <span className="badge-negativo"> </span>}
                        </td>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Columnas normales para otras categorías */}
                    {/* Columnas de inventario según el rol */}
                    {isAdmin ? (
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
                        <td>{p.precio1 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio1) : "-"}</td>
                        <td>{p.precio2 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio2) : "-"}</td>
                        <td>{p.precio3 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.precio3) : "-"}</td>
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
                <td className="acciones">
                  <button className="btnEdit" onClick={() => onEditar?.(p)}>
                  <img src={editar} className="iconButton" />
                  </button>
                  <button className="btnDelete" onClick={() => onEliminar?.(p.id)}>
                  <img src={eliminar} className="iconButton" />
                  </button>
                </td>
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
    </div>
  );
}
