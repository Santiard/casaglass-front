# Guía de Despliegue - Frontend CasaGlass

Esta documentación describe cómo configurar el frontend para funcionar en dos entornos: desarrollo y producción, con dos opciones de despliegue en producción.

## 📋 Tabla de Contenidos

- [Configuración de Entornos](#configuración-de-entornos)
- [Opciones de Despliegue en Producción](#opciones-de-despliegue-en-producción)
- [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
- [Configuración del Backend (CORS)](#configuración-del-backend-cors)
- [Build y Despliegue](#build-y-despliegue)
- [Dockerfile (Nginx)](#dockerfile-nginx)
- [Verificación](#verificación)

---

## Configuración de Entornos

### Desarrollo (Local/IP)

**URL del Backend:** `http://148.230.87.167:8080`

El frontend está configurado para usar esta URL en desarrollo mediante la variable de entorno `VITE_API_URL` en `.env.development`.

### Producción

El frontend soporta dos opciones de despliegue:

1. **Subdominios** (ej: `https://api.midominio.com`)
2. **Mismo dominio con rutas** (ej: `https://midominio.com/api`)

---

## Opciones de Despliegue en Producción

### Opción 1: Subdominios

**Estructura:**
- Frontend: `https://app.midominio.com` (o `https://midominio.com`)
- Backend: `https://api.midominio.com`

**Configuración:**

1. **`.env.production`:**
```env
VITE_API_URL=https://api.midominio.com
# VITE_ROUTER_BASENAME no se define (o se deja vacío)
```

2. **Backend (Spring Boot):**
```java
@CrossOrigin(origins = {
    "https://app.midominio.com",
    "http://localhost:3000",
    "http://148.230.87.167:3000"
}, allowCredentials = true)
```

3. **Cookies (HTTPS):**
- `Secure: true`
- `SameSite: None`

---

### Opción 2: Mismo Dominio con Rutas

**Estructura:**
- Frontend: `https://midominio.com/app` (o `https://midominio.com`)
- Backend: `https://midominio.com/api` (proxy reverso)

**Configuración:**

1. **`.env.production`:**
```env
# Dejar VITE_API_URL vacío o no definirlo
# VITE_API_URL=

# Si el frontend está en subruta /app
VITE_ROUTER_BASENAME=/app
```

2. **Backend (Spring Boot):**
```java
@CrossOrigin(origins = {
    "https://midominio.com",
    "http://localhost:3000",
    "http://148.230.87.167:3000"
}, allowCredentials = true)
```

3. **Reverse Proxy (Nginx/Traefik):**
```nginx
# Ejemplo Nginx
location /api {
    proxy_pass http://backend:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /app {
    alias /usr/share/nginx/html;
    try_files $uri $uri/ /app/index.html;
}

location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

---

## Configuración de Variables de Entorno

### Archivos `.env`

#### `.env.development`
```env
# Desarrollo - API en IP local
VITE_API_URL=http://148.230.87.167:8080
```

#### `.env.production`
```env
# Opción 1: Subdominio
VITE_API_URL=https://api.midominio.com

# Opción 2: Mismo dominio (dejar vacío)
# VITE_API_URL=

# Si el frontend está en subruta (ej: /app)
# VITE_ROUTER_BASENAME=/app
```

### Variables Disponibles

- **`VITE_API_URL`**: URL base de la API
  - Desarrollo: `http://148.230.87.167:8080`
  - Producción (subdominio): `https://api.midominio.com`
  - Producción (mismo dominio): vacío o no definido → usa `/api`

- **`VITE_ROUTER_BASENAME`**: Basename para React Router
  - Solo necesario si el frontend está en subruta (ej: `/app`)
  - Si está en la raíz, no se define

---

## Configuración del Backend (CORS)

### Spring Boot - Ejemplo de Configuración

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins(
                        "https://app.midominio.com",      // Producción (subdominio)
                        "https://midominio.com",           // Producción (mismo dominio)
                        "http://localhost:3000",           // Desarrollo local
                        "http://148.230.87.167:3000"       // Desarrollo IP
                    )
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
```

### Cookies en Producción (HTTPS)

Si usas autenticación por cookies, asegúrate de configurar:

```java
// En tu configuración de seguridad
.httpOnly(true)
.secure(true)  // Solo en HTTPS
.sameSite("None")  // Para cross-origin
```

---

## Build y Despliegue

### Scripts Disponibles

```json
{
  "scripts": {
    "dev": "vite",              // Desarrollo
    "build": "vite build",      // Build producción
    "preview": "vite preview"    // Preview del build
  }
}
```

### Build de Producción

```bash
# Build para producción
npm run build

# El output se genera en: dist/
```

### Verificar Variables de Entorno en Build

```bash
# Verificar que las variables se incluyan
npm run build
# Revisar dist/assets/*.js para confirmar que VITE_API_URL está incluida
```

---

## Dockerfile (Nginx)

### Ejemplo de Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Build para producción
# Vite automáticamente usa .env.production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copiar archivos del build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Configuración Nginx (nginx.conf)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Si usas subruta /app
    location /app {
        alias /usr/share/nginx/html;
        try_files $uri $uri/ /app/index.html;
    }

    # Proxy para API (si usas mismo dominio)
    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Verificación

### Criterios de Aceptación

✅ **No hay URLs hardcodeadas**
- Todas las llamadas a la API usan `API_BASE` desde `src/lib/api.js`
- No hay `fetch()` o `axios` con URLs fijas

✅ **Build de desarrollo funciona**
- `npm run dev` usa `http://148.230.87.167:8080`

✅ **Build de producción funciona con ambas opciones**
- **Subdominios**: `VITE_API_URL=https://api.midominio.com`
- **Mismo dominio**: `VITE_API_URL` vacío → usa `/api`

✅ **Autenticación por cookies**
- Todas las peticiones incluyen `withCredentials: true`
- Backend configurado con CORS apropiado

✅ **Router con basename**
- Si `VITE_ROUTER_BASENAME=/app` está definido, las rutas funcionan correctamente

### Comandos de Verificación

```bash
# 1. Verificar que no hay URLs hardcodeadas
grep -r "localhost:8080\|148\.230\.87\.167" src/ --exclude-dir=node_modules
# No debería encontrar nada (excepto en comentarios)

# 2. Verificar variables de entorno
cat .env.development
cat .env.production

# 3. Build de producción
npm run build
ls -la dist/

# 4. Preview del build
npm run preview
```

---

## Resumen de Configuración por Entorno

| Entorno | VITE_API_URL | VITE_ROUTER_BASENAME | Backend URL |
|---------|--------------|----------------------|-------------|
| **Desarrollo** | `http://148.230.87.167:8080` | - | `http://148.230.87.167:8080` |
| **Prod (Subdominio)** | `https://api.midominio.com` | - | `https://api.midominio.com` |
| **Prod (Mismo dominio)** | (vacío) | `/app` (opcional) | `https://midominio.com/api` |

---

## Notas Importantes

1. **Variables de Entorno en Vite:**
   - Deben comenzar con `VITE_` para ser expuestas al cliente
   - Se reemplazan en tiempo de build (no en runtime)

2. **Cookies y CORS:**
   - En producción con HTTPS, las cookies deben ser `Secure`
   - Para cross-origin, usar `SameSite=None`

3. **Proxy de Vite en Desarrollo:**
   - El proxy en `vite.config.js` apunta a `localhost:8080`
   - En desarrollo, se usa directamente `VITE_API_URL` del `.env.development`

4. **Base de Datos:**
   - DB en Docker: `casaglassDB` / usuario `casaglassuser`
   - En producción: `SPRING_PROFILES_ACTIVE=prod`
   - API en puerto `:8080`

---

## Soporte

Si encuentras problemas, verifica:
1. Variables de entorno en `.env.development` / `.env.production`
2. Configuración de CORS en el backend
3. Configuración del reverse proxy (si usas mismo dominio)
4. Logs del navegador (F12) para errores de CORS o conexión

