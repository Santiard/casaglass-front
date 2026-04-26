/** Utilidades compartidas: vista previa / impresión / PDF de facturas. */

export const IVA_FACTOR = 1.19;

export function sinIva(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  return n / IVA_FACTOR;
}

export function resolverNombreItem(item) {
  return item?.nombre || item?.nombreProducto || item?.producto?.nombre || "-";
}

export function resolverEsVidrio(item) {
  const esVidrioCanonico = item?.producto?.esVidrio ?? item?.esVidrio;
  if (typeof esVidrioCanonico === "boolean") {
    return esVidrioCanonico;
  }

  const categoriaNombre =
    item?.producto?.categoriaNombre ??
    item?.categoriaNombre ??
    item?.producto?.categoria?.nombre ??
    item?.categoria?.nombre ??
    item?.producto?.categoria ??
    item?.categoria ??
    "";
  return String(categoriaNombre).toUpperCase().trim() === "VIDRIO";
}

export function resolverEspesorVidrio(item) {
  const mm = item?.producto?.mm ?? item?.mm;
  if (mm !== null && mm !== undefined && mm !== "") {
    const numero = Number(mm);
    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  const grosorMm = item?.producto?.grosorMm ?? item?.grosorMm;
  if (grosorMm !== null && grosorMm !== undefined && grosorMm !== "") {
    const numero = Number(grosorMm);
    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  return null;
}

export function resolverNombreImpresion(item) {
  const nombreBase = resolverNombreItem(item);
  if (!resolverEsVidrio(item)) {
    return nombreBase;
  }

  const espesorMm = resolverEspesorVidrio(item);
  if (!Number.isFinite(espesorMm) || espesorMm <= 0) {
    return nombreBase;
  }

  return `${nombreBase} ${espesorMm}MM`;
}

export function resolverColorItem(item) {
  return item?.producto?.color ?? item?.color ?? "-";
}

export function resolverTipoItem(item) {
  return item?.producto?.tipo ?? item?.tipo ?? "-";
}

/** Ítems de la orden aunque el DTO use `items`, `detalles` o `lineas`. */
export function ordenItemsFromOrden(ordenCompleta) {
  if (!ordenCompleta || typeof ordenCompleta !== "object") return [];
  if (Array.isArray(ordenCompleta.items) && ordenCompleta.items.length > 0) {
    return ordenCompleta.items;
  }
  if (Array.isArray(ordenCompleta.detalles) && ordenCompleta.detalles.length > 0) {
    return ordenCompleta.detalles;
  }
  if (Array.isArray(ordenCompleta.lineas) && ordenCompleta.lineas.length > 0) {
    return ordenCompleta.lineas;
  }
  return Array.isArray(ordenCompleta.items) ? ordenCompleta.items : [];
}

/**
 * @param {object} facturaCompleta - Respuesta GET /facturas/{id}
 */
export function mapFacturaCompletaToForm(facturaCompleta) {
  const ordenCompleta = facturaCompleta.orden || {};
  const items = ordenItemsFromOrden(ordenCompleta);
  const cliente = facturaCompleta.cliente || {};

  return {
    id: facturaCompleta.id,
    numeroFactura: facturaCompleta.numeroFactura || facturaCompleta.numero || facturaCompleta.id,
    fecha: facturaCompleta.fecha,
    subtotal: typeof facturaCompleta.subtotal === "number" ? facturaCompleta.subtotal : 0,
    iva: typeof facturaCompleta.iva === "number" ? facturaCompleta.iva : 0,
    retencionFuente: typeof facturaCompleta.retencionFuente === "number" ? facturaCompleta.retencionFuente : 0,
    retencionIca: typeof facturaCompleta.retencionIca === "number" ? facturaCompleta.retencionIca : 0,
    total: typeof facturaCompleta.total === "number" ? facturaCompleta.total : 0,
    formaPago: facturaCompleta.formaPago || "-",
    observaciones: facturaCompleta.observaciones || "",
    estado: facturaCompleta.estado || "PENDIENTE",
    cliente,
    orden: {
      numero: ordenCompleta.numero,
      fecha: ordenCompleta.fecha,
      obra: ordenCompleta.obra || "",
      tieneRetencionIca: ordenCompleta.tieneRetencionIca || false,
      porcentajeIca:
        ordenCompleta.porcentajeIca !== undefined && ordenCompleta.porcentajeIca !== null
          ? Number(ordenCompleta.porcentajeIca)
          : null,
    },
    items,
  };
}

/** Fallback cuando falla el GET (fila del listado). */
export function mapFacturaListRowToForm(factura) {
  const ordenCompleta = factura.orden || {};
  const cliente = factura.cliente || {};
  const items = ordenItemsFromOrden(ordenCompleta);

  return {
    id: factura.id,
    numeroFactura: factura.numeroFactura || factura.numero || factura.id,
    fecha: factura.fecha,
    subtotal: typeof factura.subtotal === "number" ? factura.subtotal : 0,
    iva: typeof factura.iva === "number" ? factura.iva : 0,
    retencionFuente: typeof factura.retencionFuente === "number" ? factura.retencionFuente : 0,
    retencionIca: typeof factura.retencionIca === "number" ? factura.retencionIca : 0,
    total: typeof factura.total === "number" ? factura.total : 0,
    formaPago: factura.formaPago || "-",
    observaciones: factura.observaciones || "",
    estado: factura.estado || "PENDIENTE",
    cliente,
    orden: {
      numero: ordenCompleta.numero,
      fecha: ordenCompleta.fecha,
      obra: ordenCompleta.obra || "",
      tieneRetencionIca: ordenCompleta.tieneRetencionIca || false,
      porcentajeIca:
        ordenCompleta.porcentajeIca !== undefined && ordenCompleta.porcentajeIca !== null
          ? Number(ordenCompleta.porcentajeIca)
          : null,
    },
    items,
  };
}

/** Estilos embebidos en ventana de impresión (mismo layout que FacturaImprimirModal). */
export function buildFacturaImpresionPrintHtmlDocument(numeroFactura, innerBodyHtml) {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura #${numeroFactura}</title>
          <style>
            @page {
              margin: 10mm;
              size: auto;
            }
            
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            
            body { 
              font-family: 'Roboto', sans-serif; 
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 0.8rem;
            }
            
            .factura-imprimir-header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #000;
            }
            
            .factura-imprimir-header h1 {
              margin: 0 0 4px 0;
              color: #000;
              font-size: 1.1rem;
              font-weight: 700;
            }
            
            .factura-imprimir-header h2 {
              margin: 2px 0;
              color: #000;
              font-size: 0.95rem;
              font-weight: 600;
            }
            
            .factura-imprimir-header p {
              margin: 2px 0;
              color: #000;
              font-size: 0.75rem;
            }
            
            .factura-imprimir-info {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              margin-bottom: 10px;
            }
            
            .factura-imprimir-info-section h3 {
              margin: 0 0 2px 0;
              color: #000;
              font-size: 0.75rem;
              font-weight: 600;
            }
            
            .factura-imprimir-info-section p {
              margin: 2px 0;
              color: #000;
              font-size: 0.7rem;
            }
            
            .factura-imprimir-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 0.7rem;
              page-break-inside: auto;
            }
            
            .factura-imprimir-table thead {
              display: table-header-group;
              background-color: #1e2753;
              color: #fff;
            }
            
            .factura-imprimir-table th {
              padding: 4px 6px;
              text-align: left;
              font-weight: 600;
              font-size: 0.65rem;
              border: 1px solid #1e2753;
            }
            
            .factura-imprimir-table td {
              padding: 3px 6px;
              border-bottom: 1px solid #e0e0e0;
              border-right: 1px solid #f0f0f0;
              font-size: 0.65rem;
              color: #333;
            }
            
            .factura-imprimir-table tbody tr {
              page-break-inside: avoid;
            }
            
            .factura-imprimir-table tbody tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .factura-imprimir-table .text-center {
              text-align: center;
            }
            
            .factura-imprimir-table .text-right {
              text-align: right;
            }
            
            .factura-imprimir-table .empty {
              text-align: center;
              color: #999;
              padding: 10px;
              font-style: italic;
            }
            
            .factura-imprimir-total {
              text-align: right;
              margin-top: 8px;
              padding: 6px 8px;
              background: #f8f9fa;
              border-radius: 4px;
            }
            
            .factura-imprimir-total p {
              margin: 2px 0;
              font-size: 0.75rem;
              color: #333;
            }
            
            .factura-imprimir-total p strong {
              font-size: 0.85rem;
              font-weight: 600;
              color: #000;
            }

            .factura-no-imprimir {
              display: none !important;
            }

            input.factura-ajuste-precio-input--large {
              display: inline-block;
              width: 100%;
              max-width: 12rem;
              padding: 6px 8px;
              font-size: 0.85rem;
              border: 1px solid #333;
              border-radius: 4px;
              text-align: right;
              box-sizing: border-box;
              -moz-appearance: textfield;
              appearance: textfield;
            }

            input.factura-ajuste-precio-input--large::-webkit-outer-spin-button,
            input.factura-ajuste-precio-input--large::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            
            @media print {
              body {
                font-size: 1rem;
              }
              
              .factura-imprimir-header h1 {
                font-size: 1.3rem;
                color: #000 !important;
              }
              
              .factura-imprimir-header h2 {
                font-size: 1.1rem;
                color: #000 !important;
              }
              
              .factura-imprimir-header p {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .factura-imprimir-info-section h3 {
                font-size: 0.9rem;
                color: #000 !important;
              }
              
              .factura-imprimir-info-section p {
                font-size: 0.85rem;
                color: #000 !important;
              }
              
              .factura-imprimir-table {
                font-size: 0.9rem;
              }
              
              .factura-imprimir-table thead {
                background-color: transparent !important;
                color: #000 !important;
                border-bottom: 2px solid #000 !important;
              }
              
              .factura-imprimir-table th {
                background-color: transparent !important;
                color: #000 !important;
                border: none !important;
                border-bottom: 2px solid #000 !important;
                padding: 6px 8px;
                font-size: 0.85rem;
              }
              
              .factura-imprimir-table td {
                color: #000 !important;
                border: none !important;
                padding: 5px 8px;
                font-size: 0.85rem;
              }
              
              .factura-imprimir-table tbody tr:nth-child(even) {
                background-color: transparent !important;
              }
              
              .factura-imprimir-header {
                border-bottom: 2px solid #000 !important;
              }
              
              .factura-imprimir-total {
                background: transparent !important;
                border: none !important;
                border-top: 2px solid #000 !important;
                padding-top: 8px;
              }
              
              .factura-imprimir-total p {
                color: #000 !important;
                font-size: 0.95rem;
              }
              
              .factura-imprimir-total p strong {
                color: #000 !important;
                font-size: 1.05rem;
              }

              input.factura-ajuste-precio-input--large {
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: none !important;
                width: auto !important;
                display: inline !important;
                box-shadow: none !important;
                -webkit-appearance: none;
                appearance: none;
                -moz-appearance: textfield !important;
              }

              input.factura-ajuste-precio-input--large::-webkit-outer-spin-button,
              input.factura-ajuste-precio-input--large::-webkit-inner-spin-button {
                -webkit-appearance: none !important;
                margin: 0 !important;
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${innerBodyHtml}
          <script>
            window.addEventListener('afterprint', function() {
              window.close();
            });
            
            setTimeout(function() {
              if (!window.closed) {
                window.close();
              }
            }, 5000);
          </script>
        </body>
      </html>
    `;
}
