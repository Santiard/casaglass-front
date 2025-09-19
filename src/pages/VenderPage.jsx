import { useState, useMemo } from "react";
import "../styles/VenderPage.css";
import Table from "../componets/VenderTable.jsx";
import Filter from "../componets/InventaryFilters.jsx";
import ShopCar from "../componets/ShopCar.jsx";

export default function VenderPage() {
  const [productosCarrito, setProductosCarrito] = useState([]);

  // Agregar producto al carrito con la cantidad seleccionada
  const agregarProducto = (producto, cantidad) => {
    if (cantidad <= 0) return; // No agregar si la cantidad es 0 o negativa

    const index = productosCarrito.findIndex(
      (p) => p.id === producto.id && p.precioUsado === producto.precioUsado
    );

    if (index !== -1) {
      const newCarrito = [...productosCarrito];
      newCarrito[index].cantidadVender += cantidad;
      setProductosCarrito(newCarrito);
    } else {
      setProductosCarrito([...productosCarrito, { ...producto, cantidadVender: cantidad }]);
    }
  };

  // Actualizar precio de un producto ya agregado
  const actualizarPrecio = (id, precioUsado) => {
    const index = productosCarrito.findIndex((p) => p.id === id);
    if (index !== -1) {
      const newCarrito = [...productosCarrito];
      newCarrito[index].precioUsado = precioUsado;
      setProductosCarrito(newCarrito);
    }
  };

  const limpiarCarrito = () => {
  setProductosCarrito([]);
  localStorage.removeItem("shopItems"); // también limpia localStorage
};


  // Datos de inventario
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

  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    sede: "",
    priceMin: "",
    priceMax: "",
  });

  // Filtrado de datos
  const filteredData = useMemo(() => {
    const search = (filters.search || "").toLowerCase().trim();
    const category = filters.category || "";
    const status = filters.status || "";
    const sede = filters.sede || "";

    const min = filters.priceMin !== "" ? Number(filters.priceMin) : -Infinity;
    const max = filters.priceMax !== "" ? Number(filters.priceMax) : Infinity;

    return data
      .filter((item) => !search || item.nombre.toLowerCase().includes(search))
      .filter((item) => !category || item.categoria === category)
      .filter((item) => {
        if (!sede) return true;
        const map = {
          Insula: Number(item.cantidadInsula || 0),
          Centro: Number(item.cantidadCentro || 0),
          Patios: Number(item.cantidadPatios || 0),
        };
        return (map[sede] ?? 0) > 0;
      })
      .filter((item) => {
        if (!status) return true;
        const total =
          Number(item.cantidad ?? 0) +
          Number(item.cantidadInsula || 0) +
          Number(item.cantidadCentro || 0) +
          Number(item.cantidadPatios || 0);
        const estado = total > 0 ? "Disponible" : "Agotado";
        return estado === status;
      })
      .filter((item) => {
        const precio = Number(item.precio);
        return precio >= min && precio <= max;
      });
  }, [data, filters]);

  // Subtotal y total
  const subtotal = productosCarrito.reduce(
    (acc, item) => acc + (item.precioUsado || item.precio) * item.cantidadVender,
    0
  );
  const total = subtotal * 1.19;

  return (
    <div className="contenedor">
      <div className="tablas">
        <h3>Filtros para venta:</h3>
        <div className="filters">
          <Filter filters={filters} setFilters={setFilters} />
        </div>

        <div className="table">
          <Table
            data={filteredData}
            onAgregarProducto={agregarProducto}
            onActualizarPrecio={actualizarPrecio}
          />
        </div>
      </div>

      <ShopCar productosCarrito={productosCarrito} subtotal={subtotal} total={total} limpiarCarrito={limpiarCarrito}/>
    </div>
  );
}