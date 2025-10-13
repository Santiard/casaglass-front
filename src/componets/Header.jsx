import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";
import perfil from "../assets/user.png";
import options from "../assets/options.png";
import SettingsModal from "../modals/SettingsModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";


export default function Header({ toggleSidebar }) {
const [openMenu, setOpenMenu] = useState(false);
const [openSettings, setOpenSettings] = useState(false);
const { user, logout } = useAuth();
const navigate = useNavigate();

function handleMenuToggle(){ setOpenMenu(v=>!v); }
function handleOpenSettings(e){ e.preventDefault(); setOpenSettings(true); setOpenMenu(false); }
function handleLogout(e){ 
  e.preventDefault(); 
  logout(); 
  navigate("/", { replace: true }); 
}

// Mostrar nombre del usuario y su sede
const displayName = user?.nombre || user?.username || "Usuario";
const sede = user?.sedeNombre ? ` - ${user.sedeNombre}` : "";

return (
<div className="header">
<div className="hamburger" onClick={toggleSidebar}>
<img className="options" src={options} alt="Abrir menú" />
</div>


<div className="div-perfil">
<h3>{displayName}{sede}</h3>
<div className="perfil-container">
<button className="perfil-btn" onClick={handleMenuToggle} aria-haspopup="menu" aria-expanded={openMenu}>
<img src={perfil} alt="PERFIL" className="perfil" />
</button>


{/* Menú desplegable */}
{openMenu && (
<div className="dropdown-menu" role="menu">
<a href="#cambiar-contraseña" onClick={handleOpenSettings} role="menuitem">Cambiar contraseña</a>
<a href="#config" role="menuitem">Configuración</a>
<a href="#logout" onClick={handleLogout} role="menuitem">Cerrar sesión</a>
</div>
)}
</div>
</div>


{/* Modal de configuración */}
<SettingsModal open={openSettings} onClose={()=>setOpenSettings(false)} />
</div>
);
}