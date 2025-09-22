import React, { useState, useEffect } from 'react';
import { Outlet } from "react-router-dom";
import Header from "../componets/Header.jsx";
import Sidebar from "../componets/Sidebar.jsx";
import "../styles/DashboardLayout.css";

export default function DashboardLayout({ username }) {
  // lee estado inicial de localStorage
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") === "true";
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      localStorage.setItem("sidebarOpen", !prev);
      return !prev
    });
  };

  return (
    <div className="dashboard-layout">
      <Header username={username} toggleSidebar={toggleSidebar} />
      <div className="dashboard-body">
        {/* Pasamos isSidebarOpen como prop */}
        <Sidebar isOpen={isSidebarOpen} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
