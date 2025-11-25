import { useEffect, useMemo, useState, useRef } from "react";
import "../styles/MovimientoNuevoModal.css";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import { listarClientes } from "../services/ClientesService.js";
import { listarSedes } from "../services/SedesService.js";
import { listarTrabajadores } from "../services/TrabajadoresService.js";
import { listarProductos } from "../services/ProductosService.js";
import { listarCategorias } from "../services/CategoriasService.js";
import { actualizarOrden, obtenerOrden, actualizarOrdenVenta, crearOrdenVenta } from "../services/OrdenesService.js";
import { useToast } from "../context/ToastContext.jsx";
import eliminar from "../assets/eliminar.png";

import { api } from "../lib/api";
// Utilidad para formato de fecha
const toLocalDateOnly = (val) => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return new Date().toISOString().slice(0, 10);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function OrdenEditarModal({
  orden,
  isOpen,
  onClose,
  onSave, // función del padre (OrdenesPage -> fetchData)
  productosCarrito = null, // Productos del carrito para crear orden nueva
  defaultTrabajadorId = null,
  defaultTrabajadorNombre = "",
  defaultSedeId = null,
  defaultSedeNombre = "",
  cortesPendientes = [],
}) {
  const [form, setForm] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchModal, setClienteSearchModal] = useState(""); // Búsqueda dentro del modal
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState(""); // Método de pago seleccionado
  const [transferencias, setTransferencias] = useState([]); // Array de transferencias [{ banco: "", monto: 0 }]
  const [observacionesAdicionales, setObservacionesAdicionales] = useState(""); // Observaciones sin método de pago
  const [errorMsg, setErrorMsg] = useState("");
  
  // Lista de bancos
  const bancos = [
    "BANCOLOMBIA",
    "DAVIVIENDA",
    "BANCO DE BOGOTA",
    "NEQUI",
    "DAVIPLATA"
  ];
  
  // Función para parsear la descripción y extraer método de pago y transferencias
  const parsearDescripcion = (descripcion) => {
    if (!descripcion) return { metodoPago: "", transferencias: [], observaciones: "" };
    
    // Buscar patrón: "Método de pago: TRANSFERENCIA"
    const metodoPagoMatch = descripcion.match(/Método de pago:\s*(\w+)/i);
    const metodoPagoExtraido = metodoPagoMatch ? metodoPagoMatch[1].toUpperCase() : "";
    
    // Buscar todas las transferencias: "Transferencia: BANCO - Monto: $XXX"
    const transferenciasExtraidas = [];
    if (metodoPagoExtraido === "TRANSFERENCIA") {
      const transferenciaRegex = /Transferencia:\s*([^-]+?)\s*-\s*Monto:\s*\$?([\d.,]+)/gi;
      let match;
      while ((match = transferenciaRegex.exec(descripcion)) !== null) {
        const banco = match[1].trim();
        const montoStr = match[2].replace(/[,.]/g, '');
        const monto = parseFloat(montoStr) || 0;
        if (banco && monto > 0) {
          transferenciasExtraidas.push({ banco, monto });
        }
      }
    }
    
    // Extraer observaciones (todo lo que no sea método de pago ni transferencias)
    let observaciones = descripcion
      .replace(/Método de pago:.*?(?:\n|$)/i, '')
      .replace(/Transferencia:.*?(?:\n|$)/gi, '')
      .trim();
    
    return {
      metodoPago: metodoPagoExtraido,
      transferencias: transferenciasExtraidas,
      observaciones: observaciones
    };
  };
  
  // Función para construir la descripción completa
  const construirDescripcion = (metodo, transferenciasArray, observaciones) => {
    let descripcionCompleta = "";
    
    if (metodo) {
      descripcionCompleta = `Método de pago: ${metodo}`;
      
      if (metodo === "TRANSFERENCIA" && transferenciasArray.length > 0) {
        transferenciasArray.forEach((transf) => {
          if (transf.banco && transf.monto > 0) {
            const montoFormateado = transf.monto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            descripcionCompleta += `\nTransferencia: ${transf.banco} - Monto: $${montoFormateado}`;
          }
        });
      }
      
      if (observaciones) {
        descripcionCompleta += `\n${observaciones}`;
      }
    } else if (observaciones) {
      descripcionCompleta = observaciones;
    }
    
    return descripcionCompleta;
  };
  
  // Función para agregar una nueva transferencia
  const agregarTransferencia = () => {
    setTransferencias([...transferencias, { banco: "", monto: 0 }]);
  };
  
  // Función para eliminar una transferencia
  const eliminarTransferencia = (index) => {
    const nuevasTransferencias = transferencias.filter((_, i) => i !== index);
    setTransferencias(nuevasTransferencias);
    // Actualizar descripción
    const nuevaDescripcion = construirDescripcion(metodoPago, nuevasTransferencias, observacionesAdicionales);
    handleChange("descripcion", nuevaDescripcion);
  };
  
  // Función para actualizar una transferencia
  const actualizarTransferencia = (index, campo, valor) => {
    const nuevasTransferencias = [...transferencias];
    nuevasTransferencias[index] = { ...nuevasTransferencias[index], [campo]: valor };
    setTransferencias(nuevasTransferencias);
    // Actualizar descripción
    const nuevaDescripcion = construirDescripcion(metodoPago, nuevasTransferencias, observacionesAdicionales);
    handleChange("descripcion", nuevaDescripcion);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();
  const matchHechoRef = useRef({ ordenId: null, hecho: false });

  // =============================
  // Cargar datos iniciales
  // =============================
  useEffect(() => {
    if (!isOpen) {
      // Resetear formulario cuando se cierra el modal
      setForm(null);
      setIsLoading(false);
      setErrorMsg("");
      setMetodoPago("");
      setTransferencias([]);
      setObservacionesAdicionales("");
      setClienteSearch("");
      setClienteSearchModal("");
      setShowClienteModal(false);
      matchHechoRef.current = { ordenId: null, hecho: false }; // Resetear el flag cuando se cierra el modal
      return;
    }
    
    // Si no hay orden, es modo creación desde el carrito
    if (!orden) {
      if (productosCarrito && productosCarrito.length > 0) {
        // Inicializar formulario con productos del carrito
        const base = {
          id: null,
          fecha: new Date().toISOString().split('T')[0],
          obra: "",
          descripcion: "",
          venta: true,
          credito: false,
          descuentos: 0,
          clienteNombre: "",
          trabajadorNombre: defaultTrabajadorNombre || "",
          sedeNombre: defaultSedeNombre || "",
          clienteId: "",
          trabajadorId: defaultTrabajadorId ? String(defaultTrabajadorId) : "",
          sedeId: defaultSedeId ? String(defaultSedeId) : "",
          items: productosCarrito.map((p) => {
            const item = {
              id: null,
              // Cuando es un corte, p.id es string (corte_...) y el id real del producto viene en p.productoOriginal
              productoId: Number((p.productoOriginal ?? p.id) ?? 0) || null,
              codigo: p.codigo ?? "",
              nombre: p.nombre ?? "",
              descripcion: p.nombre ?? "",
              cantidad: Number(p.cantidadVender ?? 1),
              precioUnitario: Number(p.precioUsado ?? 0),
              totalLinea: Number((p.precioUsado ?? 0) * (p.cantidadVender ?? 1)),
              eliminar: false,
            };
            // Si es un corte que debe reutilizar un existente, agregar el ID
            if (p.reutilizarCorteSolicitadoId) {
              item.reutilizarCorteSolicitadoId = Number(p.reutilizarCorteSolicitadoId);
            }
            return item;
          }),
        };
        setForm(base);
        setClienteSearch("");
        // Resetear método de pago y transferencias al crear nueva orden
        setMetodoPago("");
        setTransferencias([]);
        setObservacionesAdicionales("");
      } else {
        // Modo creación vacío (sin productos del carrito)
        const base = {
          id: null,
          fecha: new Date().toISOString().split('T')[0],
          obra: "",
          descripcion: "",
          venta: true,
          credito: false,
          descuentos: 0,
          clienteNombre: "",
          trabajadorNombre: defaultTrabajadorNombre || "",
          sedeNombre: defaultSedeNombre || "",
          clienteId: "",
          trabajadorId: defaultTrabajadorId ? String(defaultTrabajadorId) : "",
          sedeId: defaultSedeId ? String(defaultSedeId) : "",
          items: [],
        };
        setForm(base);
        setClienteSearch("");
        // Resetear método de pago y transferencias al crear nueva orden
        setMetodoPago("");
        setTransferencias([]);
        setObservacionesAdicionales("");
      }
      return;
    }
    
    if (!orden?.id) {
      console.warn("⚠️ Orden sin ID, no se puede cargar:", orden);
      // Inicializar formulario vacío si no hay ID válido
      setForm({
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        obra: orden?.obra ?? "",
        descripcion: orden?.descripcion ?? "",
        venta: orden?.venta ?? false,
        credito: orden?.credito ?? false,
        descuentos: Number(orden?.descuentos ?? 0),
        clienteNombre: orden?.cliente?.nombre ?? "",
        trabajadorNombre: orden?.trabajador?.nombre ?? "",
        sedeNombre: orden?.sede?.nombre ?? "",
        clienteId: orden?.cliente?.id ? String(orden.cliente.id) : "",
        trabajadorId: orden?.trabajador?.id ? String(orden.trabajador.id) : "",
        sedeId: orden?.sede?.id ? String(orden.sede.id) : "",
        items: orden?.items?.map((i) => ({
          id: i.id,
          productoId: i.producto?.id ?? null,
          codigo: i.producto?.codigo ?? "",
          nombre: i.producto?.nombre ?? "",
          descripcion: i.descripcion ?? "",
          cantidad: Number(i.cantidad ?? 1),
          precioUnitario: Number(i.precioUnitario ?? 0),
          totalLinea: Number(i.totalLinea ?? 0),
          eliminar: false,
        })) ?? [],
      });
      setClienteSearch(orden?.cliente?.nombre ?? "");
      // Parsear descripción para extraer método de pago y transferencias
      const descripcionParseada = parsearDescripcion(orden?.descripcion ?? "");
      setMetodoPago(descripcionParseada.metodoPago);
      setTransferencias(descripcionParseada.transferencias.length > 0 ? descripcionParseada.transferencias : []);
      setObservacionesAdicionales(descripcionParseada.observaciones);
      return;
    }

    // Usar directamente los datos del objeto orden que ya tiene toda la información
    // Extraer IDs de manera más robusta
    const clienteId = orden.cliente?.id !== undefined && orden.cliente?.id !== null 
      ? String(orden.cliente.id) 
      : "";
    const trabajadorId = orden.trabajador?.id !== undefined && orden.trabajador?.id !== null 
      ? String(orden.trabajador.id) 
      : "";
    const sedeId = orden.sede?.id !== undefined && orden.sede?.id !== null 
      ? String(orden.sede.id) 
      : "";
    
    const base = {
      id: Number(orden.id) || null,
      fecha: toLocalDateOnly(orden.fecha),
      obra: orden.obra ?? "",
      descripcion: orden.descripcion ?? "",
      venta: Boolean(orden.venta ?? false),
      credito: Boolean(orden.credito),
      descuentos: Number(orden.descuentos ?? 0),
      clienteNombre: orden.cliente?.nombre ?? "",
      trabajadorNombre: orden.trabajador?.nombre ?? "",
      sedeNombre: orden.sede?.nombre ?? "",
      clienteId: clienteId,
      trabajadorId: trabajadorId,
      sedeId: sedeId,
      items:
        (Array.isArray(orden.items) ? orden.items : []).map((i) => {
          // GET /api/ordenes/tabla solo retorna {codigo, nombre} en producto, no el ID
          // El productoId se establecerá después cuando se carguen los catálogos
          return {
            id: i.id,
            productoId: i.producto?.id ?? null, // Puede ser null si viene de /api/ordenes/tabla
            codigo: i.producto?.codigo ?? "",
            nombre: i.producto?.nombre ?? "",
            descripcion: i.descripcion ?? "",
            cantidad: Number(i.cantidad ?? 1),
            precioUnitario: Number(i.precioUnitario ?? 0),
            totalLinea: Number(i.totalLinea ?? 0),
            eliminar: false,
          };
        }),
    };
    
    setForm(base);
    
    // Actualizar el campo de búsqueda de cliente cuando se carga una orden
    if (base.clienteId) {
      const cliente = clientes.find(c => String(c.id) === base.clienteId);
      if (cliente) {
        setClienteSearch(cliente.nombre);
      } else {
        setClienteSearch("");
      }
    } else {
      setClienteSearch("");
    }
    
    // Parsear descripción para extraer método de pago y transferencias
    const descripcionParseada = parsearDescripcion(base.descripcion);
    setMetodoPago(descripcionParseada.metodoPago);
    setTransferencias(descripcionParseada.transferencias.length > 0 ? descripcionParseada.transferencias : []);
    setObservacionesAdicionales(descripcionParseada.observaciones);
  }, [orden, isOpen, clientes]);

  // =============================
  // Cargar catálogos
  // =============================
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        // Cargar cada servicio por separado para identificar errores específicos
        let c = [], t = [], s = [], cats = [], prods = [];
        
        try {
          c = await listarClientes();
        } catch (e) {
          console.error("Error cargando clientes:", e);
        }
        
        try {
          t = await listarTrabajadores();
        } catch (e) {
          console.error("Error cargando trabajadores:", e);
        }
        
        try {
          s = await listarSedes();
        } catch (e) {
          console.error("Error cargando sedes:", e);
        }
        
        try {
          cats = await listarCategorias();
        } catch (e) {
          console.error("Error cargando categorías:", e);
        }
        
        try {
          prods = await listarProductos();
        } catch (e) {
          console.error("Error cargando productos:", e);
        }
        
        setClientes(c);
        setTrabajadores(t);
        setSedes(s);
        setCategorias(cats);
        setCatalogoProductos(prods);
      } catch (e) {
        console.error("Error general cargando catálogos:", e);
      }
    })();
  }, [isOpen]);

  // =============================
  // Match por nombre para establecer IDs
  // =============================
  useEffect(() => {
    // Resetear el flag cuando se cierra el modal
    if (!isOpen) {
      matchHechoRef.current = { ordenId: null, hecho: false };
      return;
    }

    // Resetear el flag si cambió la orden
    if (orden?.id && matchHechoRef.current.ordenId !== orden.id) {
      matchHechoRef.current = { ordenId: orden.id, hecho: false };
    }

    // Solo hacer match si hay una orden y los catálogos están cargados
    // Y solo hacerlo una vez por orden
    if (!orden?.id || matchHechoRef.current.hecho || clientes.length === 0 || trabajadores.length === 0 || sedes.length === 0) {
      return;
    }

    // Usar setForm con función para acceder al estado actual sin depender de form
    setForm((prev) => {
      if (!prev) return prev;

      // Verificar si los IDs ya están establecidos - si es así, no hacer nada
      const idsYaEstablecidos = prev.clienteId && prev.trabajadorId && prev.sedeId && 
        (!prev.items || prev.items.every(item => item.productoId && item.productoId !== 0));
      
      if (idsYaEstablecidos) {
        matchHechoRef.current.hecho = true;
        return prev;
      }

      // Verificar si realmente necesitamos hacer cambios antes de actualizar el estado
      let necesitaActualizacion = false;
      let cambios = {
        clienteId: prev.clienteId,
        trabajadorId: prev.trabajadorId,
        sedeId: prev.sedeId,
        items: prev.items
      };

      // Match por nombre de cliente
      if ((!prev.clienteId || prev.clienteId === "") && prev.clienteNombre) {
        const clienteMatch = clientes.find(cli => cli.nombre === prev.clienteNombre);
        if (clienteMatch) {
          cambios.clienteId = String(clienteMatch.id);
          necesitaActualizacion = true;
        }
      }
      
      // Match por nombre de trabajador
      if ((!prev.trabajadorId || prev.trabajadorId === "") && prev.trabajadorNombre) {
        const trabajadorMatch = trabajadores.find(trab => trab.nombre === prev.trabajadorNombre);
        if (trabajadorMatch) {
          cambios.trabajadorId = String(trabajadorMatch.id);
          necesitaActualizacion = true;
        }
      }
      
      // Match por nombre de sede
      if ((!prev.sedeId || prev.sedeId === "") && prev.sedeNombre) {
        const sedeMatch = sedes.find(sed => sed.nombre === prev.sedeNombre);
        if (sedeMatch) {
          cambios.sedeId = String(sedeMatch.id);
          necesitaActualizacion = true;
        }
      }
      
      // Match por código de producto para establecer productoId
      // GET /api/ordenes/tabla solo retorna {codigo, nombre} en producto, no el ID
      if (Array.isArray(prev.items) && catalogoProductos.length > 0) {
        const itemsActualizados = prev.items.map(item => {
          // Si el productoId es null o 0, intentar encontrarlo por código
          if ((!item.productoId || item.productoId === 0 || item.productoId === null) && item.codigo) {
            const productoMatch = catalogoProductos.find(prod => prod.codigo === item.codigo);
            if (productoMatch) {
              necesitaActualizacion = true;
              return { ...item, productoId: productoMatch.id };
            }
          }
          return item;
        });
        
        if (necesitaActualizacion) {
          cambios.items = itemsActualizados;
        }
      }

      // Solo actualizar si realmente hay cambios
      if (necesitaActualizacion) {
        matchHechoRef.current.hecho = true; // Marcar que ya se hizo el match para esta orden
        return {
          ...prev,
          clienteId: cambios.clienteId,
          trabajadorId: cambios.trabajadorId,
          sedeId: cambios.sedeId,
          items: cambios.items
        };
      } else {
        // Si no hay cambios pero todo está listo, marcar como hecho para no volver a ejecutar
        matchHechoRef.current.hecho = true;
        return prev;
      }
    });
  }, [isOpen, orden?.id, clientes.length, trabajadores.length, sedes.length, catalogoProductos.length]);

  // =============================
  // Filtro de catálogo
  // =============================
  const catalogoFiltrado = useMemo(() => {
    let filtered = catalogoProductos;
    if (selectedCategoryId) {
      const selected = categorias.find((c) => c.id === selectedCategoryId);
      if (selected) {
        // Comparar por ID de categoría (más confiable)
        // Los productos pueden tener categoria como objeto {id, nombre} o como string
        filtered = filtered.filter((p) => {
          // Si categoria es un objeto, comparar por ID
          if (p.categoria && typeof p.categoria === 'object' && p.categoria.id) {
            return p.categoria.id === selectedCategoryId;
          }
          // Si categoria es un string, comparar por nombre
          if (typeof p.categoria === 'string') {
            return p.categoria === selected.nombre;
          }
          // Si tiene categoriaId directo
          if (p.categoriaId) {
            return p.categoriaId === selectedCategoryId;
          }
          return false;
        });
      }
    }
    const q = search.trim().toLowerCase();
    if (q)
      filtered = filtered.filter(
        (p) =>
          (p.nombre ?? "").toLowerCase().includes(q) ||
          (p.codigo ?? "").toLowerCase().includes(q)
      );
    return filtered;
  }, [catalogoProductos, search, selectedCategoryId, categorias]);

  if (!isOpen) return null;
  
  // Mostrar estado de carga mientras se inicializa el formulario
  if (isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-container modal-wide">
          <h2>Cargando orden...</h2>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Cargando datos de la orden...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!form) {
    return (
      <div className="modal-overlay">
        <div className="modal-container modal-wide">
          <h2>Error</h2>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>No se pudieron cargar los datos de la orden.</p>
            <button onClick={onClose} className="btn-cancelar" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =============================
  // Handlers
  // =============================
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const arr = [...prev.items];
      const item = { ...arr[idx] };
      
      if (field === "cantidad") {
        item.cantidad = Number(value) || 0;
        // Recalcular total de línea automáticamente
        item.totalLinea = item.cantidad * item.precioUnitario;
      } else if (field === "precioUnitario") {
        item.precioUnitario = Number(value) || 0;
        // Recalcular total de línea automáticamente
        item.totalLinea = item.cantidad * item.precioUnitario;
      } else {
        item[field] = field === "totalLinea" ? Number(value) : value;
      }
      
      arr[idx] = item;
      return { ...prev, items: arr };
    });
  };

  const addProducto = (item) => {
    setForm((prev) => {
      const yaExiste = prev.items.some((i) => i.codigo === item.codigo && !i.eliminar);
      if (yaExiste) {
        showWarning("Este producto ya está en la lista");
        return prev; // evitar duplicados
      }
      
      // Obtener el precio según la sede del usuario (necesitamos acceso a la sede)
      const precioUnitario = item.precio1 || 0; // Por ahora usar precio1, después se puede mejorar
      
      const nuevo = {
        id: null,
        productoId: item.id,
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion || "",
        cantidad: 1,
        precioUnitario: precioUnitario,
        totalLinea: precioUnitario, // 1 * precioUnitario
        eliminar: false,
        color: item.color, // Incluir el color del producto
      };
      
      const nuevosItems = [...prev.items, nuevo];
      
      return { ...prev, items: nuevosItems };
    });
  };

  const marcarEliminar = (idx) => {
    setForm((prev) => {
      const arr = [...prev.items];
      arr[idx].eliminar = !arr[idx].eliminar;
      return { ...prev, items: arr };
    });
  };

  const handleSubmit = async () => {
  try {
    // Verificar si la orden está anulada (solo para edición)
    if (orden?.estado?.toLowerCase() === 'anulada') {
      showError("No se puede editar una orden anulada. Las órdenes anuladas no pueden ser modificadas.");
      return;
    }

    // Determinar si es creación o edición
    const esCreacion = !form.id || form.id === null;
    
    if (esCreacion) {
      // Validaciones antes de crear la orden
      if (!form.clienteId || form.clienteId === "" || form.clienteId === null) {
        showError("Debes seleccionar un cliente");
        return;
      }

      if (!form.sedeId || form.sedeId === "" || form.sedeId === null) {
        showError("Debes seleccionar una sede");
        return;
      }

      // Filtrar items que NO están marcados para eliminar
      const itemsActivos = form.items.filter(i => !i.eliminar);
      
      if (itemsActivos.length === 0) {
        showError("La orden debe tener al menos un producto");
        return;
      }

      // Validar que todos los items tengan productoId válido
      const itemsInvalidos = itemsActivos.filter(i => !i.productoId || i.productoId === 0 || i.productoId === null);
      if (itemsInvalidos.length > 0) {
        showError(`Los siguientes productos no tienen un ID válido: ${itemsInvalidos.map(i => i.nombre || i.codigo).join(", ")}`);
        return;
      }

      // Validar que las cantidades y precios sean válidos
      const itemsConDatosInvalidos = itemsActivos.filter(i => 
        !i.cantidad || i.cantidad <= 0 || !i.precioUnitario || i.precioUnitario <= 0
      );
      if (itemsConDatosInvalidos.length > 0) {
        showError("Todos los productos deben tener cantidad y precio mayor a 0");
        return;
      }

      // Verificar si el cliente es JAIRO JAVIER VELANDIA
      const clienteSeleccionado = form.clienteId 
        ? clientes.find(c => String(c.id) === String(form.clienteId))
        : null;
      const isJairoVelandia = clienteSeleccionado?.nombre?.toUpperCase() === "JAIRO JAVIER VELANDIA";

      // Crear nueva orden
      const payload = {
        fecha: toLocalDateOnly(form.fecha),
        obra: isJairoVelandia ? (form.obra || null) : null, // Enviar obra solo si es Jairo Velandia
        descripcion: form.descripcion || null,
        venta: form.venta,
        credito: form.credito,
        descuentos: Number(form.descuentos || 0),
        clienteId: Number(form.clienteId),
        sedeId: Number(form.sedeId),
        // trabajadorId es opcional según la documentación
        ...(form.trabajadorId ? { trabajadorId: Number(form.trabajadorId) } : {}),
        items: itemsActivos.map((i) => {
          const item = {
            productoId: Number(i.productoId),
            descripcion: i.descripcion ?? "",
            cantidad: Number(i.cantidad),
            precioUnitario: Number(i.precioUnitario),
          };
          // Si es un corte que debe reutilizar un existente, agregar el ID
          if (i.reutilizarCorteSolicitadoId) {
            item.reutilizarCorteSolicitadoId = Number(i.reutilizarCorteSolicitadoId);
          }
          return item;
        }),
      };
      
      // Incluir cortes pendientes SOLO si el item correspondiente NO está eliminado
      // IMPORTANTE: Solo el corte SOBRANTE debe incrementar stock (queda en inventario)
      // El corte SOLICITADO se vende inmediatamente, así que NO debe incrementar stock
      const cortesEnriquecidos = (Array.isArray(cortesPendientes) ? cortesPendientes : [])
        .filter((corteSobrante) => {
          // Verificar si existe un item activo que corresponda a este corte sobrante
          // El corte sobrante tiene productoId que coincide con el productoId del item del corte solicitado
          const itemCorrespondiente = itemsActivos.find(item => 
            Number(item.productoId) === Number(corteSobrante.productoId)
          );
          
          // Solo incluir el corte sobrante si el item correspondiente está activo (no eliminado)
          if (!itemCorrespondiente) {
            return false;
          }
          
          return true;
        })
        .map((c) => {
          const sedeId = Number(payload.sedeId);
          // Solo el sobrante debe tener cantidadesPorSede > 0
          // El solicitado se crea pero NO incrementa stock porque se vende de inmediato
          const cantidadesPorSede = [
            { sedeId: 1, cantidad: sedeId === 1 ? Number(c.cantidad || 1) : 0 }, // Insula - SOLO PARA SOBRANTE
            { sedeId: 2, cantidad: sedeId === 2 ? Number(c.cantidad || 1) : 0 }, // Centro - SOLO PARA SOBRANTE
            { sedeId: 3, cantidad: sedeId === 3 ? Number(c.cantidad || 1) : 0 }  // Patios - SOLO PARA SOBRANTE
          ];
          return {
            ...c,
            cantidad: Number(c.cantidad || 1),
            cantidadesPorSede: cantidadesPorSede,
            // Indicar que este es el SOBRANTE que debe incrementar stock
            esSobrante: true,
          };
        });

      const payloadConCortes = {
        ...payload,
        cortes: cortesEnriquecidos,
      };

      const data = await crearOrdenVenta(payloadConCortes);
      showSuccess(`Orden creada correctamente. Número: ${data.numero}`);
      
      if (onSave) onSave(data);
      onClose();
      return;
    }

    // Verificar si el cliente es JAIRO JAVIER VELANDIA (para actualizar también)
    const clienteSeleccionadoActualizar = form.clienteId 
      ? clientes.find(c => String(c.id) === String(form.clienteId))
      : null;
    const isJairoVelandiaActualizar = clienteSeleccionadoActualizar?.nombre?.toUpperCase() === "JAIRO JAVIER VELANDIA";

    // Editar orden existente
    const payload = {
    id: form.id,
    fecha: toLocalDateOnly(form.fecha),
    obra: isJairoVelandiaActualizar ? (form.obra || null) : null, // Enviar obra solo si es Jairo Velandia
    descripcion: form.descripcion || null,
    venta: form.venta,
    credito: form.credito,
    descuentos: Number(form.descuentos || 0),
    clienteId: form.clienteId ? Number(form.clienteId) : null,
    trabajadorId: form.trabajadorId ? Number(form.trabajadorId) : null,
    sedeId: form.sedeId ? Number(form.sedeId) : null,
    items: form.items
      .filter(i => !i.eliminar) // Filtrar items eliminados antes de mapear
      .map((i) => {
        // Validar que productoId sea válido antes de enviar
        const productoId = Number(i.productoId);
        if (!productoId || productoId === 0) {
          throw new Error(`El producto "${i.nombre || i.codigo}" no tiene un ID válido. Por favor, recarga la página e intenta nuevamente.`);
        }
        
        return {
          id: i.id ?? null,
          productoId: productoId,
          descripcion: i.descripcion ?? "",
          cantidad: Number(i.cantidad ?? 1),
          precioUnitario: Number(i.precioUnitario ?? 0),
          totalLinea: Number(i.totalLinea ?? 0),
          // reutilizarCorteSolicitadoId es opcional
          ...(i.reutilizarCorteSolicitadoId ? { reutilizarCorteSolicitadoId: Number(i.reutilizarCorteSolicitadoId) } : {})
        };
      }),
};

    // Usar el endpoint específico para órdenes de venta si es una venta
    let data;
    if (form.venta) {
      data = await actualizarOrdenVenta(form.id, payload);
    } else {
      data = await actualizarOrden(form.id, payload);
    }
    
    // Manejar respuesta del nuevo endpoint PUT /api/ordenes/venta/{id}
    if (data?.mensaje && data?.orden) {
      showSuccess(`Orden actualizada correctamente. Número: ${data.numero}. Total: $${data.orden.total?.toLocaleString('es-CO') || '0'}`);
    } else {
      // Respuesta del endpoint fallback
      showSuccess("Orden actualizada correctamente");
    }

    // Solo cerrar el modal, la tabla se refrescará desde onClose
    onClose();
  } catch (e) {
    console.error("Error al guardar orden:", e);

    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Error al guardar la orden.";
    showError(msg);
  }
};


  // =============================
  // Render
  // =============================
  return (
    <div className="modal-overlay">
      <div className="modal-container modal-wide">
        <h2>{form.id ? `Editar Orden #${form.numero ?? form.id}` : 'Crear Nueva Orden'}</h2>

        {errorMsg && <div className="alert error">{errorMsg}</div>}

        <div className="modal-grid">
          {/* PANEL IZQUIERDO */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    handleChange("fecha", e.target.value)
                  }
                />
              </label>
              {/* Campo Obra solo visible para JAIRO JAVIER VELANDIA */}
              {(() => {
                const clienteSeleccionado = form.clienteId 
                  ? clientes.find(c => String(c.id) === String(form.clienteId))
                  : null;
                const isJairoVelandia = clienteSeleccionado?.nombre?.toUpperCase() === "JAIRO JAVIER VELANDIA";
                return isJairoVelandia ? (
                  <label>
                    Obra
                    <input
                      type="text"
                      value={form.obra}
                      onChange={(e) =>
                        handleChange("obra", e.target.value.toUpperCase())
                      }
                    />
                  </label>
                ) : null;
              })()}

              <label>
                Método de Pago
                <select
                  value={metodoPago}
                  onChange={(e) => {
                    const nuevoMetodo = e.target.value;
                    setMetodoPago(nuevoMetodo);
                    let nuevasTransferencias = transferencias;
                    if (nuevoMetodo !== "TRANSFERENCIA") {
                      nuevasTransferencias = []; // Limpiar transferencias si no es transferencia
                      setTransferencias([]);
                    } else if (transferencias.length === 0) {
                      // Si es transferencia y no hay ninguna, agregar una por defecto
                      nuevasTransferencias = [{ banco: "", monto: 0 }];
                      setTransferencias(nuevasTransferencias);
                    }
                    // Construir descripción completa
                    const nuevaDescripcion = construirDescripcion(nuevoMetodo, nuevasTransferencias, observacionesAdicionales);
                    handleChange("descripcion", nuevaDescripcion);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #c2c2c3',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="">Seleccione método de pago...</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>
              
              {metodoPago === "TRANSFERENCIA" && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '500' }}>
                    Transferencias
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {transferencias.map((transf, index) => (
                      <div key={index} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1.5fr auto', 
                        gap: '0.5rem', 
                        alignItems: 'end',
                        padding: '0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                      }}>
                        <div>
                          <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block', color: '#666' }}>
                            Banco
                          </label>
                          <select
                            value={transf.banco}
                            onChange={(e) => actualizarTransferencia(index, 'banco', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #c2c2c3',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="">Seleccione banco...</option>
                            {bancos.map((bancoItem) => (
                              <option key={bancoItem} value={bancoItem}>
                                {bancoItem}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block', color: '#666' }}>
                            Monto
                          </label>
                          <input
                            type="number"
                            value={transf.monto || ""}
                            onChange={(e) => {
                              const valor = parseFloat(e.target.value) || 0;
                              actualizarTransferencia(index, 'monto', valor);
                            }}
                            onKeyDown={(e) => {
                              // Permitir números, punto decimal, backspace, delete, tab, etc.
                              if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #c2c2c3',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarTransferencia(index)}
                          disabled={transferencias.length === 1}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: transferencias.length === 1 ? '#ccc' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: transferencias.length === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            height: 'fit-content'
                          }}
                          title={transferencias.length === 1 ? "Debe haber al menos una transferencia" : "Eliminar transferencia"}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={agregarTransferencia}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-light-blue)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        alignSelf: 'flex-start'
                      }}
                    >
                      + Agregar Transferencia
                    </button>
                    {transferencias.length > 0 && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#e8f4f8', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: '#2c5f7c'
                      }}>
                        Total Transferencias: ${transferencias
                          .reduce((sum, t) => sum + (parseFloat(t.monto) || 0), 0)
                          .toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <label style={{ gridColumn: '1 / -1' }}>
                Observaciones Adicionales
                <textarea
                  value={observacionesAdicionales}
                  onChange={(e) => {
                    setObservacionesAdicionales(e.target.value);
                    // Construir descripción completa con observaciones
                    const nuevaDescripcion = construirDescripcion(metodoPago, transferencias, e.target.value);
                    handleChange("descripcion", nuevaDescripcion);
                  }}
                  placeholder="Escribe observaciones o detalles adicionales..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </label>

              <label>
                Cliente
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={clienteSearch}
                    readOnly
                    onClick={() => setShowClienteModal(true)}
                    placeholder="Haz clic para seleccionar un cliente..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #c2c2c3',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      backgroundColor: '#fff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSearchModal(""); // Limpiar búsqueda al abrir el modal
                      setShowClienteModal(true);
                    }}
                    className="btn-guardar"
                    style={{
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {form.clienteId ? 'Cambiar Cliente' : 'Seleccionar'}
                  </button>
                </div>
              </label>

              <label>
                Trabajador
                <select
                  value={form.trabajadorId}
                  onChange={(e) =>
                    handleChange("trabajadorId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sede
                <select
                  value={form.sedeId}
                  onChange={(e) =>
                    handleChange("sedeId", e.target.value)
                  }
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                marginTop: '0.5rem'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  cursor: 'pointer', 
                  margin: 0, 
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: '#343a40',
                  width: '100%'
                }}>
                  <input
                    type="checkbox"
                    checked={form.credito}
                    onChange={(e) =>
                      handleChange("credito", e.target.checked)
                    }
                    style={{ 
                      width: '1.3rem', 
                      height: '1.3rem', 
                      cursor: 'pointer', 
                      margin: 0,
                      accentColor: '#4f67ff',
                      flexShrink: 0
                    }}
                  />
                  <span>¿Es crédito?</span>
                </label>
                
                {/* Checkbox para Venta Confirmada */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    color: '#343a40',
                    width: '100%'
                  }}>
                  <input
                    type="checkbox"
                    checked={form.venta}
                    onChange={(e) =>
                      handleChange("venta", e.target.checked)
                    }
                    style={{ 
                      width: '1.3rem', 
                      height: '1.3rem', 
                      cursor: 'pointer', 
                      margin: 0,
                      accentColor: '#4f67ff',
                      flexShrink: 0
                    }}
                  />
                  <span>¿Venta confirmada?</span>
                </label>
              </div>
            </div>

            <h3>Ítems de la orden</h3>
            
            {/* Totales de la venta */}
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <strong>${form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Descuentos:</span>
                  <input
                    type="number"
                    value={form.descuentos || 0}
                    onChange={(e) => {
                      const valor = parseFloat(e.target.value) || 0;
                      handleChange("descuentos", valor >= 0 ? valor : 0);
                    }}
                    step="0.01"
                    min="0"
                    style={{
                      width: '120px',
                      padding: '0.25rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'right'
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span><strong>Total:</strong></span>
                  <strong style={{ fontSize: '1.1em', color: '#4f67ff' }}>
                    ${(form.items.reduce((sum, item) => sum + (item.totalLinea || 0), 0) - (form.descuentos || 0)).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
            
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((i, idx) => (
                  <tr
                    key={idx}
                    style={{
                      textDecoration: i.eliminar ? "line-through" : "none",
                      opacity: i.eliminar ? 0.6 : 1,
                    }}
                  >
                    <td>{i.nombre}</td>
                    <td>
                      <input
                        type="number"
                        value={i.cantidad || ""}
                        min={1}
                        placeholder="1"
                        onChange={(e) =>
                          handleItemChange(idx, "cantidad", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={i.precioUnitario || ""}
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                        onChange={(e) =>
                          handleItemChange(idx, "precioUnitario", e.target.value)
                        }
                        onKeyDown={(e) => {
                          // Permitir: números, punto decimal, backspace, delete, tab, escape, enter, y teclas de navegación
                          if (!/[0-9.]/.test(e.key) && 
                              !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                              !(e.key === 'a' && e.ctrlKey) && // Ctrl+A
                              !(e.key === 'c' && e.ctrlKey) && // Ctrl+C
                              !(e.key === 'v' && e.ctrlKey) && // Ctrl+V
                              !(e.key === 'x' && e.ctrlKey)) { // Ctrl+X
                            e.preventDefault();
                          }
                        }}
                        style={{ 
                          width: '100%',
                          textAlign: 'right'
                        }}
                        title="Precio unitario editable (puede aplicar descuentos)"
                      />
                    </td>
                    <td>
                      {(i.cantidad * i.precioUnitario).toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="btnDelete"
                        onClick={() => marcarEliminar(idx)}
                        title={i.eliminar ? "Restaurar producto" : "Eliminar producto"}
                      >
                        <img src={eliminar} className="iconButton" alt="Eliminar" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PANEL CENTRAL */}
          <div className="pane pane-sidebar">
            <CategorySidebar
              categories={[{ id: null, nombre: "Todas" }, ...categorias]}
              selectedId={selectedCategoryId}
              onSelect={(id) =>
                setSelectedCategoryId(id === null ? null : id)
              }
            />
          </div>

          {/* PANEL DERECHO */}
          <div className="pane pane-right">
            <div className="inv-header">
              <h3>Catálogo de Productos</h3>
              <input
                className="inv-search"
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Color</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catalogoFiltrado.map((p) => (
                    <tr
                      key={p.id}
                      onDoubleClick={() => addProducto(p)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{p.nombre}</td>
                      <td>{p.codigo ?? "-"}</td>
                      <td>{p.color ?? "-"}</td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => addProducto(p)}
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                  {catalogoFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : (form.id ? "Guardar cambios" : "Crear Orden")}
          </button>
        </div>
      </div>
      
      {/* Modal de selección de clientes */}
      {showClienteModal && (
        <div className="modal-overlay" style={{ zIndex: 100001 }}>
          <div className="modal-container" style={{ 
            maxWidth: '900px', 
            width: '95vw', 
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <h2>Seleccionar Cliente</h2>
            
            <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
              <input
                type="text"
                value={clienteSearchModal}
                onChange={(e) => setClienteSearchModal(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT, correo, ciudad o dirección..."
                className="clientes-input"
                style={{
                  width: '100%',
                  fontSize: '1rem'
                }}
                autoFocus
              />
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                return (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              border: '1px solid #e6e8f0',
              borderRadius: '8px'
            }}>
              {(() => {
                const searchTerm = clienteSearchModal.trim().toLowerCase();
                const filtered = searchTerm
                  ? clientes.filter((c) =>
                      [c.nombre, c.nit, c.correo, c.ciudad, c.direccion]
                        .filter(Boolean)
                        .some((v) => String(v).toLowerCase().includes(searchTerm))
                    )
                  : clientes;
                
                // Ordenar alfabéticamente
                const sorted = [...filtered].sort((a, b) => {
                  const nombreA = (a.nombre || "").toLowerCase();
                  const nombreB = (b.nombre || "").toLowerCase();
                  return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
                });
                
                if (sorted.length === 0) {
                  return (
                    <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                      No se encontraron clientes
                    </div>
                  );
                }
                
                return (
                  <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>Nombre</th>
                          <th style={{ width: '15%' }}>NIT</th>
                          <th style={{ width: '25%' }}>Correo</th>
                          <th style={{ width: '15%' }}>Ciudad</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c) => (
                          <tr
                            key={c.id}
                            style={{
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fbff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td title={c.nombre || '-'} style={{ fontWeight: '500', color: '#1e2753' }}>
                              {c.nombre || '-'}
                            </td>
                            <td title={c.nit || '-'}>
                              {c.nit || '-'}
                            </td>
                            <td title={c.correo || '-'}>
                              {c.correo || '-'}
                            </td>
                            <td title={c.ciudad || '-'}>
                              {c.ciudad || '-'}
                            </td>
                            <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleChange("clienteId", String(c.id));
                                  setClienteSearch(c.nombre);
                                  setClienteSearchModal(""); // Limpiar búsqueda del modal
                                  setShowClienteModal(false);
                                }}
                                className="btn-guardar"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.9rem'
                                }}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            
            <div className="modal-buttons" style={{ marginTop: '1rem', flexShrink: 0 }}>
              <button 
                className="btn-cancelar" 
                onClick={() => {
                  setClienteSearchModal(""); // Limpiar búsqueda al cancelar
                  setShowClienteModal(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
