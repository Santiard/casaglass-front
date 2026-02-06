import { useEffect, useMemo, useState } from "react";
import TrabajadoresSection from "../componets/TrabajadoresSection.jsx";
import BancosSection from "../componets/BancosSection.jsx";
import { listarTrabajadoresTabla, cambiarPasswordTrabajador, crearTrabajador } from "../services/TrabajadoresService.js";
import { getBusinessSettings, updateBusinessSettings } from "../services/businessSettingsService.js";
import "../styles/TaxSettingsPage.css";


export default function TaxSettingsPage(){
const [loading, setLoading] = useState(true);
const [message, setMessage] = useState(null);


const [iva, setIva] = useState(0); // % - Inicializado en 0 hasta que cargue del backend
const [rete, setRete] = useState(0); // % - Inicializado en 0 hasta que cargue del backend
const [umbral, setUmbral] = useState(0);// COP - Inicializado en 0 hasta que cargue del backend
const [ica, setIca] = useState(0); // % - Inicializado en 0 hasta que cargue del backend
const [umbralIca, setUmbralIca] = useState(0);// COP - Inicializado en 0 hasta que cargue del backend


useEffect(()=>{
setLoading(true);
getBusinessSettings().then((s)=>{
if (s) {
setIva(Number(s.ivaRate));
setRete(Number(s.retefuenteRate));
setUmbral(Number(s.retefuenteThreshold));
setIca(s.icaRate != null ? Number(s.icaRate) : 0.48);
setUmbralIca(s.icaThreshold != null ? Number(s.icaThreshold) : 1000000);
}
}).finally(()=> setLoading(false));
}, []);
const canSave = iva>=0 && iva<=100 && rete>=0 && rete<=100 && umbral>=0 && ica>=0 && ica<=100 && umbralIca>=0 && !loading;


async function onSubmit(e){
e.preventDefault();
if (!canSave) return;
setMessage(null);
setLoading(true);
try {
const payload = { 
  ivaRate: Number(iva), 
  retefuenteRate: Number(rete), 
  retefuenteThreshold: Number(umbral),
  icaRate: Number(ica),
  icaThreshold: Number(umbralIca)
};
console.log('[TaxSettingsPage] Enviando payload:', payload);
await updateBusinessSettings(payload);
setMessage({ type: 'ok', text: 'Parámetros guardados' });
} catch (err) {
console.error('[TaxSettingsPage] Error guardando:', err);
setMessage({ type: 'error', text: err.message || 'No se pudieron guardar los cambios' });
} finally { setLoading(false); }
}

// Vista previa
const [preSub, setPreSub] = useState(200000);
const preview = useMemo(()=>{
// Si el precio incluye IVA, extraer el IVA del precio
// IVA = precio * (tasa / (100 + tasa))
const ivaVal = (iva && iva > 0) ? (preSub * iva) / (100 + iva) : 0;
const subtotal = preSub - ivaVal; // Subtotal sin IVA
const aplicaRete = subtotal >= (umbral||0);
const reteVal = aplicaRete ? (subtotal * (rete||0))/100 : 0;
const aplicaIca = subtotal >= (umbralIca||0);
const icaVal = aplicaIca ? (subtotal * (ica||0))/100 : 0;
const total = preSub - reteVal - icaVal; // Total final (precio con IVA - retenciones)
return { ivaVal, reteVal, icaVal, aplicaRete, aplicaIca, total, subtotal };
}, [preSub, iva, rete, umbral, ica, umbralIca]);

const fmtCOP = (n)=> new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n||0);

return (
<div className="settings-page" style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
<header className="settings-header">
  <h2>Parámetros de impuestos</h2>
  <p>Configura IVA, retención en la fuente, ICA y sus umbrales de aplicación.</p>
</header>
<section className="settings-card">
<form className="settings-form tax-grid" onSubmit={onSubmit}>
<fieldset className="tax-fieldset">
<legend>Valores</legend>
<div className="form-row">
<label htmlFor="iva">IVA (%)</label>
<div className="input-with-suffix">
<input id="iva" type="number" step="0.1" min="0" max="100" value={iva}
onChange={(e)=>setIva(Number(e.target.value))} />
<span className="suffix">%</span>
</div>
<small className="hint">0–100</small>
</div>


<div className="form-row">
<label htmlFor="rete">Retención en la fuente (%)</label>
<div className="input-with-suffix">
<input id="rete" type="number" step="0.01" min="0" max="100" value={rete}
onChange={(e)=>setRete(Number(e.target.value))} />
<span className="suffix">%</span>
</div>
<small className="hint">0–100 (precisión: 0.01%)</small>
</div>
<div className="form-row">
<label htmlFor="umbral">Umbral retención (COP)</label>
<div className="input-with-prefix">
<span className="prefix">$</span>
<input id="umbral" type="number" step="1" min="0" value={umbral}
onChange={(e)=>setUmbral(Number(e.target.value))} />
</div>
<small className="hint">Desde este monto aplica retención</small>
</div>

<div className="form-row">
<label htmlFor="ica">ICA (%)</label>
<div className="input-with-suffix">
<input id="ica" type="number" step="0.01" min="0" max="100" value={ica}
onChange={(e)=>setIca(Number(e.target.value))} />
<span className="suffix">%</span>
</div>
<small className="hint">0–100 (precisión: 0.01%)</small>
</div>

<div className="form-row">
<label htmlFor="umbralIca">Umbral ICA (COP)</label>
<div className="input-with-prefix">
<span className="prefix">$</span>
<input id="umbralIca" type="number" step="1" min="0" value={umbralIca}
onChange={(e)=>setUmbralIca(Number(e.target.value))} />
</div>
<small className="hint">Desde este monto aplica ICA</small>
</div>
</fieldset>


<section className="tax-preview">
<h4>Vista previa</h4>
<div className="form-row">
<label htmlFor="preSub">Precio con IVA incluido</label>
<div className="input-with-prefix">
<span className="prefix">$</span>
<input id="preSub" type="number" step="1000" min="0" value={preSub}
onChange={(e)=>setPreSub(Number(e.target.value))} />
</div>
</div>
<ul className="preview-list">
<li><span>Subtotal (sin IVA):</span><strong>{fmtCOP(preview.subtotal)}</strong></li>
<li><span>IVA incluido ({iva||0}%):</span><strong>{fmtCOP(preview.ivaVal)}</strong></li>
<li><span>Retención ({rete||0}%) {preview.aplicaRete ? '(aplica)' : '(no aplica)'}:</span><strong>-{fmtCOP(preview.reteVal)}</strong></li>
<li><span>ICA ({ica||0}%) {preview.aplicaIca ? '(aplica)' : '(no aplica)'}:</span><strong>-{fmtCOP(preview.icaVal)}</strong></li>
<li className="total"><span>Total a pagar:</span><strong>{fmtCOP(preview.total)}</strong></li>
</ul>
</section>
{message && <div className={`callout ${message.type}`}>{message.text}</div>}


<div className="form-actions">
<button type="submit" className="btn primary" disabled={!canSave || loading}>
{loading ? 'Guardando…' : 'Guardar cambios'}
</button>
</div>
</form>
</section>

<BancosSection />

<TrabajadoresSection
  fetchTabla={listarTrabajadoresTabla}
  onCambiarPassword={cambiarPasswordTrabajador}
  onCrear={crearTrabajador}
/>

</div>
);
}