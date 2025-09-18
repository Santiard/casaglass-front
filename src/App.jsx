// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta sin layout */}
        <Route path="/" element={<Login />} />

        {/* Rutas que SÍ usan layout */}
        <Route element={<DashboardLayout username="Nicole Velandia" />}>
          <Route path="/home" element={<Home />} />
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/inventorypage" element={<InventoryPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;