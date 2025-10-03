import { useState } from "react";
import "../styles/Header.css";
import perfil from "../assets/user.png";
import options from "../assets/options.png";
import SettingsModal from "../modals/SettingsModal.jsx";


export default function Header({ username, toggleSidebar }) {
const [openMenu, setOpenMenu] = useState(false);
const [openSettings, setOpenSettings] = useState(false);


function handleMenuToggle(){ setOpenMenu(v=>!v); }
function handleOpenSettings(e){ e.preventDefault(); setOpenSettings(true); setOpenMenu(false); }


return (
<div className="header">
<div className="hamburger" onClick={toggleSidebar}>
<img className="options" src={options} alt="Abrir menú" />
</div>


<div className="div-perfil">
<h3>{username}</h3>
<div className="perfil-container">
<button className="perfil-btn" onClick={handleMenuToggle} aria-haspopup="menu" aria-expanded={openMenu}>
<img src={perfil} alt="PERFIL" className="perfil" />
</button>


{/* Menú desplegable */}
{openMenu && (
<div className="dropdown-menu" role="menu">
<a href="#cambiar-contraseña" onClick={handleOpenSettings} role="menuitem">Cambiar contraseña</a>
<a href="#config" role="menuitem">Configuración</a>
<a href="#logout" role="menuitem">Cerrar sesión</a>
</div>
)}
</div>
</div>


{/* Modal de configuración */}
<SettingsModal open={openSettings} onClose={()=>setOpenSettings(false)} />
</div>
);
}