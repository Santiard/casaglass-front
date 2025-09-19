// src/pages/InventoryPage.jsx
import { useState, useMemo } from "react";
import Table from "../componets/InventoryTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import "../styles/InventoryPage.css";

export default function InventoryPage() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    sede: "",
    priceMin: "",
    priceMax: "",
  });

  // Datos alineados con la tabla
  const [data] = useState([
    {
      id: 1,
      nombre: "Vidrio templado",
      categoria: "Vidrios",
      cantidadInsula: 40,
      cantidadCentro: 30,
      cantidadPatios: 30,
      precio: 100,
      precioEspecial: 90,
    },
    {
      id: 2,
      nombre: "Perfil aluminio",
      categoria: "Aluminio",
      cantidadInsula: 0,
      cantidadCentro: 18,
      cantidadPatios: 30,
      precio: 50,
      precioEspecial: 45,
    },
    {
      id: 3,
      nombre: "Bisagra acero",
      categoria: "Accesorios",
      cantidadInsula: 0,
      cantidadCentro: 0,
      cantidadPatios: 0,
      precio: 12,
      precioEspecial: 10,
    },
  ]);

  const filteredData = useMemo(() => {
    const search = (filters.search || "").toLowerCase().trim();
    const category = filters.category || "";
    const status = filters.status || "";
    const sede = filters.sede || "";

    const min = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
    const max = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

    return data
      // texto
      .filter((item) => !search || item.nombre.toLowerCase().includes(search))
      // categoría
      .filter((item) => !category || item.categoria === category)
      // sede (requiere stock en esa sede)
      .filter((item) => {
        if (!sede) return true;
        const map = {
          Insula: Number(item.cantidadInsula || 0),
          Centro: Number(item.cantidadCentro || 0),
          Patios: Number(item.cantidadPatios || 0),
        };
        return (map[sede] ?? 0) > 0;
      })
      // status derivado (Disponible si total > 0)
      .filter((item) => {
        if (!status) return true;
        const total =
          Number(item.cantidad ?? 0) ||
          Number(item.cantidadInsula || 0) +
            Number(item.cantidadCentro || 0) +
            Number(item.cantidadPatios || 0);
        const estado = total > 0 ? "Disponible" : "Agotado";
        return estado === status;
      })
      // precio (usa precio; si quieres filtrar por precioEspecial, cámbialo aquí)
      .filter((item) => {
        const precio = Number(item.precio);
        return precio >= min && precio <= max;
      });
  }, [data, filters]);

  return (
    <div>
      <h3>Filtros de búsqueda:</h3>
      <div className="filters">
        <Filter filters={filters} setFilters={setFilters} />
      </div>

      <div className="table">
        <Table data={filteredData} />
      </div>
      <div className="buttons">
        <button>Agregar producto</button>
      </div>
    </div>
  );
}