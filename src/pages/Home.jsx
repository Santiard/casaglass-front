// src/pages/Home.jsx
import "../styles/Home.css";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user, isAdmin, sede } = useAuth();

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="home">
      <h1>
        {isAdmin ? "Panel de Administración" : "Control de la sede"}
      </h1>
      <p>
        Bienvenido, <strong>{user.nombre}</strong>
        {sede && ` - Sede: ${sede}`}
      </p>
      <div className="user-info">
        <p>Rol: <span className="badge">{user.rol}</span></p>
        {user.sedeId && <p>ID Sede: {user.sedeId}</p>}
      </div>
      {/* Aquí tus cards, tablas, etc. */}
    </div>
  );
}
