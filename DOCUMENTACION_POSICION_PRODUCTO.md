# 📍 Documentación: Sistema de Posiciones para Productos

## ✅ Funcionalidad Implementada

El sistema ahora permite **insertar productos en una posición específica** dentro de la lista ordenada. Cuando se inserta un producto en una posición, todos los productos posteriores se corren automáticamente hacia abajo.

---

## 🎯 Comportamiento

### Escenario 1: Insertar con Posición Específica

**Ejemplo:** Insertar un producto en la posición 5

**Antes:**
```
Posición 1: Producto A
Posición 2: Producto B
Posición 3: Producto C
Posición 4: Producto D
Posición 5: Producto E
Posición 6: Producto F
...
```

**Después de insertar "Producto Nuevo" en posición 5:**
```
Posición 1: Producto A
Posición 2: Producto B
Posición 3: Producto C
Posición 4: Producto D
Posición 5: Producto Nuevo  ← NUEVO
Posición 6: Producto E       ← Corrido (era 5)
Posición 7: Producto F      ← Corrido (era 6)
...
```

### Escenario 2: Insertar sin Posición

Si **NO** se especifica posición, el producto se inserta al final:
- Se obtiene la máxima posición existente
- Se asigna: `máxima posición + 1`

---

## 📋 Endpoint: Crear Producto

**Método:** `POST`  
**URL:** `/api/productos`  
**Controller:** `ProductoController.crear`

---

## 📦 Request Body

### Con Posición Específica

```json
{
  "codigo": "PROD-001",
  "nombre": "Producto Nuevo",
  "tipo": "BASE",
  "color": "MATE",
  "costo": 10000,
  "precio1": 15000,
  "precio2": 14000,
  "precio3": 13000,
  "posicion": "5",  // ← Especifica la posición donde insertar
  "categoria": {
    "id": 1
  }
}
```

### Sin Posición (se inserta al final)

```json
{
  "codigo": "PROD-001",
  "nombre": "Producto Nuevo",
  "tipo": "BASE",
  "color": "MATE",
  "costo": 10000,
  "precio1": 15000,
  "precio2": 14000,
  "precio3": 13000,
  // posicion no se envía o se envía null
  "categoria": {
    "id": 1
  }
}
```

---

## ✅ Validaciones

### Campo `posicion`

- ✅ **Tipo:** `String` (se almacena como texto en la BD)
- ✅ **Formato:** Debe ser un número válido (ej: `"5"`, `"10"`, `"100"`)
- ✅ **Valor mínimo:** Debe ser `> 0` (no se acepta 0 o negativos)
- ⚠️ **Opcional:** Si no se envía o es `null`, se asigna automáticamente al final

**Errores posibles:**

```json
// ❌ Posición inválida (no es número)
{
  "error": "La posición debe ser un número válido. Valor recibido: abc"
}

// ❌ Posición negativa o cero
{
  "error": "La posición debe ser un número positivo mayor a 0"
}
```

---

## 🔄 Flujo de Ejecución

1. **Frontend envía** el producto con `posicion` (opcional)
2. **Backend valida** la posición:
   - Si viene posición → valida que sea número positivo
   - Si no viene → asigna última posición + 1
3. **Backend corre posiciones:**
   - Si se especificó posición → todos los productos con posición >= se corren (+1)
   - Se ordenan descendente para evitar conflictos
4. **Backend guarda** el nuevo producto con la posición asignada
5. **Backend crea** inventario inicial (cantidad 0 en las 3 sedes)

---

## 📝 Ejemplos de Uso en el Frontend

### Ejemplo 1: Insertar en Posición Específica

```typescript
// ProductosService.ts
export const crearProducto = async (producto: Producto, posicion?: number): Promise<Producto> => {
  const payload = {
    ...producto,
    posicion: posicion ? String(posicion) : undefined
  };

  const response = await fetch(`${API_URL}/productos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear el producto');
  }

  return response.json();
};

// Uso en componente
const handleCrearProducto = async (producto: Producto, posicionDeseada: number) => {
  try {
    await crearProducto(producto, posicionDeseada);
    toast.success(`Producto creado en la posición ${posicionDeseada}`);
    // Recargar lista de productos
    cargarProductos();
  } catch (error) {
    toast.error(error.message);
  }
};
```

### Ejemplo 2: Insertar al Final (sin posición)

```typescript
// Insertar al final (no especificar posición)
const handleCrearProductoAlFinal = async (producto: Producto) => {
  try {
    await crearProducto(producto); // Sin segundo parámetro
    toast.success('Producto creado al final de la lista');
    cargarProductos();
  } catch (error) {
    toast.error(error.message);
  }
};
```

### Ejemplo 3: Insertar en la Primera Posición

```typescript
// Insertar al inicio (posición 1)
const handleCrearProductoAlInicio = async (producto: Producto) => {
  try {
    await crearProducto(producto, 1); // Posición 1
    toast.success('Producto creado al inicio de la lista');
    cargarProductos();
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## 🎨 Casos de Uso en el Frontend

### Caso 1: Modal de Creación con Selector de Posición

```typescript
// Componente React
const [posicionSeleccionada, setPosicionSeleccionada] = useState<number | null>(null);

const ProductoForm = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  
  // Cargar productos para mostrar opciones de posición
  useEffect(() => {
    cargarProductos();
  }, []);

  const handleSubmit = async (producto: Producto) => {
    try {
      await crearProducto(producto, posicionSeleccionada || undefined);
      // Recargar y cerrar modal
      cargarProductos();
      cerrarModal();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del producto */}
      
      <div>
        <label>Posición en la lista:</label>
        <select 
          value={posicionSeleccionada || ''} 
          onChange={(e) => setPosicionSeleccionada(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Al final (automático)</option>
          {productos.map((_, index) => (
            <option key={index} value={index + 1}>
              Posición {index + 1}
            </option>
          ))}
          <option value={productos.length + 1}>
            Al final (posición {productos.length + 1})
          </option>
        </select>
      </div>
      
      <button type="submit">Crear Producto</button>
    </form>
  );
};
```

### Caso 2: Drag & Drop para Reordenar

Si implementas drag & drop en el frontend, puedes:

1. **Al soltar un producto en una nueva posición:**
   - Calcular la nueva posición basada en el índice
   - Llamar a `crearProducto` con esa posición
   - El backend automáticamente correrá los demás productos

2. **Para actualizar posición de un producto existente:**
   - Usar el endpoint `PUT /api/productos/{id}` con el campo `posicion`
   - (Nota: Actualmente el backend solo maneja esto en creación, pero se puede extender)

---

## ⚠️ Consideraciones Importantes

### 1. Ordenamiento en el Frontend

Para mostrar los productos ordenados por posición:

```typescript
// Ordenar productos por posición numérica
const productosOrdenados = productos.sort((a, b) => {
  const posA = a.posicion ? parseInt(a.posicion) : 999999;
  const posB = b.posicion ? parseInt(b.posicion) : 999999;
  return posA - posB;
});
```

### 2. Productos sin Posición

Si hay productos sin posición (posicion = null o vacío):
- Se muestran al final
- O se les asigna una posición automáticamente

```typescript
// Manejar productos sin posición
const productosOrdenados = productos.sort((a, b) => {
  const posA = a.posicion ? parseInt(a.posicion) : Number.MAX_SAFE_INTEGER;
  const posB = b.posicion ? parseInt(b.posicion) : Number.MAX_SAFE_INTEGER;
  return posA - posB;
});
```

### 3. Rendimiento

- ✅ El backend corre las posiciones de forma eficiente
- ✅ Se actualizan solo los productos afectados
- ✅ Se ordenan descendente para evitar conflictos de actualización

### 4. Concurrencia

- ⚠️ Si dos usuarios insertan productos simultáneamente en la misma posición, puede haber conflictos
- ✅ El sistema maneja esto ordenando descendente antes de actualizar
- 💡 Considera implementar locks o validaciones adicionales si hay alta concurrencia

---

## 🔧 Endpoints Relacionados

### Crear Producto
- **POST** `/api/productos`
- Acepta campo `posicion` (opcional)

### Actualizar Producto
- **PUT** `/api/productos/{id}`
- Actualmente acepta `posicion` pero **NO corre** las posiciones de otros productos
- Si necesitas esta funcionalidad, se puede implementar

### Listar Productos
- **GET** `/api/productos`
- Los productos se pueden ordenar por posición en el frontend

---

## 📊 Ejemplo Completo de Request

```json
POST /api/productos
Content-Type: application/json

{
  "codigo": "VID-001",
  "nombre": "Vidrio Templado 6mm",
  "tipo": "VIDRIO",
  "color": "TRANSPARENTE",
  "costo": 50000,
  "precio1": 75000,
  "precio2": 70000,
  "precio3": 65000,
  "posicion": "10",  // ← Insertar en posición 10
  "categoria": {
    "id": 2
  },
  "descripcion": "Vidrio templado de 6mm de espesor"
}
```

**Respuesta exitosa:**
```json
{
  "id": 123,
  "codigo": "VID-001",
  "nombre": "Vidrio Templado 6mm",
  "posicion": "10",
  "tipo": "VIDRIO",
  "color": "TRANSPARENTE",
  "costo": 50000,
  "precio1": 75000,
  "precio2": 70000,
  "precio3": 65000,
  ...
}
```

---

## ✅ Resumen

- ✅ Se puede especificar `posicion` al crear un producto
- ✅ Si se especifica posición, los productos posteriores se corren automáticamente
- ✅ Si no se especifica, se inserta al final
- ✅ La posición debe ser un número positivo > 0
- ✅ El backend maneja todo el reordenamiento automáticamente

---

## 🧪 Casos de Prueba Recomendados

1. ✅ Crear producto con posición 1 → debe insertarse al inicio
2. ✅ Crear producto con posición intermedia (ej: 50) → debe correr productos posteriores
3. ✅ Crear producto sin posición → debe insertarse al final
4. ✅ Crear producto con posición inválida (texto) → debe retornar error
5. ✅ Crear producto con posición 0 o negativa → debe retornar error
6. ✅ Crear múltiples productos en la misma posición → debe funcionar (se corren entre sí)

---

## 📞 Soporte

Si encuentras algún problema o comportamiento inesperado, contacta al equipo de backend con:
- El payload que enviaste
- La posición que intentaste usar
- El error recibido (si aplica)

