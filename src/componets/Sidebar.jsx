import React from 'react';
import "../styles/Sidebar.css";
import logo from "../assets/logocasaglass.png";
import home from "../assets/home.png";
import inventario from "../assets/inventario.png";
import clientes from "../assets/clientes.png";
import ventas from "../assets/ventas.png";
import movimientos from "../assets/movimientos.png";
import Configuracion from "../assets/configuracion.png";
import salir from "../assets/logout.png";
import producto from "../assets/producto.png";
import entrega from "../assets/entrega.png";
import proveedor from "../assets/proveedor.png";
import analiticas from "../assets/analiticas.png";
import orden from "../assets/order.png";
import credito from "../assets/credito.png";
import facturas from "../assets/check.png";
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
 

export default function Sidebar({isOpen, isCollapsed}){
    const navigate = useNavigate();
    const { isAdmin, logout } = useAuth();
    
    const handleLogout = () => {
      logout();
      navigate("/", { replace: true });
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
      <ul>
        <li>
          <img src={logo } alt="Logo Casaglass" className="logocasaglass"/>
        </li>
        <li>
            <Link to="/home" title="Inicio">
            <img src={home } alt="HOME " className="logos"/>
            <span className="text">Inicio</span>
          </Link>
        </li>

        {/* Analíticas - Solo ADMIN */}{/* Analíticas - Solo ADMIN */}
        {isAdmin && (
          <li>
            <Link to ="/adminpage" title="Analíticas">
              <img src={analiticas} alt="Analiticas" className="logos"/>
              <span className="text">Analiticas</span>
            </Link>
          </li>
        )}
        {/* Inventario - Disponible para todos */}
        <li>
          <Link to="/inventorypage" title="Inventario">
            <img src={inventario } alt="INVENTARIO " className="logos"/>
            <span className="text">Inventario</span>
          </Link>
        </li>
                {/* Ingresos - Solo ADMIN */}
                {isAdmin && (
          <li>
            <Link to="/ingresos" title="Ingresos Producto">
              <img src={producto } alt="Ingresos " className="logos"/>
              <span className="text">Ingresos Producto</span>
            </Link>
          </li>
        )}
                {/* Entregas - Solo ADMIN */}
                {isAdmin && (
          <li>
            <Link to="/entregas" title="Entregas Dinero">
              <img src={entrega } alt="Entregas " className="logos"/>
              <span className="text">Entregas Dinero</span>
            </Link>
          </li>
        )}
        <li>
          <Link to="/venderpage" title="Vender">
            <img src={ventas } alt="Vender " className="logos"/>
            <span className="text">Vender</span>
          </Link>
        </li>
        <li>
          <Link to ="/creditos" title="Créditos">
          <img src={credito} alt="Créditos " className="logos"/>
          <span className="text">Créditos</span>
        </Link>
        </li>
        <li>
          <Link to ="/ordenes" title="Órdenes de Compra">
          <img src={orden} alt="Órdenes de Compra " className="logos"/>
          <span className="text">Órdenes de Compra</span>
          </Link>
        </li>
        {/* Configuración - Solo ADMIN */}
        {isAdmin && (
          <li>
            <Link to ="/facturas" title="facturas">
              <img src={facturas } alt="FACTURAS " className="logos"/>
              <span className="text">Facturas</span>
            </Link>
          </li>
        )}
        <li>
            <Link to="/movimientos" title="Movimientos">
              <img src={movimientos } alt="TRASLADOS " className="logos"/>
              <span className="text">Traslados</span>
            </Link>
        </li>
        
        <li>
          <Link to="/clientes" title="Clientes">
            <img src={clientes } alt="CLIENTES " className="logos"/>
            <span className="text">Clientes</span>
          </Link>
        </li>       
        
        {/* Proveedores - Solo ADMIN */}
        {isAdmin && (
          <li>
            <Link to ="/proveedores" title="Proveedores">
              <img src={proveedor} alt="Proveedores " className="logos"/>
              <span className="text">Proveedores</span>
            </Link>
          </li>
        )}
        <div className="SideBar-Space">

        </div>
        {/* Configuración - Solo ADMIN */}
        {isAdmin && (
          <li>
            <Link to ="/tax-settings" title="Configuración">
              <img src={Configuracion } alt="CONFIGURACION " className="logos"/>
              <span className="text">Configuración</span>
            </Link>
          </li>
        )}
        

        <li >
            <a href="#logout" onClick={handleLogout} title="Salir">
            <img src={salir } alt="SALIR " className="logos"/>
            <span className="text">Salir</span>
          </a>
        </li>
      </ul>
    </div>

    );
}
