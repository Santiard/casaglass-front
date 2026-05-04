import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { listarSedes } from "../services/SedesService.js";
import InformesMensualService from "../services/InformesMensualService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import "../styles/EntregaPage.css";
import "../styles/EntregaTable.css";
import "../styles/InformesMensualesPage.css";

const MESES_LABEL = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ROWS_PAGE = 10;

/** Recuerda sede y año en esta pestaña para que F5 no deje la tabla vacía (admins). */
const FILTROS_INFORMES_STORAGE_KEY = "casaglass.informesMensuales.filtros";

function leerFiltrosInformesGuardados() {
  try {
    const raw = sessionStorage.getItem(FILTROS_INFORMES_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    const year = String(o.year ?? new Date().getFullYear());
    const y = Number(year);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return null;
    const sedeId = o.sedeId != null ? String(o.sedeId) : "";
    return { sedeId, year };
  } catch {
    return null;
  }
}

/** Montos del informe: null/undefined = no dato (no confundir con 0; Number(null) sería 0 en JS). */
function fmtCOP(n) {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(v);
}

function erroMsg(err) {
  return err?.response?.data?.message || err?.message || "Error desconocido";
}

function escapeHtml(text) {
  if (text == null || text === "") return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatoOrdenesVentasMesInforme(o) {
  if (!o) return "—";
  const cant = o.cantidad ?? 0;
  if (o.numeroMin != null && o.numeroMax != null) return `#${o.numeroMin} — #${o.numeroMax} (${cant})`;
  return `— (${cant})`;
}

const ESTILOS_IMPRESION_INFORME_MENSUAL = `
  @page { margin: 14mm; size: auto; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #222; margin: 0; padding: 10px 12px; }
  h1 { font-size: 11pt; margin: 0 0 4px 0; font-weight: 700; }
  .sub { font-size: 9pt; color: #444; margin: 0 0 10px 0; line-height: 1.35; }
  table { width: 100%; border-collapse: collapse; max-width: 420px; }
  td { padding: 4px 0; vertical-align: top; border-bottom: 1px solid #ddd; font-size: 9.5pt; }
  td:first-child { color: #555; width: 54%; padding-right: 10px; }
  td:last-child { text-align: right; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr:last-child td { border-bottom: none; }
  .pie { margin-top: 14px; font-size: 8pt; color: #888; }
`;

/** Abre ventana con tabla compacta para imprimir o guardar como PDF desde el navegador. */
function imprimirInformeMensualDocumento(data, onVentanaBloqueada) {
  if (!data || typeof data !== "object") return;

  const sedeNombre = escapeHtml(data.sede?.nombre || "—");
  const mesTitulo = escapeHtml(
    data.periodo?.mesNombre ||
      `${MESES_LABEL[data.periodo?.month] || "?"} ${data.periodo?.year ?? ""}`.trim(),
  );
  const origenUp = String(data.origen ?? "").toUpperCase();
  const tipoLinea =
    origenUp === "PREVIEW"
      ? "Vista previa (no guardado)"
      : origenUp === "CERRADO"
        ? "Cierre guardado"
        : escapeHtml(String(data.origen ?? "—"));

  const filas = [
    ["Ventas (mes)", fmtCOP(data.ventasMes)],
    ["Dinero recogido", fmtCOP(data.dineroRecogidoMes)],
    ["Deudas (mes)", fmtCOP(data.deudasMes)],
    ["Deudas activas totales", fmtCOP(data.deudasActivasTotales)],
    ["Valor inventario (costo × stock)", fmtCOP(data.valorInventario)],
    ["Órdenes (venta en mes)", formatoOrdenesVentasMesInforme(data.ordenesVentasMes)],
  ];

  const tbody = filas
    .map(([lab, val]) => `<tr><td>${escapeHtml(lab)}</td><td>${escapeHtml(val)}</td></tr>`)
    .join("");

  const fechaGen = escapeHtml(new Date().toLocaleString("es-CO"));
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Informe mensual</title><style>${ESTILOS_IMPRESION_INFORME_MENSUAL}</style></head><body>
<h1>Informe mensual por sede</h1>
<p class="sub">${sedeNombre}<br/>${mesTitulo}<br/><strong>${tipoLinea}</strong></p>
<table><tbody>${tbody}</tbody></table>
<p class="pie">Casa Glass · ${fechaGen}</p>
<script>
  window.addEventListener("afterprint", function () { try { window.close(); } catch (e) {} });
  setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 250);
</script>
</body></html>`;

  const ventana = window.open("", "_blank", "width=680,height=560");
  if (!ventana) {
    onVentanaBloqueada?.();
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

export default function InformesMensualesPage() {
  const { isAdmin, sedeId: sedeIdUsuario, sede: sedeNombreUsuario, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();

  const [sedes, setSedes] = useState([]);
  const [filtros, setFiltros] = useState(() => {
    const guardado = leerFiltrosInformesGuardados();
    if (guardado) return guardado;
    /* Admin o no: si el perfil trae sedeId, usamos esa sede por defecto (evita tabla vacía al entrar). */
    const sidDefault =
      sedeIdUsuario != null && sedeIdUsuario !== ""
        ? String(sedeIdUsuario)
        : "";
    return {
      sedeId: sidDefault,
      year: String(new Date().getFullYear()),
    };
  });

  useEffect(() => {
    if (!isAdmin && sedeIdUsuario != null) {
      setFiltros((p) => ({ ...p, sedeId: String(sedeIdUsuario) }));
    }
  }, [isAdmin, sedeIdUsuario]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTROS_INFORMES_STORAGE_KEY,
        JSON.stringify({ sedeId: filtros.sedeId, year: filtros.year }),
      );
    } catch (_) {
      /* quota / modo privado */
    }
  }, [filtros.sedeId, filtros.year]);

  const [cierres, setCierres] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [modalCierreOpen, setModalCierreOpen] = useState(false);
  const [modalSedeId, setModalSedeId] = useState("");
  const [modalYear, setModalYear] = useState(String(new Date().getFullYear()));
  const [cierresModal, setCierresModal] = useState([]);
  const [mesCierre, setMesCierre] = useState(String(new Date().getMonth() + 1));
  const [preview, setPreview] = useState(null);

  const [detalle, setDetalle] = useState(null);

  /** Evita volver a autollenar sede si el usuario la dejó vacía a propósito tras el primer intento. */
  const sedePerfilAplicadaRef = useRef(false);

  useEffect(() => {
    if (authLoading || !sedes.length || sedePerfilAplicadaRef.current) return;
    setFiltros((prev) => {
      if (prev.sedeId !== "") {
        sedePerfilAplicadaRef.current = true;
        return prev;
      }
      let resolved = "";
      if (sedeIdUsuario != null && String(sedeIdUsuario).trim() !== "") {
        const sid = String(sedeIdUsuario);
        if (sedes.some((x) => String(x?.id) === sid)) resolved = sid;
      }
      if (!resolved && sedeNombreUsuario && String(sedeNombreUsuario).trim() !== "") {
        const nombreNorm = String(sedeNombreUsuario).trim().toLowerCase();
        const match = sedes.find((x) => String(x?.nombre || "").trim().toLowerCase() === nombreNorm);
        if (match != null) resolved = String(match.id);
      }
      if (!resolved) return prev;
      sedePerfilAplicadaRef.current = true;
      return { ...prev, sedeId: resolved };
    });
  }, [authLoading, sedes, sedeIdUsuario, sedeNombreUsuario]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const s = await listarSedes();
        if (cancel) return;
        const sedesLista = Array.isArray(s) ? s : [];
        setSedes(sedesLista);
      } catch (e) {
        if (!cancel) showError(`No se pudieron cargar sedes: ${erroMsg(e)}`);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const sedeNum = useMemo(() => {
    const id = filtros.sedeId === "" ? NaN : Number(filtros.sedeId);
    return Number.isFinite(id) ? id : NaN;
  }, [filtros.sedeId]);

  const yearNum = useMemo(() => {
    const y = Number(filtros.year);
    return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : NaN;
  }, [filtros.year]);

  /** `override`: tras cerrar mes fuerza GET con esa sede/año aunque los filtros no hayan cambiado en React (si no, la tabla no se refresca). */
  const cargarLista = useCallback(async (override) => {
    const sid =
      override != null &&
      typeof override === "object" &&
      Number.isFinite(override.sedeId)
        ? override.sedeId
        : sedeNum;
    const yr =
      override != null &&
      typeof override === "object" &&
      Number.isFinite(override.year)
        ? override.year
        : yearNum;

    if (!Number.isFinite(sid) || !Number.isFinite(yr)) {
      if (override == null) setCierres([]);
      return;
    }
    setLoadingLista(true);
    setError("");
    try {
      const data = await InformesMensualService.listarCierresAnio({ sedeId: sid, year: yr });
      setCierres(Array.isArray(data) ? [...data].sort((a, b) => (a.month ?? 0) - (b.month ?? 0)) : []);
      setPage(1);
    } catch (err) {
      if (err?.response?.status === 404) {
        showError(erroMsg(err));
        setCierres([]);
      } else {
        setError(erroMsg(err));
      }
    } finally {
      setLoadingLista(false);
    }
  }, [sedeNum, yearNum, showError]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const añosOpciones = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }, []);

  const slicePag = useMemo(() => {
    const total = cierres.length;
    const maxPage = Math.max(1, Math.ceil(total / ROWS_PAGE) || 1);
    const cur = Math.min(page, maxPage);
    const start = (cur - 1) * ROWS_PAGE;
    return { pageData: cierres.slice(start, start + ROWS_PAGE), total, maxPage, cur };
  }, [cierres, page]);

  const nombreSedeSeleccionada = useMemo(() => {
    const s = sedes.find((x) => String(x?.id) === String(filtros.sedeId));
    return s?.nombre || "";
  }, [sedes, filtros.sedeId]);

  const modalSedeNum = useMemo(() => {
    const id = modalSedeId === "" ? NaN : Number(modalSedeId);
    return Number.isFinite(id) ? id : NaN;
  }, [modalSedeId]);

  const modalYearNum = useMemo(() => {
    const y = Number(modalYear);
    return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : NaN;
  }, [modalYear]);

  const nombreSedeModal = useMemo(() => {
    const s = sedes.find((x) => String(x?.id) === String(modalSedeId));
    return s?.nombre || "";
  }, [sedes, modalSedeId]);

  useEffect(() => {
    if (!modalCierreOpen) {
      setCierresModal([]);
      return;
    }
    if (!Number.isFinite(modalSedeNum) || !Number.isFinite(modalYearNum)) {
      setCierresModal([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const data = await InformesMensualService.listarCierresAnio({
          sedeId: modalSedeNum,
          year: modalYearNum,
        });
        if (!cancel) {
          setCierresModal(
            Array.isArray(data)
              ? [...data].sort((a, b) => (a.month ?? 0) - (b.month ?? 0))
              : [],
          );
        }
      } catch {
        if (!cancel) setCierresModal([]);
      }
    })();
    return () => { cancel = true; };
  }, [modalCierreOpen, modalSedeNum, modalYearNum]);

  const abrirModalCierre = () => {
    setPreview(null);
    setMesCierre(String(new Date().getMonth() + 1));
    setModalSedeId(filtros.sedeId || "");
    setModalYear(filtros.year || String(new Date().getFullYear()));
    setModalCierreOpen(true);
  };

  const mesYaCerradoModal = useCallback(
    (m) => cierresModal.some((c) => Number(c.month) === Number(m)),
    [cierresModal],
  );

  const ejecutarPreview = async () => {
    if (!Number.isFinite(modalSedeNum) || !Number.isFinite(modalYearNum)) {
      showError("Seleccione sede y año en el modal.");
      return;
    }
    const month = Number(mesCierre);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      showError("Mes inválido.");
      return;
    }
    setLoadingAccion(true);
    try {
      const data = await InformesMensualService.preview({
        sedeId: modalSedeNum,
        year: modalYearNum,
        month,
      });
      setPreview(data);
    } catch (err) {
      showError(erroMsg(err));
      setPreview(null);
    } finally {
      setLoadingAccion(false);
    }
  };

  const ejecutarCerrarMes = async () => {
    const origen = String(preview?.origen ?? "").toUpperCase();
    if (!preview || origen !== "PREVIEW") {
      showError("Genere primero una vista previa.");
      return;
    }
    if (mesYaCerradoModal(Number(mesCierre))) {
      showError("Este mes ya tiene un cierre registrado.");
      return;
    }

    setLoadingAccion(true);
    try {
      await InformesMensualService.cerrarMes({
        sedeId: modalSedeNum,
        year: modalYearNum,
        month: Number(mesCierre),
        confirmar: true,
      });
      showSuccess("Informe mensual cerrado correctamente.");
      setModalCierreOpen(false);
      setPreview(null);
      setFiltros((p) => ({
        ...p,
        sedeId: String(modalSedeNum),
        year: String(modalYearNum),
      }));
      await cargarLista({ sedeId: modalSedeNum, year: modalYearNum });
    } catch (err) {
      showError(erroMsg(err));
    } finally {
      setLoadingAccion(false);
    }
  };

  const verDetalle = async (item) => {
    if (!Number.isFinite(sedeNum) || !Number.isFinite(yearNum)) return;
    setLoadingAccion(true);
    try {
      const data = await InformesMensualService.obtenerCierre({
        sedeId: sedeNum,
        year: yearNum,
        month: item.month,
      });
      setDetalle(data);
    } catch (err) {
      showError(erroMsg(err));
    } finally {
      setLoadingAccion(false);
    }
  };

  if (authLoading) {
    return (
      <div className="entregas-page">
        <div className="entregas-loading" style={{ minHeight: "50vh" }}>
          <div className="loading-spinner">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="entregas-page">
      <div className="entregas-header">
        <h1>Informes mensuales por sede</h1>
        <button type="button" className="btn-crear-entrega" onClick={abrirModalCierre}>
          + Nuevo cierre mensual
        </button>
      </div>

      {loadingLista && !cierres.length && (
        <div className="entregas-loading" style={{ minHeight: 120 }}>
          <div className="loading-spinner">Cargando informes...</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
          <button type="button" onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="entregas-filtros">
        <div className="filtro-grupo">
          <label>Sede</label>
          {isAdmin ? (
            <select
              value={filtros.sedeId}
              onChange={(e) => setFiltros((p) => ({ ...p, sedeId: e.target.value }))}
            >
              <option value="">Seleccionar sede...</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre || `#${s.id}`}</option>
              ))}
            </select>
          ) : (
            <select value={filtros.sedeId} disabled>
              <option value={filtros.sedeId}>{nombreSedeSeleccionada || `Sede #${filtros.sedeId}`}</option>
            </select>
          )}
        </div>

        <div className="filtro-grupo">
          <label>Año</label>
          <select
            value={filtros.year}
            onChange={(e) => setFiltros((p) => ({ ...p, year: e.target.value }))}
          >
            {añosOpciones.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-limpiar-filtros" onClick={cargarLista} disabled={!Number.isFinite(sedeNum)}>
          Actualizar listado
        </button>
      </div>

      <div className="entregas-content">
        <div className="entregas-table-container" style={{ border: "1px solid #e0e0e0", borderRadius: 8 }}>
          <div className="entregas-table-wrapper">
            <table className="entregas-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ventas (mes)</th>
                  <th>Dinero recogido</th>
                  <th style={{ textAlign: "center", width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!loadingLista && Number.isFinite(sedeNum) && slicePag.pageData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">No hay cierres guardados para esta sede y año.</td>
                  </tr>
                )}
                {!Number.isFinite(sedeNum) && (
                  <tr>
                    <td colSpan={4} className="empty">Seleccione una sede para ver el historial de cierres.</td>
                  </tr>
                )}
                {slicePag.pageData.map((row) => (
                  <tr key={row.id ?? `${row.mesIso}-${row.month}`}>
                    <td>{MESES_LABEL[row.month] || row.mesIso || `Mes ${row.month}`}</td>
                    <td>{fmtCOP(row.ventasMes)}</td>
                    <td>{fmtCOP(row.dineroRecogidoMes)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button type="button" className="btn-link-accion" onClick={() => verDetalle(row)}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Number.isFinite(sedeNum) && slicePag.total > 0 && (
            <div className="informes-pagination">
              <span style={{ fontSize: "0.85rem", color: "#555" }}>
                Mostrando {Math.min((slicePag.cur - 1) * ROWS_PAGE + 1, slicePag.total)}–{Math.min(slicePag.cur * ROWS_PAGE, slicePag.total)} de {slicePag.total}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button type="button" className="pg-btn" disabled={slicePag.cur <= 1} onClick={() => setPage(1)}>«</button>
                <button type="button" className="pg-btn" disabled={slicePag.cur <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                <span style={{ padding: "0 0.5rem", fontSize: "0.85rem" }}>{slicePag.cur} / {slicePag.maxPage}</span>
                <button type="button" className="pg-btn" disabled={slicePag.cur >= slicePag.maxPage} onClick={() => setPage((p) => p + 1)}>›</button>
                <button type="button" className="pg-btn" disabled={slicePag.cur >= slicePag.maxPage} onClick={() => setPage(slicePag.maxPage)}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalCierreOpen && (
        <div className="informes-modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalCierreOpen(false); }}>
          <div className="informes-modal-panel informes-modal-xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="informes-modal-header">
              <h2>Nuevo cierre mensual</h2>
              <button type="button" className="informes-modal-close" onClick={() => setModalCierreOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <div className="informes-modal-body">
              <p style={{ margin: "0 0 0.85rem", color: "#555", fontSize: "0.88rem" }}>
                Elija sede y año del informe (pueden ser distintos a los filtros de la tabla). Luego el mes y <strong>Vista previa</strong>.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: 12 }}>
                <div className="filtro-grupo">
                  <label>Sede</label>
                  <select
                    value={modalSedeId}
                    onChange={(e) => { setModalSedeId(e.target.value); setPreview(null); }}
                  >
                    <option value="">Seleccionar...</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.nombre || `#${s.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="filtro-grupo">
                  <label>Año</label>
                  <select
                    value={modalYear}
                    onChange={(e) => { setModalYear(e.target.value); setPreview(null); }}
                  >
                    {añosOpciones.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="filtro-grupo" style={{ marginBottom: 12 }}>
                <label>Mes a cerrar</label>
                <select value={mesCierre} onChange={(e) => { setMesCierre(e.target.value); setPreview(null); }}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1;
                    return (
                      <option key={m} value={String(m)}>
                        {MESES_LABEL[m]}{mesYaCerradoModal(m) ? " (ya cerrado)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="informes-modal-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                <button
                  type="button"
                  className="btn-crear-entrega"
                  onClick={ejecutarPreview}
                  disabled={loadingAccion || !Number.isFinite(modalSedeNum) || !Number.isFinite(modalYearNum)}
                >
                  Vista previa
                </button>
              </div>
              {preview && (
                <>
                  <p style={{ marginTop: "1rem", color: "#666", fontSize: "0.85rem" }}>{preview.periodo?.mesNombre || `${MESES_LABEL[preview.periodo?.month]} ${preview.periodo?.year}`}</p>
                  <div className="informes-preview-grid">
                    <div className="informes-preview-item"><label>Ventas (mes)</label><span>{fmtCOP(preview.ventasMes)}</span></div>
                    <div className="informes-preview-item"><label>Dinero recogido</label><span>{fmtCOP(preview.dineroRecogidoMes)}</span></div>
                    <div className="informes-preview-item"><label>Deudas (mes)</label><span>{fmtCOP(preview.deudasMes)}</span></div>
                    <div className="informes-preview-item"><label>Deudas activas totales</label><span>{fmtCOP(preview.deudasActivasTotales)}</span></div>
                    <div className="informes-preview-item"><label>Valor inventario (costo × stock)</label><span>{fmtCOP(preview.valorInventario)}</span></div>
                    <div className="informes-preview-item"><label style={{ gridColumn: "1 / -1" }}>Órdenes (venta en mes)</label>
                      <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                        {preview.ordenesVentasMes?.numeroMin != null && preview.ordenesVentasMes?.numeroMax != null
                          ? `#${preview.ordenesVentasMes.numeroMin} — #${preview.ordenesVentasMes.numeroMax} (${preview.ordenesVentasMes.cantidad ?? 0})`
                          : `— (${preview.ordenesVentasMes?.cantidad ?? 0})`}
                      </span>
                    </div>
                  </div>
                  <div className="informes-modal-actions">
                    <button
                      type="button"
                      className="btn-limpiar-filtros"
                      onClick={() =>
                        imprimirInformeMensualDocumento(preview, () =>
                          showError(
                            "No se pudo abrir la ventana de impresión. Permita ventanas emergentes para este sitio.",
                          ),
                        )}
                      disabled={loadingAccion}
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      className="btn-crear-entrega"
                      onClick={ejecutarCerrarMes}
                      disabled={loadingAccion || mesYaCerradoModal(Number(mesCierre))}
                    >
                      Registrar cierre
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div className="informes-modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetalle(null); }}>
          <div className="informes-modal-panel informes-modal-xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="informes-modal-header">
              <h2>Detalle informe cerrado — {detalle.periodo?.mesNombre || MESES_LABEL[detalle.periodo?.month]} {detalle.periodo?.year}</h2>
              <button type="button" className="informes-modal-close" onClick={() => setDetalle(null)} aria-label="Cerrar">×</button>
            </div>
            <div className="informes-modal-body">
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: 12 }}>
                {detalle.sede?.nombre || "—"}
              </div>
              <div className="informes-preview-grid">
                <div className="informes-preview-item"><label>Ventas (mes)</label><span>{fmtCOP(detalle.ventasMes)}</span></div>
                <div className="informes-preview-item"><label>Dinero recogido</label><span>{fmtCOP(detalle.dineroRecogidoMes)}</span></div>
                <div className="informes-preview-item"><label>Deudas (mes)</label><span>{fmtCOP(detalle.deudasMes)}</span></div>
                <div className="informes-preview-item"><label>Deudas activas totales</label><span>{fmtCOP(detalle.deudasActivasTotales)}</span></div>
                <div className="informes-preview-item"><label>Valor inventario al cierre</label><span>{fmtCOP(detalle.valorInventario)}</span></div>
                <div className="informes-preview-item"><label style={{ gridColumn: "1 / -1" }}>Órdenes (venta en mes)</label>
                  <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    {detalle.ordenesVentasMes?.numeroMin != null && detalle.ordenesVentasMes?.numeroMax != null
                      ? `#${detalle.ordenesVentasMes.numeroMin} — #${detalle.ordenesVentasMes.numeroMax} (${detalle.ordenesVentasMes.cantidad ?? 0})`
                      : `— (${detalle.ordenesVentasMes?.cantidad ?? 0})`}
                  </span>
                </div>
              </div>
              <div className="informes-modal-actions">
                <button
                  type="button"
                  className="btn-limpiar-filtros"
                  onClick={() =>
                    imprimirInformeMensualDocumento(detalle, () =>
                      showError(
                        "No se pudo abrir la ventana de impresión. Permita ventanas emergentes para este sitio.",
                      ),
                    )}
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
