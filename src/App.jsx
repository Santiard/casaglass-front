// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import VenderPage from "./pages/VenderPage.jsx";
import ClientesPage from "./pages/ClientesPage.jsx";
import MovimientosPage from "./pages/MovimientosPage.jsx";
import IngresosPage from "./pages/IngresoPage.jsx";
import ProveedrorPage from "./pages/ProveedoresPage.jsx";
import EntregasPage from "./pages/EntregaPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import TaxSettingsPage from "./pages/TaxSettingsPage.jsx";
import CortesPage from "./pages/CortesPage.jsx";
import OrdenesPage from "./pages/OrdenesPage.jsx";
import CreditosPage from "./pages/CreditosPage.jsx";
import AbonoPage from "./pages/AbonoPage.jsx";
import CreditosEspecialesPage from "./pages/CreditosEspecialesPage.jsx";
import FacturasPage from "./pages/FacturasPage.jsx";
import ReembolsosPage from "./pages/ReembolsosPage.jsx";
import EstadoCuentaPage from "./pages/EstadoCuentaPage.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

/**
 * Configuración del basename para React Router
 * 
 * La app se sirve en /web/ por lo que React Router necesita este basename
 * para que las rutas funcionen correctamente.
 */
const routerBasename = '/web';

function App() {
  // Silenciar warning de "Components desaprobado" de DevTools
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, []);

  return (
    <Router basename={routerBasename}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          {/* Ruta sin layout */}
          <Route path="/" element={<Login />} />

          {/* Rutas que SÍ usan layout */}
          <Route element={<DashboardLayout />}>
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/inventorypage" element={<InventoryPage />} />
          <Route path="/venderpage" element={<VenderPage/>}/>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/movimientos" element={<MovimientosPage />} />
          <Route path="/ingresos" element={<IngresosPage />} />
          <Route path="/proveedores" element={< ProveedrorPage/>}/>
          <Route path="/entregas" element={<EntregasPage/>}/>
          <Route path="/home"  element={<HomePage/>}/>
          <Route path="/tax-settings" element={<TaxSettingsPage />} />
          <Route path="/cortes" element={<CortesPage />} />
          <Route path="/ordenes" element={<OrdenesPage />} />
          <Route path="/creditos" element={<CreditosPage />} />
          <Route path="/abono" element={<AbonoPage />} />
          <Route path="/facturas" element={<FacturasPage/>}/>
          <Route path="/reembolsos" element={<ReembolsosPage />} />
          <Route path="/creditos-especiales" element={<CreditosEspecialesPage />} />
          <Route path="/estado-cuenta" element={<EstadoCuentaPage />} />
        </Route>
      </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;