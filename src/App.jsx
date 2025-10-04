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
import IngresosPage from "./pages/IngresoPage.jsx";
import ProveedrorPage from "./pages/ProveedoresPage.jsx";
import EntregasPage from "./pages/EntregaPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import TaxSettingsPage from "./pages/TaxSettingsPage.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta sin layout */}
        <Route path="/" element={<Login />} />

        {/* Rutas que SÍ usan layout */}
        <Route element={<DashboardLayout username="Nicole Velandia" />}>
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/inventorypage" element={<InventoryPage />} />
          <Route path="/venderpage" element={<VenderPage/>}/>
          <Route path="/analiticas" element={<VentasRealizadasPage/>}/>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/movimientos" element={<MovimientosPage />} />
          <Route path="/ingresos" element={<IngresosPage />} />
          <Route path="/proveedores" element={< ProveedrorPage/>}/>
          <Route path="/entregas" element={<EntregasPage/>}/>
          <Route path="/home"  element={<HomePage/>}/>
          <Route path="/tax-settings" element={<TaxSettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;