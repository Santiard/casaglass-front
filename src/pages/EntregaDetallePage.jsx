import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Table.css";
import EntregaResumenCard from "../componets/EntregaResumenCard.jsx";
import EntregaOrdenesTable from "../componets/EntregaOrdenesTable.jsx";
import EntregaGastosTable from "../componets/EntregaGastosTable.jsx";
import { ENTREGAS_MOCK, getEntregaById } from "../mocks/entregasMocks.js";

export default function EntregaDetallePage() {
  const { id } = useParams();
  const nav = useNavigate();

  const entrega = useMemo(() => getEntregaById(id), [id]);

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));

  const fmtFechaHora = (iso) => {
    const d = new Date(iso);
    return isNaN(d)
      ? "-"
      : d.toLocaleString("es-CO", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  };

  if (!entrega) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <button className="btn" onClick={() => nav(-1)}>← Volver</button>
        </div>
        No se encontró la entrega con id <strong>{id}</strong>.
        <div style={{ marginTop: 8 }}>
          Prueba con:{" "}
          <button className="btnLink" onClick={() => nav("/entregas/1")}>/entregas/1</button>{" "}
          o{" "}
          <button className="btnLink" onClick={() => nav("/entregas/2")}>/entregas/2</button>
        </div>
      </div>
    );
  }

  const detalles = Array.isArray(entrega.detalles) ? entrega.detalles : [];
  const gastos   = Array.isArray(entrega.gastos)   ? entrega.gastos   : [];

  return (
    <div className="page-entrega" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <button className="btn" type="button" onClick={() => nav(-1)}>← Volver</button>
        <h1 style={{ margin:0, flex:1 }}>Entrega #{entrega.id}</h1>
        <button className="btn" onClick={() => console.log("Editar entrega (mock)", entrega)}>Editar</button>
      </div>

      {/* Resumen */}
      <EntregaResumenCard
        sede={entrega?.sede?.nombre}
        empleado={entrega?.empleado?.nombre}
        fechaEntrega={fmtFechaHora(entrega?.fechaEntrega)}
        fechaDesde={entrega?.fechaDesde ? fmtFechaHora(entrega.fechaDesde) : "-"}
        fechaHasta={entrega?.fechaHasta ? fmtFechaHora(entrega.fechaHasta) : "-"}
        modalidad={entrega?.modalidadEntrega}
        estado={entrega?.estado}
        numeroComprobante={entrega?.numeroComprobante}
        observaciones={entrega?.observaciones}
        montoEsperado={fmtCOP(entrega?.montoEsperado)}
        montoGastos={fmtCOP(entrega?.montoGastos)}
        montoEntregado={fmtCOP(entrega?.montoEntregado)}
        diferencia={fmtCOP(entrega?.diferencia)}
        onCambiarEstado={(nuevo) => console.log("Cambiar estado (mock) a", nuevo)}
      />

      {/* Órdenes / Gastos */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <EntregaOrdenesTable detalles={detalles} />
        <EntregaGastosTable gastos={gastos} />
      </div>

      {/* Tips para navegar con mock */}
      <div style={{ marginTop: 8, fontSize: 12, opacity: .75 }}>
        Mock cargado desde <code>ENTREGAS_MOCK</code> •
        Ir a: <button className="btnLink" onClick={() => nav("/entregas/1")}>/entregas/1</button> |{" "}
        <button className="btnLink" onClick={() => nav("/entregas/2")}>/entregas/2</button>
      </div>
    </div>
  );
}
