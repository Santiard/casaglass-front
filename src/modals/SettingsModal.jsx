import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PasswordField from "../componets/PasswordField.jsx"; // ya creado en el canvas anterior
import { updatePassword } from "../services/userService.js";
import "../styles/Modal.css";


export default function SettingsModal({ open, onClose }){
const [current, setCurrent] = useState("");
const [nextPwd, setNextPwd] = useState("");
const [confirm, setConfirm] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState(null);
const dialogRef = useRef(null);

useEffect(()=>{
const appRoot = document.getElementById("root") || document.getElementById("app");
if (open) {
document.body.classList.add("modal-open");
appRoot?.setAttribute("inert", ""); // amplia compatibilidad actual
} else {
document.body.classList.remove("modal-open");
appRoot?.removeAttribute("inert");
}
return () => {
document.body.classList.remove("modal-open");
appRoot?.removeAttribute("inert");
};
}, [open]);


// Cerrar con ESC
useEffect(()=>{
function onKey(e){ if (e.key === "Escape") onClose?.(); }
if (open) document.addEventListener("keydown", onKey);
return ()=> document.removeEventListener("keydown", onKey);
}, [open, onClose]);


// Limpiar estado al cerrar
useEffect(()=>{
if (!open) {
setCurrent(""); setNextPwd(""); setConfirm(""); setMessage(null); setLoading(false);
}
}, [open]);


const canSubmit = nextPwd.length > 0 && nextPwd === confirm && !loading;

async function onSubmit(e){
e.preventDefault();
setMessage(null);
setLoading(true);
try {
const res = await updatePassword({ current, next: nextPwd });
setMessage({ type: "ok", text: res.message || "Contraseña actualizada" });
} catch (err) {
setMessage({ type: "error", text: err.message || "No se pudo actualizar la contraseña" });
} finally {
setLoading(false);
}
}

if (!open) return null;


const modalUI = (
<div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="settings-title">
<div className="modal-backdrop" onClick={onClose} />
<div className="modal-card" ref={dialogRef}>
<header className="modal-header">
<h3 id="settings-title">Cambiar contraseña</h3>
<button className="btn icon" onClick={onClose} aria-label="Cerrar">✕</button>
</header>
<form onSubmit={onSubmit} className="modal-body" autoComplete="off">
<div className="form-row">
<label htmlFor="pwd-current">Contraseña actual</label>
<PasswordField id="pwd-current" value={current} onChange={setCurrent} placeholder="••••••••" autoComplete="current-password" />
</div>
<div className="form-row">
<label htmlFor="pwd-next">Nueva contraseña</label>
<PasswordField id="pwd-next" value={nextPwd} onChange={setNextPwd} placeholder="Mínimo 8 caracteres" autoComplete="new-password" withStrength />
</div>
<div className="form-row">
<label htmlFor="pwd-confirm">Confirmar nueva contraseña</label>
<PasswordField id="pwd-confirm" value={confirm} onChange={setConfirm} placeholder="Repite la nueva contraseña" autoComplete="new-password" mismatch={confirm.length>0 && confirm!==nextPwd} />
{confirm.length>0 && confirm!==nextPwd && (
<div className="field-hint error">Las contraseñas no coinciden.</div>
)}
</div>
{message && <div className={`callout ${message.type}`}>{message.text}</div>}


<footer className="modal-actions">
<button type="button" className="btn" onClick={onClose}>Cancelar</button>
<button type="submit" className="btn primary" disabled={!canSubmit}>{loading?"Guardando…":"Guardar"}</button>
</footer>
</form>
</div>
</div>
);
return createPortal(modalUI, document.body);
}