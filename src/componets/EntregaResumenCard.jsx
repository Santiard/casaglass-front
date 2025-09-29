// Tarjeta con resumen y montos
export default function EntregaResumenCard({
  sede,
  empleado,
  fechaEntrega,
  fechaDesde,
  fechaHasta,
  modalidad,
  estado,
  numeroComprobante,
  observaciones,
  montoEsperado,
  montoGastos,
  montoEntregado,
  diferencia,
  onCambiarEstado
}) {
  const pill = (text, kind="default") => (
    <span
      className={`badge ${kind}`}
      style={{
        padding: "4px 8px",
        borderRadius: 12,
        fontSize: 12,
        background: kind==="ok" ? "#e8fff1"
                 : kind==="warn" ? "#fff6e5"
                 : kind==="danger" ? "#ffe8e8"
                 : "#eef2ff",
        color:   kind==="ok" ? "#0f7b47"
                 : kind==="warn" ? "#7a4b00"
                 : kind==="danger" ? "#8b1a1a"
                 : "#1e2753",
        border:  "1px solid rgba(0,0,0,0.06)"
      }}
    >
      {text}
    </span>
  );

  const estadoKind = {
    PENDIENTE: "warn",
    ENTREGADA: "ok",
    VERIFICADA: "default",
    RECHAZADA: "danger"
  }[estado ?? "PENDIENTE"] || "default";

  return (
    <div
      className="card"
      style={{
        display:"grid",
        gridTemplateColumns:"1.2fr 1fr",
        gap:16,
        background:"#fff",
        border:"1px solid #e6e8f0",
        borderRadius:12,
        padding:16
      }}
    >
      {/* Info principal */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <Field label="Sede" value={sede} />
        <Field label="Empleado" value={empleado} />
        <Field label="Fecha entrega" value={fechaEntrega} />
        <Field label="Rango (desde - hasta)" value={`${fechaDesde} — ${fechaHasta}`} />
        <Field label="Modalidad" value={pill(modalidad || "-")} />
        <Field label="Estado" value={pill(estado || "-", estadoKind)} />
        <Field label="Comprobante" value={numeroComprobante || "-"} />
        <Field label="Observaciones" value={observaciones || "-"} full />
      </div>

      {/* Montos */}
      <div
        style={{
          display:"grid",
          gridTemplateRows:"repeat(4, minmax(50px, auto))",
          gap:8,
          background:"#fafbff",
          border:"1px solid #e6e8f0",
          borderRadius:10,
          padding:12
        }}
      >
        <Amount label="Monto esperado" value={montoEsperado} />
        <Amount label="Gastos" value={montoGastos} />
        <Amount label="Entregado" value={montoEntregado} />
        <Amount
          label="Diferencia"
          value={diferencia}
          highlight
        />
        {onCambiarEstado && (
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button className="btn" onClick={() => onCambiarEstado("ENTREGADA")}>Marcar ENTREGADA</button>
            <button className="btn" onClick={() => onCambiarEstado("VERIFICADA")}>Marcar VERIFICADA</button>
            <button className="btn" onClick={() => onCambiarEstado("RECHAZADA")}>Marcar RECHAZADA</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, full }) {
  return (
    <div style={{ display:"grid", gap:4, gridColumn: full ? "1 / -1" : "auto" }}>
      <div style={{ fontSize:12, opacity:.7 }}>{label}</div>
      <div style={{ fontWeight:600 }}>{value}</div>
    </div>
  );
}

function Amount({ label, value, highlight }) {
  return (
    <div
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background: highlight ? "#fff6e5" : "white",
        border:"1px solid #e6e8f0",
        borderRadius:8,
        padding:"8px 10px"
      }}
    >
      <div style={{ opacity:.8 }}>{label}</div>
      <div style={{ fontWeight:700 }}>{value}</div>
    </div>
  );
}
