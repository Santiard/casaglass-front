import React from 'react';
import "../styles/Sidebar.css";
import logo from "../assets/logocasaglass.png";
import home from "../assets/home.png";
import inventario from "../assets/inventario.png";
import clientes from "../assets/clientes.png";
import ventas from "../assets/ventas.png";
import movimientos from "../assets/movimientos.png";
import Configuracion from "../assets/Configuracion.png";
import salir from "../assets/logout.png"
import { Link } from 'react-router-dom';


export default function Sidebar({isOpen}){
    return (

        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <ul>
        <li>
          <img src={logo } alt="Logo Casaglass" className="logocasaglass"/>
        </li>
        <li>
            <Link to="/home">
            <img src={home } alt="HOME " className="logos"/>
            <span className="text">Inicio</span>
          </Link>
        </li>
        <li>
          <Link to="/inventorypage">
            <img src={inventario } alt="INVENTARIO " className="logos"/>
            <span className="text">Inventario</span>
          </Link>
        </li>
        <li>
          <a href="#config">
            <img src={clientes } alt="CLIENTES " className="logos"/>
            <span className="text">Clientes</span>
          </a>
        </li>
        <li>
          <Link to ="/ventasrealizadas">
            <img src={ventas} alt="VENTAS RELIZADAS" className="logos"/>
            <span className="text">Ventas Realizadas</span>
          </Link>
        </li>
        <li>
          <a href="#config">
            <img src={movimientos } alt="MOVIMIENTOS " className="logos"/>
            <span className="text">Movimientos</span>
          </a>
        </li>
        <li>
          <Link to="/venderpage">
            <img src={ventas } alt="Vender " className="logos"/>
            <span className="text">Vender</span>
          </Link>
        </li>
        <div className="SideBar-Space">

        </div>
        <li>
          <a href="#config">
            <img src={Configuracion } alt="CONFIGURACION " className="logos"/>
            <span className="text">Configuración</span>
          </a>
        </li>
        

        <li >
            <a href="#logout">
            <img src={salir } alt="SALIR " className="logos"/>
            <span className="text">Salir</span>
          </a>
        </li>
      </ul>
    </div>

    );
}
