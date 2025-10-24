// src/componets/MovimientosTable.jsx
import "../styles/Table.css";
import { useMemo, useState, Fragment } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import editar from "../assets/editar.png";
import add from "../assets/add.png";
import MovimientoModal from "../modals/MovimientoModal.jsx";

// Helper local para asegurar YYYY-MM-DD
const toLocalDateOnly = (val) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  // Si ya viene como YYYY-MM-DD, devolver tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return new Date().toISOString().slice(0, 10);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000) // normaliza TZ
    .toISOString()
    .slice(0, 10);
};

export default function MovimientosTable({
  data = [],
  rowsPerPage = 10,
  loading = false,
  sedes = [],
  catalogoProductos = [],
  onCrear,
  onActualizar,
  onEliminar,
  onConfirmar,
}) {
  const { isAdmin, user } = useAuth(); // Obtener rol y datos del usuario
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState(null);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const fmtFecha = (iso) =>
    iso
      ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const diaDeSemana = (iso) =>
    iso
      ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
          weekday: "long",
        })
      : "-";

  const handleSaveMovimiento = async (form, isEdit) => {
    try {
      if (isEdit) {
        // Para editar la CABECERA, el backend espera:
        // { fecha: "YYYY-MM-DD", sedeOrigen:{id}, sedeDestino:{id} }
        await onActualizar?.(movimientoEditando.id, {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        });
      } else {
        // Para crear, el modal ya construye el payload correcto:
        // { fecha, sedeOrigen:{id}, sedeDestino:{id}, detalles:[{producto:{id}, cantidad}] }
        await onCrear?.(form);
      }
      setIsModalOpen(false);
      setMovimientoEditando(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data || e?.message || "Error al guardar el traslado.");
    }
  };

  const handleConfirmarTraslado = async (trasladoId) => {
    if (window.confirm("¿Confirmas que has recibido este traslado?")) {
      try {
        const response = await onConfirmar(trasladoId, user?.id);
        // Mostrar mensaje de éxito si la respuesta incluye un mensaje
        if (response?.message) {
          alert(response.message);
        } else {
          alert("Traslado confirmado exitosamente");
        }
      } catch (e) {
        console.error("Error confirmando traslado:", e);
        const errorMsg = e?.response?.data?.message || e?.message || "Error al confirmar el traslado";
        alert(errorMsg);
      }
    }
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = q
      ? data.filter((m) =>
          [
            m.sedeOrigen?.nombre,
            m.sedeDestino?.nombre,
            m.fecha,
            ...(Array.isArray(m.detalles)
              ? m.detalles.map(
                  (d) => `${d.producto?.nombre ?? ""} ${d.producto?.codigo ?? ""}`
                )
              : []),
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : data;

    // 🔹 Ordenar por fecha descendente (más recientes primero)
    arr = arr.sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA; // Descendente (más reciente primero)
    });

    const total = arr.length;
    const maxPage = Math.max(1, Math.ceil(total / rowsPerPage));
    const curPage = Math.min(page, maxPage);
    const start = (curPage - 1) * rowsPerPage;
    const pageData = arr.slice(start, start + rowsPerPage);
    return { pageData, total, maxPage, curPage };
  }, [data, query, page, rowsPerPage]);

  const { pageData, total, maxPage, curPage } = filtrados;

  return (
    <div className="table-container">
      <div className="toolbar">
        <input
          className="clientes-input"
          type="text"
          placeholder="Buscar traslado..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>{total} registro(s)</span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={curPage <= 1}
          >
            ◀
          </button>
          <span>
            {curPage}/{maxPage}
          </span>
          <button
            className="btn"
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={curPage >= maxPage}
          >
            ▶
          </button>

          {/* Botón Nuevo solo para ADMINISTRADORES */}
          {isAdmin && (
            <button
              onClick={() => {
                setMovimientoEditando(null);
                setIsModalOpen(true);
              }}
              className="addButton"
            >
              <img src={add} className="iconButton" alt="Agregar" />
              Nuevo traslado
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Sede origen</th>
              <th>Sede destino</th>
              <th>Fecha</th>
              <th>Día</th>
              <th>Ítems</th>
              <th>Estado</th>
              <th>Confirmado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="empty">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading &&
              pageData.map((mov) => {
                const id = mov.id;
                const detalles = Array.isArray(mov.detalles) ? mov.detalles : [];
                return (
                  <Fragment key={id}>
                    <tr>
                      <td>{mov.sedeOrigen?.nombre ?? "-"}</td>
                      <td>{mov.sedeDestino?.nombre ?? "-"}</td>
                      <td>{fmtFecha(mov.fecha)}</td>
                      <td>{diaDeSemana(mov.fecha)}</td>
                      <td>
                        <span className="badge">{detalles.length}</span>
                      </td>
                      <td>
                        {mov.trabajadorConfirmacion ? (
                          <span className="badge" style={{ backgroundColor: '#22c55e' }}>Confirmado</span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: '#f59e0b' }}>Pendiente</span>
                        )}
                      </td>
                      <td>
                        {mov.trabajadorConfirmacion?.nombre ? (
                          <span>{mov.trabajadorConfirmacion.nombre}</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td>
                        {/* Botón Ver Detalles - Siempre visible */}
                        <button
                          className="btnLink"
                          onClick={() => toggleExpand(id)}
                          type="button"
                        >
                          {expanded[id] ? "Ocultar" : "Ver Detalles"}
                        </button>

                        {/* Botones solo para ADMINISTRADORES */}
                        {isAdmin && (
                          <>
                            <button
                              className="btnEdit"
                              onClick={() => {
                                setMovimientoEditando(mov);
                                setIsModalOpen(true);
                              }}
                              title="Editar traslado"
                              type="button"
                            >
                              <img src={editar} className="iconButton" alt="Editar" />
                            </button>

                            <button
                              className="btn"
                              onClick={() => onEliminar?.(mov.id)}
                              type="button"
                              title="Eliminar traslado"
                            >
                              Eliminar
                            </button>
                          </>
                        )}

                        {/* Botón Confirmar Recepción solo para VENDEDORES y si no está confirmado */}
                        {!isAdmin && !mov.trabajadorConfirmacion && (
                          <button
                            className="btn"
                            onClick={() => handleConfirmarTraslado(mov.id)}
                            type="button"
                            title="Confirmar recepción del traslado"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            Confirmar Recepción
                          </button>
                        )}

                        {/* Mensaje para vendedores si ya está confirmado */}
                        {!isAdmin && mov.trabajadorConfirmacion && (
                          <span style={{ color: '#22c55e', fontSize: '0.9rem' }}>
                            ✓ Ya confirmado
                          </span>
                        )}
                      </td>
                    </tr>

                    {expanded[id] && (
                      <tr>
                        <td colSpan={8}>
                          {detalles.length === 0 ? (
                            <div className="empty-sub">Sin productos.</div>
                          ) : (
                            <ul>
                              {detalles.map((d, i) => (
                                <li key={d.id ?? i}>
                                  {d.producto?.nombre ?? "-"} — {d.cantidad ?? 0}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <MovimientoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMovimientoEditando(null);
        }}
        onSave={handleSaveMovimiento}
        movimiento={movimientoEditando}
        sedes={sedes}
        catalogoProductos={catalogoProductos}
      />
    </div>
  );
}
