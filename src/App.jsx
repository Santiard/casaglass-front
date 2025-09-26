// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import VenderPage from "./pages/VenderPage.jsx";
import VentasRealizadasPage from "./pages/VentasRealizadasPage.jsx";
import ClientesPage from "./pages/ClientesPage.jsx";
import MovimientosPage from "./pages/MovimientosPage.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta sin layout */}
        <Route path="/" element={<Login />} />

        {/* Rutas que SÍ usan layout */}
        <Route element={<DashboardLayout username="Nicole Velandia" />}>
          <Route path="/home" element={<Home sede="Insula"/>} />
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/inventorypage" element={<InventoryPage />} />
          <Route path="/venderpage" element={<VenderPage/>}/>
          <Route path="/ventasrealizadas" element={<VentasRealizadasPage/>}/>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/movimientos" element={<MovimientosPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;