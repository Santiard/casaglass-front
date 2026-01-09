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
    // Limpiar mensaje de error cuando el usuario empiece a escribir
    if (msg) {
      setMsg(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const user = await login(form); // 👈 llamado al backend
      saveSession(user); // guarda usuario en localStorage
      updateUser(user); //  ACTUALIZA EL ESTADO REACTIVO

      // Redirección por rol
      if (user.rol === "ADMINISTRADOR") {
        navigate("/home", { replace: true });
      } else {
        navigate("/venderpage", { replace: true });
      }
    } catch (err) {
      // Extraer mensaje de error del backend según el código de estado
      let errorMessage = "Error al iniciar sesión";
      
      if (err?.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        // Error 401: Credenciales inválidas
        if (status === 401) {
          errorMessage = "Usuario o contraseña incorrectos";
        }
        // Error 403: Acceso denegado
        else if (status === 403) {
          errorMessage = "Acceso denegado. Contacte al administrador";
        }
        // Error 500: Error del servidor
        else if (status === 500) {
          errorMessage = data?.message || "Error del servidor. Intente más tarde";
        }
        // Error 400: Solicitud inválida
        else if (status === 400) {
          errorMessage = data?.message || "Datos inválidos. Verifique su información";
        }
        // Otros errores con respuesta del servidor
        else if (data) {
          if (typeof data === 'object') {
            errorMessage = data.message || data.error || "Error al iniciar sesión";
          } else {
            errorMessage = String(data);
          }
        }
      } 
      // Error de red o conexión
      else if (err?.code === 'ECONNREFUSED' || err?.code === 'ERR_NETWORK') {
        errorMessage = "No se pudo conectar al servidor. Verifique su conexión";
      }
      // Otro tipo de error
      else if (err?.message) {
        errorMessage = err.message;
      }
      
      setMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Barra izquierda */}
      <div className="login-left">
        <h1 className="title">ALUMINIOS CASA GLASS S.A.S</h1>
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

          {msg && (
            <div className="error-message">
              {msg}
            </div>
          )}

          <button type="submit" className="btn btn-black" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}


