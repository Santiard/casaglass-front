# Validación de NITs Duplicados - Clientes

## **Sistema Implementado**

### 🔄 **Flujo de Validación Completo**

#### **1. Validación en Tiempo Real (ClienteModal)**
- **Ubicación**: `ClienteModal.jsx` - función `handleChange()`
- **Trigger**: Cada vez que el usuario escribe en el campo NIT
- **Condición**: Solo al crear (no al editar) y cuando NIT tiene ≥ 1 dígito
- **Acción**: 
  - Campo se marca en rojo
  - Muestra mensaje "Este NIT ya está registrado"
  - Deshabilita botón de guardar

```javascript
if (!clienteAEditar && value.length >= 1) {
  const existe = clientesExistentes.some(cliente => 
    cliente.nit === value
  );
  setNitDuplicado(existe);
}
```

#### **2. Validación en Envío de Formulario (ClienteModal)**
- **Ubicación**: `ClienteModal.jsx` - función `validate()`
- **Trigger**: Al hacer submit del formulario
- **Condición**: Solo al crear nuevos clientes
- **Acción**: Retorna mensaje de error si encuentra duplicado

```javascript
if (!clienteAEditar && nit) {
  const nitExiste = clientesExistentes.some(cliente => 
    cliente.nit === nit
  );
  if (nitExiste) {
    return `Ya existe un cliente registrado con el NIT ${nit}.`;
  }
}
```

#### **3. Validación en Página Principal (ClientesPage)**
- **Ubicación**: `ClientesPage.jsx` - función `handleGuardar()`
- **Trigger**: Antes de llamar al servicio de creación
- **Condición**: Solo al crear (isEdit = false)
- **Acción**: Muestra alert y cancela la operación

```javascript
if (!isEdit && cliente.nit) {
  const nitExiste = data.some(clienteExistente => 
    clienteExistente.nit === cliente.nit
  );
  
  if (nitExiste) {
    alert(`Ya existe un cliente registrado con el NIT ${cliente.nit}...`);
    throw new Error(`NIT duplicado: ${cliente.nit}`);
  }
}
```

### **Flujo de Datos**

```
ClientesPage
    ↓ (data array)
ClientesTable 
    ↓ (clientesExistentes prop)
ClienteModal
    ↓ (validaciones en tiempo real y envío)
ClientesPage.handleGuardar()
    ↓ (validación final)
ClientesService.crearCliente()
```

### **Capas de Protección**

| Capa | Ubicación | Momento | Feedback |
|------|-----------|---------|----------|
| **1. Tiempo Real** | `ClienteModal` | Al escribir | Visual (rojo + mensaje) |
| **2. Formulario** | `ClienteModal` | Al enviar | Error en modal |
| **3. Página** | `ClientesPage` | Antes de API | Alert + cancelación |
| **4. Backend** | Servidor | En base de datos | Response error |

### **Casos de Uso Cubiertos**

#### **Escenarios Válidos**
- Crear cliente con NIT nuevo único
- Editar cliente existente (NIT no cambia)
- Campo NIT vacío y luego completado correctamente

#### **Escenarios Bloqueados**
- Escribir NIT que ya existe → Campo rojo + botón deshabilitado
- Enviar formulario con NIT duplicado → Error en modal
- Intentar crear desde página con NIT existente → Alert + cancelación

#### 🔄 **Flujo de Usuario Típico**

1. **Usuario abre modal "Agregar Cliente"**
2. **Escribe NIT**: `123456789`
3. **Si NIT existe**:
   - Campo se pone rojo inmediatamente
   - Aparece mensaje "Este NIT ya está registrado"
   - Botón "Agregar" se deshabilita
   - Usuario no puede continuar
4. **Si NIT es único**:
   - Campo permanece normal
   - Botón "Agregar" habilitado
   - Usuario puede completar y enviar

### 🔧 **Configuración Técnica**

#### **Props Requeridas**
- `clientesExistentes`: Array de clientes desde `ClientesPage`
- `clienteAEditar`: Null al crear, objeto al editar

#### **Estados del Modal**
- `nitDuplicado`: Boolean para controlar UI de error
- `formData`: Datos del formulario con validaciones
- `errorMsg`: Mensajes de error generales

#### **Validaciones Aplicadas**
- **Formato**: Solo números, máximo 10 dígitos
- **Requerido**: NIT obligatorio para crear
- **Único**: No puede repetirse entre clientes existentes
- **Inmutable**: No se puede cambiar al editar

## **Resultado Final**

El sistema garantiza que **NUNCA** se podrá crear un cliente con un NIT duplicado, proporcionando feedback inmediato al usuario y múltiples capas de validación para máxima seguridad.

### **Experiencia de Usuario**
- **Feedback inmediato**: Ve el error mientras escribe
- **Prevención proactiva**: No puede enviar datos inválidos  
- **Mensajes claros**: Sabe exactamente qué está mal
- **Consistencia**: Mismo comportamiento que proveedores