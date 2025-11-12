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

### Opción 2: Mismo Dominio con Rutas (NO RECOMENDADO)

**NOTA:** Esta opción requiere configuración adicional del proxy. Se recomienda usar la Opción 1 (mismo servidor) que es más simple.

**Estructura:**
- Frontend: `https://midominio.com/app` (o `https://midominio.com`)
- Backend: `https://midominio.com/api` (proxy reverso)

**Configuración:**

1. **`.env.production`:**
```env
# Usar directamente la URL del backend (RECOMENDADO)
VITE_API_URL=http://148.230.87.167:8080

# O si el backend está en otro servidor:
# VITE_API_URL=https://api.midominio.com

# Si el frontend está en subruta /app
# VITE_ROUTER_BASENAME=/app
```

2. **Backend (Spring Boot):**
```java
@CrossOrigin(origins = {
    "https://midominio.com",
    "http://localhost:3000",
    "http://148.230.87.167:3000"
}, allowCredentials = true)
```

3. **Reverse Proxy (Nginx/Traefik) - Solo si es necesario:**
```nginx
# Solo usar si realmente necesitas el proxy
# IMPORTANTE: El backend NO espera el prefijo /api, así que lo eliminamos con la barra al final
location /api {
    proxy_pass http://backend:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
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
# IMPORTANTE: El backend NO usa el prefijo /api. Todas las URLs van directas.
# Opción 1: Mismo servidor (RECOMENDADO)
VITE_API_URL=http://148.230.87.167:8080

# Opción 2: Subdominio
# VITE_API_URL=https://api.midominio.com

# Si el frontend está en subruta (ej: /app)
# VITE_ROUTER_BASENAME=/app
```

### Variables Disponibles

- **`VITE_API_URL`**: URL base de la API
  - **IMPORTANTE:** El backend NO usa el prefijo `/api`. Todas las URLs van directas.
  - Desarrollo: `http://148.230.87.167:8080`
  - Producción (mismo servidor): `http://148.230.87.167:8080` (RECOMENDADO)
  - Producción (subdominio): `https://api.midominio.com`
  - **En producción SIEMPRE debe estar definida**, no usar el fallback `/api`

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
| **Prod (Mismo servidor)** | `http://148.230.87.167:8080` | - | `http://148.230.87.167:8080` |
| **Prod (Subdominio)** | `https://api.midominio.com` | - | `https://api.midominio.com` |

**IMPORTANTE:** El backend NO usa el prefijo `/api`. Todas las URLs van directamente al backend sin prefijo.

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

### Error 500 en Login - Backend en Mismo Servidor

**Síntoma:** Error 500 al intentar hacer login en producción, el frontend está en `http://148.230.87.167:3000` y el backend en `http://148.230.87.167:8080`.

**Causa:** La aplicación no tiene configurada la URL del backend en producción, por lo que intenta usar `/api` que no está configurado correctamente.

**Solución (Recomendada):** Crear `.env.production` con la URL del backend directamente:

```bash
# Crear archivo .env.production en la raíz del proyecto
echo "VITE_API_URL=http://148.230.87.167:8080" > .env.production
```

**IMPORTANTE:** El backend NO usa el prefijo `/api`. Todas las URLs van directamente al backend sin prefijo.

Luego reconstruir y redesplegar:
```bash
npm run build
# Reconstruir el contenedor Docker si es necesario
docker build -t casaglass-front .
docker run -d -p 3000:80 casaglass-front
```

**Nota sobre el proxy de Nginx:**
- El `nginx.conf` tiene configurado el proxy como respaldo, pero es mejor usar `VITE_API_URL` directamente
- Si necesitas usar el proxy, asegúrate de que `proxy_pass` tenga la barra al final: `proxy_pass http://148.230.87.167:8080/;`
- Si el contenedor Docker no puede acceder a la IP del host, cambiar en `nginx.conf`:
  ```nginx
  proxy_pass http://host.docker.internal:8080/;
  ```
- O usar `network_mode: host` al ejecutar el contenedor:
  ```bash
  docker run -d --network host casaglass-front
  ```

**Verificación:**
- Abrir DevTools (F12) → Network
- Intentar login y verificar que la petición vaya a `http://148.230.87.167:8080/auth/login`
- Si va a `http://148.230.87.167:3000/api/auth/login`, el proxy de Nginx debería redirigirla

### Error "No static resource auth/login" en Producción

**Síntoma:** Error 500 con mensaje "No static resource auth/login" al intentar hacer login en producción.

**Causa:** El proxy de Nginx está enviando la petición con el prefijo `/api` al backend, pero el backend NO espera este prefijo. El backend espera rutas como `/auth/login`, no `/api/auth/login`.

**Solución:** Configurar el proxy de Nginx para eliminar el prefijo `/api` antes de enviarlo al backend:

```nginx
# En nginx.conf, cambiar:
location /api {
    proxy_pass http://148.230.87.167:8080/;  # ← Nota la barra al final
    # ... resto de la configuración
}
```

**Explicación:**
- `proxy_pass http://148.230.87.167:8080;` (sin barra) → envía `/api/auth/login` al backend
- `proxy_pass http://148.230.87.167:8080/;` (con barra) → envía `/auth/login` al backend (elimina `/api`)

**Verificación:**
- Reconstruir el contenedor Docker con el nuevo `nginx.conf`
- Verificar en DevTools (F12) → Network que la petición llegue correctamente al backend
- El backend debe recibir `/auth/login`, no `/api/auth/login`

