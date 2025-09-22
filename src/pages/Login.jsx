import "../styles/Login.css";
import logo from "../assets/logocasaglass.png";
import { useNavigate } from "react-router-dom";
import react from "react";


export default function Login() {

    const navigate = useNavigate();

    const handleSubmit = (e) =>{
        e.preventDefault();
        navigate("/home");
    }
  return (
    <div className="login-container">
      {/* Barra izquierda */}
      <div className="login-left">
        <h1 className="title">ALUMINIOS CASAGLASS</h1>
        <p className="subtitle">
          AQUI IRIA EL ESLOGAN
        </p>
      </div>

      {/* Barra derecha */}
      <div className="login-right">
        <div className="formulario">
        <img className="logo"src={logo}/>
        <h2 className="welcome">INICIAR SESION</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <input type="text" placeholder="Usuario" />
          <input type="password" placeholder="Contraseña" />

          <button type="submit" className="btn btn-black">
            Iniciar Sesión
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


