import "../styles/Login.css";
import logo from "../assets/logocasaglass.png";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { login, saveSession } from "../services/AuthService";
import { useAuth } from "../context/AuthContext.jsx"; 


export default function Login() {

  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const user = await login(form); // 👈 llamado al backend
      saveSession(user); // guarda usuario en localStorage
      updateUser(user); // 🔥 ACTUALIZA EL ESTADO REACTIVO

      // Redirección por rol
      if (user.rol === "ADMINISTRADOR") {
        navigate("/home", { replace: true });
      } else {
        navigate("/venderpage", { replace: true });
      }
    } catch (err) {
      console.error("Error login", err);
      const text =
        err?.response?.data ||
        err?.response?.data?.message ||
        "Usuario o contraseña inválidos";
      setMsg(String(text));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Barra izquierda */}
      <div className="login-left">
        <h1 className="title">ALUMINIOS CASAGLASS S.A.S</h1>
      </div>

      {/* Barra derecha */}
      <div className="login-right">
        <div className="formulario">
        <img className="logo"src={logo}/>
        <h2 className="welcome">INICIAR SESION</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
          type="text"
          name="username"
          placeholder="Usuario"
          value={form.username}
          onChange={handleChange}
          required/>

          <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          required/>

          <button type="submit" className="btn btn-black" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <a href="#" className="forgot">
          ¿Contraseña Olvidada? Click Aquí
        </a>
      </div>
      </div>
    </div>
  );
}


