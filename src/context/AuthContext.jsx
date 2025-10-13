// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getSession, logout as logoutService } from "../services/AuthService.js";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario al inicializar
  useEffect(() => {
    const loadUser = () => {
      const sessionUser = getSession();
      setUser(sessionUser);
      setLoading(false);
    };
    
    loadUser();
  }, []);

  // Función para actualizar usuario (llamar después del login)
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Función para logout
  const logout = () => {
    logoutService(); // Limpia localStorage
    setUser(null); // Limpia estado
  };

  const value = {
    user,
    loading,
    updateUser,
    logout,
    isLoggedIn: !!user,
    isAdmin: user?.rol === "ADMINISTRADOR",
    isUser: user?.rol === "VENDEDOR",
    sede: user?.sedeNombre,
    sedeId: user?.sedeId,
    hasRole: (role) => user?.rol === role,
    hasSede: (sedeNombre) => user?.sedeNombre === sedeNombre,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de AuthProvider");
  }
  
  return context;
}