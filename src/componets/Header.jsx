import "../styles/Header.css";
import options from "../assets/options.png";
import perfil from "../assets/user.png";
import { useAuth } from "../context/AuthContext.jsx";
import { useSidebar } from "../layouts/DashboardLayout.jsx";


export default function Header({ toggleSidebar }) {
const { user } = useAuth();
const { isSidebarCollapsed, toggleSidebarCollapse } = useSidebar();

// Mostrar nombre del usuario y su sede
const displayName = user?.nombre || user?.username || "Usuario";
const sede = user?.sedeNombre ? ` - ${user.sedeNombre}` : "";

return (
<div className="header" data-sidebar-collapsed={isSidebarCollapsed}>
{/* Contenedor izquierdo - Botones de sidebar */}
<div className="header-left">
  {/* Botón hamburguesa para móvil */}
  <div className="hamburger mobile-only" onClick={toggleSidebar}>
    <img className="options" src={options} alt="Abrir menú" />
  </div>

  {/* Botón colapsar para desktop */}
  <div className="collapse-btn desktop-only" onClick={toggleSidebarCollapse}>
    <img 
      className="options" 
      src={options} 
      alt={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      title={isSidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
    />
  </div>
</div>

{/* Contenedor derecho - Perfil */}
<div className="div-perfil">
  <h3>{displayName}{sede}</h3>
  <img src={perfil} alt="PERFIL" className="perfil" />
</div>
</div>
);
}