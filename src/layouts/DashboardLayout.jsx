// src/layouts/DashboardLayout.jsx
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Header from "../componets/Header.jsx";
import Sidebar from "../componets/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/DashboardLayout.css";

// Context para compartir el estado de la sidebar entre páginas
const SidebarContext = createContext();
export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") === "true";
  });
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  // Auto-colapsar cuando navegamos a VenderPage
  useEffect(() => {
    if (location.pathname === '/venderpage') {
      setSidebarCollapsed(true);
      localStorage.setItem("sidebarCollapsed", "true");
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      localStorage.setItem("sidebarOpen", !prev);
      return !prev;
    });
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem("sidebarCollapsed", newState);
      return newState;
    });
  };

  // Mostrar loading mientras se carga el usuario
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Cargando...
      </div>
    );
  }

  // Si no hay usuario logueado, redirigir al login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarContext.Provider value={{ 
      isSidebarCollapsed, 
      toggleSidebarCollapse,
      isSidebarOpen,
      toggleSidebar 
    }}>
      <div className="dashboard-layout" 
           data-sidebar-open={isSidebarOpen ? "true" : "false"}
           data-sidebar-collapsed={isSidebarCollapsed ? "true" : "false"}>
        <Header toggleSidebar={toggleSidebar} />
        
        <div className="dashboard-body">
          <Sidebar isOpen={isSidebarOpen} isCollapsed={isSidebarCollapsed} />
          <main className="dashboard-main">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
