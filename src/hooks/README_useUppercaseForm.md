# Hook useUppercaseForm - Documentación

## Descripción
Hook personalizado para manejar formularios con conversión automática a mayúsculas y validaciones específicas para campos numéricos.

## Características
- **Conversión automática a mayúsculas** en campos de texto
- **Validaciones numéricas** configurables
- **Patrones predefinidos** para validaciones comunes
- **Estilos automáticos** con helper function
- **Reutilizable** en cualquier formulario

## Importación
```javascript
import { 
  useUppercaseForm, 
  getInputStyles, 
  VALIDATION_PATTERNS 
} from "../hooks/useUppercaseForm.js";
```

## Uso Básico

### 1. Configuración del Hook
```javascript
const initialState = {
  nit: "",
  nombre: "",
  direccion: "",
  telefono: "",
  email: ""
};

// Campos que solo permiten números
const numericFields = ['nit', 'telefono'];

// Reglas de validación para campos específicos
const validationRules = {
  nit: { regex: VALIDATION_PATTERNS.NIT_9_DIGITS },
  telefono: { regex: VALIDATION_PATTERNS.PHONE_12_DIGITS }
};

const { formData, handleChange, setFormData, resetForm } = useUppercaseForm(
  initialState, 
  numericFields, 
  null, // null = mayúsculas en todos los campos de texto
  validationRules
);
```

### 2. Uso en JSX
```javascript
<input
  type="text"
  name="nombre"
  value={formData.nombre}
  onChange={handleChange}
  style={getInputStyles('nombre', numericFields)}
  placeholder="Nombre completo"
  required
/>

<input
  type="text"
  name="nit"
  value={formData.nit}
  onChange={handleChange}
  placeholder="9 dígitos"
  maxLength="9"
  required
/>
```

## Parámetros del Hook

### `useUppercaseForm(initialState, numericFields, uppercaseFields, validationRules)`

| Parámetro | Tipo | Descripción | Por Defecto |
|-----------|------|-------------|-------------|
| `initialState` | Object | Estado inicial del formulario | `{}` |
| `numericFields` | Array | Campos que solo permiten números | `[]` |
| `uppercaseFields` | Array\|null | Campos para mayúsculas. Si es `null`, aplica a todos los no numéricos | `null` |
| `validationRules` | Object | Reglas de validación por campo | `{}` |

### Valor de Retorno
```javascript
{
  formData,      // Estado actual del formulario
  handleChange,  // Función para manejar cambios
  resetForm,     // Función para resetear el formulario
  setFormData    // Función para establecer datos directamente
}
```

## Patrones de Validación Disponibles

```javascript
VALIDATION_PATTERNS = {
  NIT_9_DIGITS: /^\\d{0,9}$/,        // 0-9 dígitos para NIT
  PHONE_12_DIGITS: /^\\d{0,12}$/,    // 0-12 dígitos para teléfono
  ONLY_NUMBERS: /^\\d*$/,            // Solo números sin límite
  ALPHANUMERIC: /^[a-zA-Z0-9\\s]*$/, // Alfanumérico con espacios
  TEXT_ONLY: /^[a-zA-ZÀ-ÿ\\s]*$/    // Solo letras con acentos
}
```

## Ejemplos de Uso

### Ejemplo 1: Formulario de Clientes
```javascript
const ClienteModal = () => {
  const initialState = {
    cedula: "",
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    direccion: ""
  };

  const { formData, handleChange, resetForm } = useUppercaseForm(
    initialState,
    ['cedula', 'telefono'], // Solo números
    ['nombre', 'apellido', 'direccion'], // Solo estos en mayúsculas
    {
      cedula: { regex: VALIDATION_PATTERNS.ONLY_NUMBERS },
      telefono: { regex: VALIDATION_PATTERNS.PHONE_12_DIGITS }
    }
  );

  return (
    <form>
      <input 
        name="cedula" 
        value={formData.cedula}
        onChange={handleChange}
        placeholder="Cédula"
      />
      <input 
        name="nombre" 
        value={formData.nombre}
        onChange={handleChange}
        style={getInputStyles('nombre', ['cedula', 'telefono'])}
        placeholder="Nombre"
      />
      {/* ... más campos */}
    </form>
  );
};
```

### Ejemplo 2: Formulario de Productos
```javascript
const ProductoModal = () => {
  const { formData, handleChange } = useUppercaseForm(
    { codigo: "", nombre: "", categoria: "", precio: "" },
    ['precio'], // Solo precio numérico
    null, // Mayúsculas en todos los de texto
    {
      precio: { regex: /^\\d*\\.?\\d*$/ } // Decimales permitidos
    }
  );

  return (
    <form>
      <input 
        name="codigo"
        value={formData.codigo}
        onChange={handleChange}
        style={getInputStyles('codigo', ['precio'])}
      />
      {/* ... */}
    </form>
  );
};
```

## Beneficios

1. **Consistencia**: Todos los formularios tendrán el mismo comportamiento
2. **Reutilización**: Un solo hook para múltiples formularios
3. **Mantenimiento**: Cambios centralizados en validaciones
4. **UX Mejorada**: Conversión automática y validación en tiempo real
5. **Flexibilidad**: Configurable según necesidades específicas

## Notas Importantes

- Los campos numéricos NO se convierten a mayúsculas
- La conversión se aplica tanto en JavaScript como visualmente con CSS
- Las validaciones son opcionales y configurables
- El hook es compatible con formularios existentes
- Se puede extender fácilmente para nuevos patrones de validación