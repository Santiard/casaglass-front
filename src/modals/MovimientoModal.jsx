// src/modals/MovimientoModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/MovimientoNuevoModal.css";
import CategorySidebar from "../componets/CategorySidebar.jsx";
import { listarCategorias } from "../services/CategoriasService.js";
import { listarInventarioCompleto, listarCortesInventarioCompleto } from "../services/InventarioService.js";
import { getTodayLocalDate, toLocalDateOnly } from "../lib/dateUtils.js";
import { actualizarDetallesBatch } from "../services/TrasladosService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatMensajeErrorTraslado } from "../lib/trasladoDetalleUi.js";
import { resolverOCrearCorteParaTrasladoInsula } from "../lib/trasladoCorteInsula.js";
import CortarModal from "./CortarModal.jsx";

const SEDE_INSULA_ID = 1;
const SEDE_CENTRO_ID = 2;
const SEDE_PATIOS_ID = 3;

/**
 * Familia A (DOC_TRASLADOS): solo sedes 2↔3 — inventario real de cortes en ambos extremos.
 */
function esTrasladoCentroPatiosBidireccional(origenId, destinoId) {
  const o = Number(origenId);
  const d = Number(destinoId);
  if (!o || !d) return false;
  return (
    (o === SEDE_CENTRO_ID && d === SEDE_PATIOS_ID) ||
    (o === SEDE_PATIOS_ID && d === SEDE_CENTRO_ID)
  );
}

/** Familia B: Insula (1) → Centro (2) o Patios (3). Corte: producto base + medidaCorte; sin bajar corte en stock de 1. */
function esTrasladoInsulaHaciaCentroOPatios(origenId, destinoId) {
  const o = Number(origenId);
  const d = Number(destinoId);
  if (!o || !d) return false;
  return o === SEDE_INSULA_ID && (d === SEDE_CENTRO_ID || d === SEDE_PATIOS_ID);
}

/** Familia B: 2 o 3 → Insula. Corte: id de Corte en origen; en 1 no se acredita corte en este servicio. */
function esTrasladoCentroOPatiosHaciaInsula(origenId, destinoId) {
  const o = Number(origenId);
  const d = Number(destinoId);
  if (!o || !d) return false;
  return d === SEDE_INSULA_ID && (o === SEDE_CENTRO_ID || o === SEDE_PATIOS_ID);
}

/** Cargar listado de cortes y pestaña Productos | Cortes (no aplica con origen solo Insula en la lista de cortes). */
function trasladoUsaCatalogoCortesSeparado(origenId, destinoId) {
  return (
    esTrasladoCentroPatiosBidireccional(origenId, destinoId) ||
    esTrasladoInsulaHaciaCentroOPatios(origenId, destinoId) ||
    esTrasladoCentroOPatiosHaciaInsula(origenId, destinoId)
  );
}

/**
 * Id en producto del detalle: siempre el id que el backend clasifica (Producto entero o Corte según existsById).
 * Insula 1→2/3 línea corte: id del Corte en BD (no el producto entero).
 */
function productoIdParaTrasladoApi(p) {
  const a = p.trasladoEnviarProductoId;
  if (a != null && a !== "") {
    const n = Number(a);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const n2 = Number(p.id);
  if (Number.isFinite(n2) && n2 > 0) return n2;
  return NaN;
}

function mensajeValidacionLineasTrasladoDoc(sedeOrigenId, sedeDestinoId, productos) {
  for (const p of productos || []) {
    if (p.eliminar) continue;
    if (
      esTrasladoInsulaHaciaCentroOPatios(sedeOrigenId, sedeDestinoId) &&
      p.esCorteLinea
    ) {
      const lineId = Number(p.trasladoEnviarProductoId ?? p.id);
      const baseId = Number(p.trasladoProductoBaseId ?? 0);
      if (!Number.isFinite(lineId) || lineId <= 0) {
        return "Cada línea de corte desde Insula debe tener un id de Corte válido (usá Cortar).";
      }
      if (
        baseId > 0 &&
        lineId === baseId
      ) {
        return "La línea de corte no puede usar el id del producto entero; debe ser el id del Corte en base de datos (DOC_TRASLADOS).";
      }
    }
  }
  return null;
}

/** Logs para comparar producto_id enviado con id de Corte en BD (existsById en backend). */
function logTrasladoDebugCrear(payload, lineasResumen) {
  console.groupCollapsed(
    "%c[Traslado] Crear traslado",
    "color:#0a7;font-weight:bold",
    "— revisar producto_id por línea"
  );
  console.log("Cabecera:", {
    fecha: payload.fecha,
    sedeOrigen: payload.sedeOrigen,
    sedeDestino: payload.sedeDestino,
  });
  console.log("detalles (body hacia API):", payload.detalles);
  console.table(lineasResumen);
  console.info(
    "[Traslado] Backend: la línea es corte si corteRepository.existsById(productoId). " +
      "Si el id es solo producto entero (barra), el movimiento no sube en inventario_cortes del destino; puede afectar stock normal."
  );
  console.groupEnd();
}

/** Cantidad en una sede concreta (usa columnas ya transformadas por el API). */
function cantidadStockItemEnSede(item, sedeId) {
  const s = Number(sedeId);
  if (!Number.isFinite(s)) return 0;
  if (s === 1) return Number(item?.cantidadInsula ?? 0);
  if (s === 2) return Number(item?.cantidadCentro ?? 0);
  if (s === 3) return Number(item?.cantidadPatios ?? 0);
  return 0;
}

/**
 * Catálogo de traslado: solo filas con stock en la sede origen; cantidades acotadas a esa sede
 * (evita mostrar sumatoria de todas las sedes para admin u otros roles).
 */
function enfocarCatalogoEnSedeOrigen(items, sedeOrigenId) {
  const s = Number(sedeOrigenId);
  if (!Number.isFinite(s) || s < 1 || s > 3) return [];
  return (items || [])
    .map((row) => {
      const enOrigen = cantidadStockItemEnSede(row, s);
      return {
        ...row,
        cantidadInsula: s === 1 ? enOrigen : 0,
        cantidadCentro: s === 2 ? enOrigen : 0,
        cantidadPatios: s === 3 ? enOrigen : 0,
        cantidadTotal: enOrigen,
      };
    })
    .filter((row) => Number(row.cantidadTotal) > 0);
}

function logTrasladoDebugBatchEditar(movimientoId, cambiosBatch, crearResumen) {
  const hayCambios =
    (cambiosBatch.eliminar?.length || 0) > 0 ||
    (cambiosBatch.crear?.length || 0) > 0 ||
    (cambiosBatch.actualizar?.length || 0) > 0;
  if (!hayCambios) return;
  console.groupCollapsed(
    "%c[Traslado] Editar — batch detalles",
    "color:#07a;font-weight:bold",
    `movimientoId=${movimientoId}`
  );
  console.log("cambiosBatch (API):", cambiosBatch);
  if (crearResumen?.length) {
    console.table(crearResumen);
    console.info(
      "[Traslado] Líneas nuevas: mismo criterio existsById(productoId) para clasificar corte."
    );
  }
  console.groupEnd();
}

const VACIO = {
  sedeOrigenId: "",
  sedeDestinoId: "",
  fecha: getTodayLocalDate(),
  productos: [], // { id, nombre, sku?, cantidad }
};

export default function MovimientoModal({
  movimiento,
  isOpen,
  onClose,
  onSave,
  sedes = [],            // [{ id, nombre }]
  catalogoProductos = [],// [{ id, nombre, codigo }]
}) {
  const { isAdmin, sedeId: userSedeId } = useAuth();
  const { showError } = useToast();
  const isEdit = Boolean(movimiento?.id);
  const [form, setForm] = useState(VACIO);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState("MATE"); // Filtro de color
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [editableWithin2d, setEditableWithin2d] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [catalogoProductosPorSede, setCatalogoProductosPorSede] = useState([]);
  const [catalogoCortesPorSede, setCatalogoCortesPorSede] = useState([]);
  /** Solo Centro↔Patios: qué lista muestra el panel derecho (sin mezclar ítems). */
  const [vistaCatalogoTraslado, setVistaCatalogoTraslado] = useState("productos");
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [modalCorteTraslado, setModalCorteTraslado] = useState({ isOpen: false, producto: null });
  const itemCatalogoCorteRef = useRef(null);

  // En edición: permitimos cambiar cabecera Y productos si NO está confirmado
  // Los productos se editan usando endpoints de detalles (agregar, eliminar, actualizar)
  const estaConfirmado = Boolean(movimiento?.trabajadorConfirmacion);
  const canEditHeader = !isEdit || (editableWithin2d && !estaConfirmado);
  const canEditProducts = !isEdit || !estaConfirmado; // productos editables si NO está confirmado

  // Prevenir cierre/recarga de pestaña cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen]);

  // Cargar datos iniciales
  useEffect(() => {
    setErrorMsg("");
    if (movimiento) {
      const base = {
        sedeOrigenId: movimiento.sedeOrigen?.id ?? "",
        sedeDestinoId: movimiento.sedeDestino?.id ?? "",
        fecha:
          toLocalDateOnly(movimiento.fecha) ??
          getTodayLocalDate(),
        productos: Array.isArray(movimiento.detalles)
          ? movimiento.detalles.map((d) => {
              const largo = d.producto?.largoCm;
              const esCorteLinea =
                d.lineaEsCorte === true ||
                d.esCorte === true ||
                (largo != null &&
                  largo !== "" &&
                  String(largo).trim() !== "");
              const pidProd = d.producto?.id ?? "";
              return {
                id: pidProd,
                detalleId: d.id ?? null,
                trasladoEnviarProductoId: Number(pidProd),
                trasladoMedidaCm: null,
                trasladoProductoBaseId: null,
                nombre: d.producto?.nombre ?? "",
                sku: d.producto?.codigo ?? "",
                color: d.producto?.color ?? "",
                cantidad: d.cantidad && Number(d.cantidad) > 0 ? Number(d.cantidad) : "",
                esCorteLinea,
              };
            })
          : [],
      };
      setForm(base);

      // Bloquear edición completa si pasaron más de 2 días (afecta cabecera)
      const f = new Date(`${base.fecha}T00:00:00`);
      const diff = isNaN(f)
        ? 0
        : (Date.now() - f.getTime()) / (1000 * 60 * 60 * 24);
      setEditableWithin2d(diff <= 2);
    } else {
      setForm(VACIO);
      setEditableWithin2d(true);
    }
    setSearch("");
    setSelectedCategoryId(null);
    setIsSubmitting(false);
  }, [movimiento, isOpen]);

  // Cargar categorías desde el servidor
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cats = await listarCategorias();
        setCategorias(cats || []);
        // Seleccionar por defecto la primera categoría que no sea "TODAS"
        const primeraCategoria = cats.find(cat => 
          cat.nombre.toUpperCase() !== "TODAS" && 
          cat.nombre.toUpperCase() !== "TODAS LAS CATEGORÍAS"
        );
        if (primeraCategoria && !movimiento) {
          setSelectedCategoryId(primeraCategoria.id);
        }
      } catch (e) {
        console.error("Error cargando categorías:", e);
        setCategorias([]);
      }
    };
    
    if (isOpen) {
      fetchCategorias();
    } else {
      setCategorias([]);
      setSelectedColor("MATE"); // Reset al color por defecto
      setSelectedCategoryId(null);
    }
  }, [isOpen, movimiento]);

  // Cargar catálogo bajo demanda cuando se selecciona sede origen (y destino si aplica cortes 2↔3)
  useEffect(() => {
    if (!isOpen) return;

    const sedeOrigenId = Number(form.sedeOrigenId || 0);
    const sedeDestinoId = Number(form.sedeDestinoId || 0);
    if (!sedeOrigenId) {
      setCatalogoProductosPorSede([]);
      setCatalogoCortesPorSede([]);
      return;
    }

    let cancelled = false;
    const origenInsula = sedeOrigenId === SEDE_INSULA_ID;
    const cargarListaCortes =
      trasladoUsaCatalogoCortesSeparado(sedeOrigenId, sedeDestinoId) && !origenInsula;

    const cargarCatalogoPorSede = async () => {
      setLoadingCatalogo(true);
      try {
        const invParams = { sedeId: sedeOrigenId };
        const [productos, cortes] = await Promise.all([
          listarInventarioCompleto(invParams, isAdmin, userSedeId ?? null),
          cargarListaCortes
            ? listarCortesInventarioCompleto(invParams, isAdmin, userSedeId ?? null)
            : Promise.resolve([]),
        ]);
        if (cancelled) return;

        const productosOrigen = enfocarCatalogoEnSedeOrigen(productos || [], sedeOrigenId);
        const cortesOrigen = cargarListaCortes
          ? enfocarCatalogoEnSedeOrigen(cortes || [], sedeOrigenId)
          : [];

        const normalizadosProductos = productosOrigen
          .filter((p) => p.largoCm === undefined || p.largoCm === null)
          .map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo ?? "",
            categoria: p.categoria?.nombre ?? p.categoria ?? "",
            color: p.color,
            cantidadInsula: Number(p.cantidadInsula ?? 0),
            cantidadCentro: Number(p.cantidadCentro ?? 0),
            cantidadPatios: Number(p.cantidadPatios ?? 0),
            cantidadTotal: Number(p.cantidadTotal ?? 0),
            largoCm: undefined,
            esCorte: false,
            precio1: p.precio1,
            precio2: p.precio2,
            precio3: p.precio3,
            cmBase: p.cmBase ?? null,
          }));

        const normalizadosCortes = cargarListaCortes
          ? cortesOrigen.map((c) => {
              const idTraslado = c.corteId != null ? c.corteId : c.id;
              const catNombre =
                typeof c.categoria === "object"
                  ? c.categoria?.nombre ?? ""
                  : (c.categoria ?? "");
              const nombre =
                c.largoCm != null && c.largoCm !== ""
                  ? `${c.nombre} · ${c.largoCm} cm`
                  : c.nombre;
              return {
                id: idTraslado,
                nombre,
                codigo: c.codigo ?? "",
                categoria: catNombre,
                color: c.color,
                cantidadInsula: Number(c.cantidadInsula ?? 0),
                cantidadCentro: Number(c.cantidadCentro ?? 0),
                cantidadPatios: Number(c.cantidadPatios ?? 0),
                cantidadTotal: Number(c.cantidadTotal ?? 0),
                largoCm: c.largoCm,
                esCorte: true,
              };
            })
          : [];

        setCatalogoProductosPorSede(normalizadosProductos);
        setCatalogoCortesPorSede(normalizadosCortes);
      } catch (e) {
        if (cancelled) return;
        setCatalogoProductosPorSede([]);
        setCatalogoCortesPorSede([]);
        setErrorMsg("No se pudo cargar el catálogo para la sede origen seleccionada.");
      } finally {
        if (!cancelled) {
          setLoadingCatalogo(false);
        }
      }
    };

    cargarCatalogoPorSede();

    return () => {
      cancelled = true;
    };
  }, [isOpen, form.sedeOrigenId, form.sedeDestinoId, isAdmin, userSedeId]);

  useEffect(() => {
    if (!trasladoUsaCatalogoCortesSeparado(form.sedeOrigenId, form.sedeDestinoId)) {
      setVistaCatalogoTraslado("productos");
    } else if (Number(form.sedeOrigenId) === SEDE_INSULA_ID) {
      setVistaCatalogoTraslado("productos");
    }
  }, [form.sedeOrigenId, form.sedeDestinoId]);

  // Filtro de catálogo por categoría y búsqueda
  const obtenerCodigoProducto = (p) => (
    p?.codigo ?? p?.codigoProducto ?? p?.producto?.codigo ?? ""
  );

  const trasladoCatalogoCortes = trasladoUsaCatalogoCortesSeparado(
    form.sedeOrigenId,
    form.sedeDestinoId
  );
  const origenEsInsula = Number(form.sedeOrigenId) === SEDE_INSULA_ID;
  const mostrarSwitchCortesCatalogo = trasladoCatalogoCortes && !origenEsInsula;
  const muestraBotonCortarEnCatalogo =
    origenEsInsula &&
    esTrasladoInsulaHaciaCentroOPatios(form.sedeOrigenId, form.sedeDestinoId) &&
    vistaCatalogoTraslado === "productos";

  const catalogoFiltrado = useMemo(() => {
    if (!Number(form.sedeOrigenId)) return [];

    let sourceCatalogo = [];
    if (trasladoCatalogoCortes) {
      if (vistaCatalogoTraslado === "cortes") {
        sourceCatalogo = catalogoCortesPorSede;
      } else {
        sourceCatalogo = catalogoProductosPorSede.filter(
          (p) => p.largoCm === undefined || p.largoCm === null
        );
      }
    } else {
      sourceCatalogo = catalogoProductosPorSede.filter(
        (p) => p.largoCm === undefined || p.largoCm === null
      );
    }

    let filtered = sourceCatalogo;
    
    // Filtrar por categoría si está seleccionada
    if (selectedCategoryId) {
      const selectedCategory = categorias.find(cat => cat.id === selectedCategoryId);
      if (selectedCategory) {
        filtered = filtered.filter(p => p.categoria === selectedCategory.nombre);
      }
    }
    
    // Filtrar por color
    if (selectedColor) {
      const colorFiltro = selectedColor.toUpperCase().trim();
      filtered = filtered.filter((p) => {
        const productoColor = (p.color || "").toUpperCase().trim();
        return productoColor === colorFiltro;
      });
    }
    
    // Filtrar por búsqueda de texto
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.nombre ?? "").toLowerCase().includes(q) ||
          obtenerCodigoProducto(p).toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [
    catalogoProductosPorSede,
    catalogoCortesPorSede,
    form.sedeOrigenId,
    trasladoCatalogoCortes,
    vistaCatalogoTraslado,
    search,
    selectedCategoryId,
    selectedColor,
    categorias,
  ]);

  const obtenerUnidadesSedeOrigen = (item) => {
    const sedeOrigen = Number(form.sedeOrigenId || 0);
    if (sedeOrigen === 1) return Number(item?.cantidadInsula ?? 0);
    if (sedeOrigen === 2) return Number(item?.cantidadCentro ?? 0);
    if (sedeOrigen === 3) return Number(item?.cantidadPatios ?? 0);
    return Number(item?.cantidadTotal ?? 0);
  };

  // Validaciones
  const mismaSede =
    form.sedeOrigenId && form.sedeDestinoId && form.sedeOrigenId === form.sedeDestinoId;
  const faltanCampos = !form.sedeOrigenId || !form.sedeDestinoId || !form.fecha;
  const cantidadesInvalidas = form.productos.some(
    (p) => {
      const cantidad = Number(p.cantidad);
      return p.cantidad === "" || p.cantidad === null || !Number.isFinite(cantidad) || cantidad <= 0;
    }
  );

  const disabledSubmitBase =
    faltanCampos || mismaSede || cantidadesInvalidas || isSubmitting;

  // En crear: debe haber productos; en editar: se ignoran productos, no bloquea
  const disabledSubmit = isEdit
    ? (!canEditHeader || disabledSubmitBase)
    : (disabledSubmitBase || form.productos.length === 0);

  // Handlers
  const handleChange = (field, value) => {
    // Cabecera solo editable si canEditHeader
    if (!canEditHeader) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProducto = (item) => {
    if (!canEditProducts) return;
    
    // Evitar duplicados (verificar por id de producto)
    if (form.productos.some((p) => String(p.id) === String(item.id))) return;
    
    // Siempre agregar al estado local (tanto en creación como en edición)
    setForm((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          id: item.id,
          detalleId: null,
          trasladoEnviarProductoId: Number(item.id),
          trasladoMedidaCm: null,
          trasladoProductoBaseId: null,
          nombre: item.nombre,
          sku: item.codigo ?? "",
          color: item.color ?? "",
          cantidad: "",
          esNuevo: isEdit,
          esCorteLinea: Boolean(item.esCorte),
        },
      ],
    }));
  };

  const cerrarModalCorteTraslado = () => {
    itemCatalogoCorteRef.current = null;
    setModalCorteTraslado({ isOpen: false, producto: null });
  };

  const abrirCortarTraslado = (item) => {
    if (!canEditProducts) return;
    itemCatalogoCorteRef.current = item;
    const precioUsado =
      Number(item.precio || item.precio1 || item.precio2 || item.precio3 || 0) || 1;
    setModalCorteTraslado({ isOpen: true, producto: { ...item, precioUsado } });
  };

  const handleCortarTrasladoInsula = async (corteParaVender, _corteSobrante) => {
    const itemCat = itemCatalogoCorteRef.current;
    if (!itemCat || !corteParaVender) return;

    const baseId = Number(itemCat.id || corteParaVender.productoOriginal || 0);
    const med = Number(corteParaVender.medidaCorte || 0);
    if (!Number.isFinite(baseId) || baseId <= 0 || !Number.isFinite(med) || med <= 0) {
      throw new Error("Medida o producto base inválidos.");
    }

    let corteBdId = Number(corteParaVender.trasladoCorteBdId || 0);
    if (!Number.isFinite(corteBdId) || corteBdId <= 0) {
      corteBdId = await resolverOCrearCorteParaTrasladoInsula(itemCat, med);
    }

    const rowId = `corte-bd-${corteBdId}`;

    const esDuplicado = (p) => {
      if (p.eliminar) return false;
      return p.esCorteLinea && Number(p.trasladoEnviarProductoId ?? 0) === corteBdId;
    };
    if (form.productos.some(esDuplicado)) {
      throw new Error("Esta línea ya está en el traslado.");
    }

    console.info("[Traslado] Línea Insula agregada (Corte BD)", {
      corteBdId,
      productoEnteroId: baseId,
      medidaCm: med,
    });

    setForm((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          id: rowId,
          detalleId: null,
          trasladoEnviarProductoId: corteBdId,
          trasladoMedidaCm: med,
          trasladoProductoBaseId: baseId,
          nombre: corteParaVender.nombre || "",
          sku: corteParaVender.codigo ?? "",
          color: corteParaVender.color ?? "",
          cantidad: "",
          esNuevo: isEdit,
          esCorteLinea: true,
        },
      ],
    }));
  };

  const handleProductoChange = (idx, field, value) => {
    if (!canEditProducts) return;
    setForm((prev) => {
      const arr = [...prev.productos];
      if (field === "cantidad") {
        const filtered = value.toString().replace(/[^0-9]/g, "");
        arr[idx] = {
          ...arr[idx],
          [field]: filtered === "" ? "" : filtered,
        };
      } else {
        arr[idx] = {
          ...arr[idx],
          [field]: value,
        };
      }
      return { ...prev, productos: arr };
    });
  };


  const removeProducto = (idx) => {
    if (!canEditProducts) return;
    
    const producto = form.productos[idx];
    
    // Si tiene detalleId (existe en backend), marcarlo como eliminado
    // Si no tiene detalleId (es nuevo), simplemente quitarlo del array
    if (producto.detalleId) {
      setForm((prev) => {
        const arr = [...prev.productos];
        arr[idx] = { ...arr[idx], eliminar: true };
        return { ...prev, productos: arr };
      });
    } else {
      // Producto nuevo que aún no se guardó, simplemente quitarlo
      setForm((prev) => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== idx),
      }));
    }
  };

  // Guardar
  const handleSubmit = async () => {
    if (disabledSubmit) return;
    setErrorMsg("");
    setIsSubmitting(true);
    try {
      const errDoc = mensajeValidacionLineasTrasladoDoc(
        form.sedeOrigenId,
        form.sedeDestinoId,
        form.productos
      );
      if (errDoc) {
        setErrorMsg(errDoc);
        setIsSubmitting(false);
        return;
      }

      if (isEdit) {
        // Editar: cabecera + procesar cambios en productos
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
        };
        await onSave(payload, true);
        
        // Procesar cambios en productos si no está confirmado usando endpoint batch
        if (!estaConfirmado) {
          // Recopilar todos los cambios para enviarlos en una sola transacción
          const cambiosBatch = {
            crear: [],
            actualizar: [],
            eliminar: []
          };
          
          // 1. Productos a eliminar (tienen detalleId y están marcados para eliminar)
          const productosAEliminar = form.productos.filter(p => p.eliminar && p.detalleId);
          cambiosBatch.eliminar = productosAEliminar.map(p => p.detalleId);
          
          // 2. Productos nuevos a crear (no tienen detalleId y no están marcados para eliminar)
          const productosNuevos = form.productos.filter(p => !p.detalleId && !p.eliminar);
          const crearResumen = [];
          cambiosBatch.crear = [];
          for (const p of productosNuevos) {
            const cantidad = Number(p.cantidad);
            if (!(cantidad > 0)) continue;
            const productoId = productoIdParaTrasladoApi(p);
            if (!Number.isFinite(productoId) || productoId <= 0) {
              throw new Error(
                "Una línea no tiene id de producto válido. Revisá el traslado."
              );
            }
            const row = {
              productoId,
              cantidad,
            };
            cambiosBatch.crear.push(row);
            crearResumen.push({
              productoId: row.productoId,
              cantidad: row.cantidad,
              medidaCorte: null,
              esCorteLinea_ui: !!p.esCorteLinea,
              productoEntero_insula_ui: p.trasladoProductoBaseId ?? null,
              id_en_formulario: p.id,
              trasladoEnviarProductoId: p.trasladoEnviarProductoId ?? null,
              trasladoMedidaCm_ui: p.trasladoMedidaCm ?? null,
              nombre: p.nombre ?? p.descripcion ?? "",
            });
          }
          
          // 3. Productos existentes a actualizar (tienen detalleId y no están marcados para eliminar)
          const productosExistentes = form.productos.filter(p => p.detalleId && !p.eliminar);
          cambiosBatch.actualizar = productosExistentes
            .filter(p => {
              const cantidad = Number(p.cantidad);
              return cantidad > 0;
            })
            .map((p) => {
              const row = {
                detalleId: p.detalleId,
                cantidad: Number(p.cantidad),
              };
              return row;
            });
          
          // Solo hacer la llamada batch si hay cambios
          if (cambiosBatch.eliminar.length > 0 || 
              cambiosBatch.crear.length > 0 || 
              cambiosBatch.actualizar.length > 0) {
            logTrasladoDebugBatchEditar(movimiento.id, cambiosBatch, crearResumen);
            await actualizarDetallesBatch(movimiento.id, cambiosBatch);
          }
        }
      } else {
        // Crear: cabecera + detalles
        // Filtrar productos con cantidad vacía o 0 antes de enviar
        const productosValidos = form.productos.filter((p) => {
          const cantidad = Number(p.cantidad);
          return p.cantidad !== "" && p.cantidad !== null && Number.isFinite(cantidad) && cantidad > 0;
        });
        
        // Validar que haya al menos un producto válido después de filtrar
        if (productosValidos.length === 0) {
          setErrorMsg("Debe haber al menos un producto con cantidad válida para crear el traslado.");
          setIsSubmitting(false);
          return;
        }
        
        const lineasResumen = [];
        const detalles = productosValidos.map((p, idx) => {
          const productoId = productoIdParaTrasladoApi(p);
          if (!Number.isFinite(productoId) || productoId <= 0) {
            throw new Error(
              "Una línea no tiene id de producto válido. Revisá el traslado."
            );
          }
          const det = {
            producto: { id: productoId },
            cantidad: Number(p.cantidad),
          };
          lineasResumen.push({
            linea: idx + 1,
            productoId_api: det.producto.id,
            cantidad: det.cantidad,
            medidaCorte_enPayload: null,
            esCorteLinea_ui: !!p.esCorteLinea,
            productoEntero_insula_ui: p.trasladoProductoBaseId ?? null,
            id_en_formulario: p.id,
            trasladoEnviarProductoId: p.trasladoEnviarProductoId ?? null,
            trasladoMedidaCm_ui: p.trasladoMedidaCm ?? null,
            nombre: p.nombre ?? p.descripcion ?? "",
          });
          return det;
        });
        const payload = {
          fecha: toLocalDateOnly(form.fecha),
          sedeOrigen: { id: Number(form.sedeOrigenId) },
          sedeDestino: { id: Number(form.sedeDestinoId) },
          detalles,
        };
        logTrasladoDebugCrear(payload, lineasResumen);
        await onSave(payload, false);
      }
      onClose();
    } catch (e) {
      setErrorMsg(formatMensajeErrorTraslado(e) || "No se pudo guardar el traslado.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
      <div
        className="modal-container modal-wide"
        style={{
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2>
          {isEdit ? "Editar traslado" : "Nuevo traslado"}
          {isEdit && estaConfirmado && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura: traslado confirmado)
            </span>
          )}
          {isEdit && !estaConfirmado && !editableWithin2d && (
            <span style={{ marginLeft: 8, fontSize: 14, color: "#a00" }}>
              (solo lectura cabecera: &gt; 2 días)
            </span>
          )}
        </h2>

        {/* Alertas */}
        <div className="modal-alerts">
          {errorMsg && <div className="alert error">{errorMsg}</div>}
          {mismaSede && (
            <div className="alert error">
              La sede de origen y destino no pueden ser la misma.
            </div>
          )}
          {cantidadesInvalidas && (
            <div className="alert error">
              Hay cantidades inválidas (deben ser números &gt; 0).
            </div>
          )}
          {!isEdit && form.productos.length === 0 && (
            <div className="alert warning">
              Debes agregar al menos un producto al traslado.
            </div>
          )}
          {isEdit && !estaConfirmado && (
            <div className="alert info">
              Puedes editar la cabecera (fecha y sedes) y los productos mientras el traslado NO esté confirmado.
            </div>
          )}
          {isEdit && estaConfirmado && (
            <div className="alert warning">
              Este traslado ya fue confirmado. No se puede editar.
            </div>
          )}
        </div>

        <div className="modal-grid">
          {/* Panel izquierdo: formulario */}
          <div className="pane pane-left">
            <div className="form grid-2">
              <label>
                Sede origen
                <select
                  value={form.sedeOrigenId}
                  onChange={(e) => handleChange("sedeOrigenId", e.target.value)}
                  disabled={!canEditHeader}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.id === Number(form.sedeDestinoId)}
                    >
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sede destino
                <select
                  value={form.sedeDestinoId}
                  onChange={(e) =>
                    handleChange("sedeDestinoId", e.target.value)
                  }
                  disabled={!canEditHeader}
                >
                  <option value="">Selecciona...</option>
                  {sedes.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={s.id === Number(form.sedeOrigenId)}
                    >
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                  disabled={!canEditHeader}
                />
              </label>
            </div>

            <h3>Productos del traslado</h3>
            {esTrasladoCentroPatiosBidireccional(form.sedeOrigenId, form.sedeDestinoId) && (
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                <strong>Centro ↔ Patios:</strong> pestaña <strong>Cortes</strong> para mover stock real de
                cortes (id de Corte en BD). Pestaña <strong>Productos</strong> para piezas enteras. El backend
                resta en origen y suma en destino en <code style={{ fontSize: "0.85em" }}>inventario_cortes</code>{" "}
                para cortes.
              </p>
            )}
            {esTrasladoInsulaHaciaCentroOPatios(form.sedeOrigenId, form.sedeDestinoId) && (
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                <strong>Insula → Centro/Patios:</strong> los cortes se agregan solo con <strong>Cortar</strong>{" "}
                (medida). Al confirmar, se busca o crea el registro en <strong>/api/cortes</strong> y el traslado envía{" "}
                <code style={{ fontSize: "0.85em" }}>producto.id</code> = ese Corte (no el id del perfil entero). No se
                descuenta corte en stock de Insula; el destino suma en inventario de cortes. Doble clic: producto entero.
                No enviamos <code style={{ fontSize: "0.85em" }}>productoInventarioADescontarSede1</code> desde este
                formulario. Ver <strong>DOC_TRASLADOS.md</strong>.
              </p>
            )}
            {esTrasladoCentroOPatiosHaciaInsula(form.sedeOrigenId, form.sedeDestinoId) && (
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                <strong>Hacia Insula:</strong> en <strong>Cortes</strong>, doble clic agrega el corte con el{" "}
                <strong>id de Corte</strong> del origen (baja en <code style={{ fontSize: "0.85em" }}>inventario_cortes</code>{" "}
                en 2/3). En Insula no se acredita ese corte en inventario de cortes en este flujo (DOC_TRASLADOS).
              </p>
            )}
            {form.productos.filter(p => !p.eliminar).length === 0 ? (
              <div className="empty-sub">
                {isEdit && estaConfirmado
                  ? "Este traslado ya fue confirmado. No se pueden editar los productos."
                  : "Doble clic en el catálogo para agregar productos."}
              </div>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Color</th>
                    <th style={{ width: 120 }}>Cantidad</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.productos.map((p, idx) => {
                    if (p.eliminar) return null;
                    return (
                    <tr key={`${p.detalleId ?? "n"}-${idx}-${p.id}`}>
                      <td>
                        {p.nombre}
                        {p.esNuevo && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981' }}>(Nuevo)</span>}
                      </td>
                      <td>{p.sku ?? "-"}</td>
                      <td>{p.color ?? "-"}</td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={p.cantidad && Number(p.cantidad) > 0 ? p.cantidad : ""}
                          onChange={(e) =>
                            handleProductoChange(idx, "cantidad", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && 
                                !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(e.key) &&
                                !(e.key === 'a' && e.ctrlKey) &&
                                !(e.key === 'c' && e.ctrlKey) &&
                                !(e.key === 'v' && e.ctrlKey) &&
                                !(e.key === 'x' && e.ctrlKey)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Cantidad"
                          disabled={!canEditProducts}
                        />
                      </td>
                      <td>
                        <button
                          className="btn-ghost"
                          onClick={() => removeProducto(idx)}
                          disabled={!canEditProducts}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Centro - Sidebar de categorías */}
          <div className="pane pane-sidebar">
            <div className="category-section">
              <CategorySidebar 
                categories={[
                  { id: null, nombre: "Todas" },
                  ...categorias
                ]}
                selectedId={selectedCategoryId}
                onSelect={(id) => setSelectedCategoryId(id === null ? null : id)}
              />
            </div>
          </div>

          {/* Panel derecho: catálogo */}
          <div className="pane pane-right">
            <div className="inv-header traslado-catalogo-inv-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  width: "100%",
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {trasladoCatalogoCortes
                    ? vistaCatalogoTraslado === "cortes"
                      ? "Catálogo de cortes"
                      : "Catálogo de productos"
                    : "Catálogo de productos"}
                  {selectedCategoryId && categorias.find(c => c.id === selectedCategoryId) && (
                    <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'normal' }}>
                      {' '}• {categorias.find(c => c.id === selectedCategoryId)?.nombre}
                    </span>
                  )}
                </h3>
                {mostrarSwitchCortesCatalogo && (
                  <div
                    className="traslado-catalogo-switch"
                    role="group"
                    aria-label="Mostrar productos o cortes"
                  >
                    <button
                      type="button"
                      className={
                        vistaCatalogoTraslado === "productos"
                          ? "traslado-catalogo-switch__btn traslado-catalogo-switch__btn--active"
                          : "traslado-catalogo-switch__btn"
                      }
                      onClick={() => setVistaCatalogoTraslado("productos")}
                      disabled={!canEditProducts}
                    >
                      Productos
                    </button>
                    <button
                      type="button"
                      className={
                        vistaCatalogoTraslado === "cortes"
                          ? "traslado-catalogo-switch__btn traslado-catalogo-switch__btn--active"
                          : "traslado-catalogo-switch__btn"
                      }
                      onClick={() => setVistaCatalogoTraslado("cortes")}
                      disabled={!canEditProducts}
                    >
                      Cortes
                    </button>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <input
                  className="inv-search"
                  type="text"
                  placeholder="Buscar por nombre o código…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={!canEditProducts || !form.sedeOrigenId}
                  style={{ flex: 1, minWidth: "160px" }}
                />
                <select
                  className="filter-select"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "0.9rem",
                    minWidth: "140px",
                  }}
                  disabled={!canEditProducts || !form.sedeOrigenId}
                >
                  <option value="">Todos los colores</option>
                  <option value="MATE">MATE</option>
                  <option value="BLANCO">BLANCO</option>
                  <option value="NEGRO">NEGRO</option>
                  <option value="BRONCE">BRONCE</option>
                  <option value="NA">NA</option>
                </select>
              </div>
            </div>

            {catalogoFiltrado.length > 0 && (
              <div
                className="traslado-catalogo-meta"
                style={{ fontSize: "0.85rem", color: "#666", marginBottom: "8px", textAlign: "right" }}
              >
                {catalogoFiltrado.length}{" "}
                {trasladoCatalogoCortes && vistaCatalogoTraslado === "cortes"
                  ? `corte${catalogoFiltrado.length !== 1 ? "s" : ""} encontrado${catalogoFiltrado.length !== 1 ? "s" : ""}`
                  : `producto${catalogoFiltrado.length !== 1 ? "s" : ""} encontrado${catalogoFiltrado.length !== 1 ? "s" : ""}`}
              </div>
            )}
            {muestraBotonCortarEnCatalogo && (
              <div
                className="traslado-catalogo-meta"
                style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "8px" }}
              >
                En Insula, agregá cortes con <strong>Cortar</strong> (medida). Doble clic sigue sirviendo para
                productos enteros.
              </div>
            )}

            <div className="inventory-scroll">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: muestraBotonCortarEnCatalogo ? "38%" : "45%" }}>Nombre</th>
                    <th style={{ width: "18%" }}>Código</th>
                    <th style={{ width: "11%" }}>Color</th>
                    <th style={{ width: "16%", textAlign: "right" }}>Unid. origen</th>
                    {muestraBotonCortarEnCatalogo && (
                      <th style={{ width: "17%", textAlign: "center" }}>Cortar</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!form.sedeOrigenId ? (
                    <tr>
                      <td colSpan={muestraBotonCortarEnCatalogo ? 5 : 4} className="empty">
                        Selecciona sede origen para cargar el catálogo.
                      </td>
                    </tr>
                  ) : loadingCatalogo ? (
                    <tr>
                      <td colSpan={muestraBotonCortarEnCatalogo ? 5 : 4} className="empty">
                        Cargando catálogo...
                      </td>
                    </tr>
                  ) : catalogoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={muestraBotonCortarEnCatalogo ? 5 : 4} className="empty">
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    catalogoFiltrado.map((item) => (
                      <tr
                        key={String(item.id)}
                        onDoubleClick={() => {
                          if (canEditProducts) addProducto(item);
                        }}
                        title={
                          isEdit
                            ? "Solo lectura en edición"
                            : muestraBotonCortarEnCatalogo
                              ? "Doble clic: producto entero. Cortar: perfil a medida."
                              : "Doble clic para agregar"
                        }
                        style={{
                          cursor: canEditProducts ? "pointer" : "not-allowed",
                          opacity: canEditProducts ? 1 : 0.6,
                        }}
                      >
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{item.nombre}</td>
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{obtenerCodigoProducto(item) || "-"}</td>
                        <td onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          if (canEditProducts) addProducto(item); 
                        }}>{item.color ?? "-"}</td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (canEditProducts) addProducto(item);
                          }}
                          style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                        >
                          {obtenerUnidadesSedeOrigen(item)}
                        </td>
                        {muestraBotonCortarEnCatalogo && (
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn-guardar"
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.78rem",
                                whiteSpace: "nowrap",
                              }}
                              disabled={!canEditProducts}
                              onClick={() => abrirCortarTraslado(item)}
                            >
                              Cortar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="modal-buttons">
          <button className="btn-cancelar" onClick={onClose} disabled={isSubmitting}>
            {isEdit && !editableWithin2d ? "Cerrar" : "Cancelar"}
          </button>
          <button
            className="btn-guardar"
            onClick={handleSubmit}
            disabled={disabledSubmit}
            title={
              disabledSubmit
                ? "Completa la información o corrige validaciones"
                : (isEdit ? "Guardar cambios" : "Crear traslado")
            }
          >
            {isSubmitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear traslado"}
          </button>
        </div>

        <CortarModal
          isOpen={modalCorteTraslado.isOpen}
          onClose={cerrarModalCorteTraslado}
          producto={modalCorteTraslado.producto}
          onCortar={handleCortarTrasladoInsula}
          sedeFiltroId={Number(form.sedeOrigenId) > 0 ? Number(form.sedeOrigenId) : null}
        />
      </div>
    </div>
  );
}
