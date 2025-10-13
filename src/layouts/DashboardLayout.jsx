// src/layouts/DashboardLayout.jsx
import React, { useState } from 'react';
import { Outlet, Navigate } from "react-router-dom";
import Header from "../componets/Header.jsx";
import Sidebar from "../componets/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/DashboardLayout.css";

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") === "true";
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      localStorage.setItem("sidebarOpen", !prev);
      return !prev;
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
    <div className="dashboard-layout" data-sidebar-open={isSidebarOpen ? "true" : "false"}>
      <Header toggleSidebar={toggleSidebar} />
      <div className="dashboard-body">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
