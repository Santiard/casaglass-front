# Configuración de Entornos - Resumen Rápido

## ✅ Cambios Realizados

### 1. Variables de Entorno
- ✅ `.env.development` - Configurado con `VITE_API_URL=http://148.230.87.167:8080`
- ✅ `.env.production` - Preparado para ambas opciones (subdominio o mismo dominio)

### 2. Configuración de API
- ✅ `src/lib/api.js` - Centralizado, usa `VITE_API_URL` con fallback a `/api`
- ✅ `withCredentials: true` - Habilitado para cookies de autenticación
- ✅ Todas las llamadas a API usan la instancia centralizada `api`

### 3. Eliminación de URLs Hardcodeadas
- ✅ `CreditosPage.jsx` - Actualizado para usar `api` en lugar de `fetch`
- ✅ `AbonoModal.jsx` - Actualizado para usar `api` en lugar de `fetch`
- ✅ No quedan URLs hardcodeadas en el código

### 4. Router con Basename
- ✅ `App.jsx` - Configurado con `basename` opcional via `VITE_ROUTER_BASENAME`
- ✅ Soporta despliegue en subruta (ej: `/app`)

### 5. Documentación
- ✅ `docs/DEPLOYMENT.md` - Guía completa de despliegue

---

## 🚀 Uso Rápido

### Desarrollo
```bash
# Ya está configurado en .env.development
npm run dev
# El frontend apuntará a: http://148.230.87.167:8080
```

### Producción - Opción 1: Subdominio
```env
# .env.production
VITE_API_URL=https://api.midominio.com
```

### Producción - Opción 2: Mismo Dominio
```env
# .env.production
VITE_API_URL=
# (vacío o no definido)

# Si el frontend está en subruta:
VITE_ROUTER_BASENAME=/app
```

---

## 📋 Checklist de Verificación

- [x] Archivos `.env.development` y `.env.production` creados
- [x] `src/lib/api.js` centralizado con `VITE_API_URL`
- [x] `withCredentials: true` habilitado
- [x] No hay URLs hardcodeadas en el código
- [x] Router configurado con basename opcional
- [x] Documentación completa creada
- [x] Build scripts verificados

---

## 📖 Documentación Completa

Ver `docs/DEPLOYMENT.md` para detalles completos sobre:
- Configuración de CORS en el backend
- Configuración de Nginx/Docker
- Ejemplos de despliegue
- Troubleshooting

