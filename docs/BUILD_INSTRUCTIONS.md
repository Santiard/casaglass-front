# Instrucciones de Build para Producción

## Problema Común: VITE_API_URL no está definida

Si ves el error "VITE_API_URL no está definida en producción", significa que el build no incluyó la variable de entorno.

## Solución

### 1. Verificar que `.env.production` existe

```bash
# Verificar que el archivo existe
cat .env.production
```

Debe contener:
```env
VITE_API_URL=http://148.230.87.167:8080/api
```

### 2. Hacer el build localmente (recomendado)

```bash
# 1. Asegurarse de que .env.production existe
echo "VITE_API_URL=http://148.230.87.167:8080/api" > .env.production

# 2. Hacer el build
npm run build

# 3. Verificar que el build incluyó la variable
# Buscar en dist/assets/*.js por "148.230.87.167:8080/api"
grep -r "148.230.87.167:8080/api" dist/ || echo "⚠️ Variable no encontrada en el build"
```

### 3. Construir la imagen Docker

```bash
# Construir la imagen
docker build -t casaglass-front .

# O si estás en el servidor, usar el contexto correcto
docker build -f Dockerfile -t casaglass-front .
```

### 4. Verificar el build dentro del contenedor

```bash
# Ejecutar el contenedor y verificar
docker run --rm casaglass-front sh -c "ls -la /usr/share/nginx/html/assets/ | head -5"
```

### 5. Ejecutar el contenedor

```bash
# Detener contenedor anterior si existe
docker stop casaglass-front 2>/dev/null || true
docker rm casaglass-front 2>/dev/null || true

# Ejecutar nuevo contenedor
docker run -d -p 3000:80 --name casaglass-front casaglass-front
```

## Verificación Post-Deploy

1. Abrir la aplicación en el navegador
2. Abrir DevTools (F12) → Console
3. Deberías ver:
   ```
   🔧 API_BASE configurado: http://148.230.87.167:8080/api
   🔧 VITE_API_URL: http://148.230.87.167:8080/api
   🔧 Entorno: production
   🔧 Es producción: true
   ```

4. Intentar hacer login
5. En Network tab, verificar que la petición vaya a:
   - ✅ `http://148.230.87.167:8080/api/auth/login` (correcto)
   - ❌ `http://148.230.87.167:3000/api/auth/login` (incorrecto - va al frontend)

## Troubleshooting

### Si el build no incluye la variable:

1. Verificar que `.env.production` existe en la raíz del proyecto
2. Verificar que el archivo no esté en `.gitignore`
3. Hacer el build con modo verbose:
   ```bash
   npm run build -- --mode production
   ```

### Si ves error 405 de Nginx:

- Significa que la petición está yendo al frontend (puerto 3000) en lugar del backend (puerto 8080)
- Verificar que `VITE_API_URL` esté correctamente definida en el build
- Reconstruir la imagen Docker

### Si ves "No static resource":

- Significa que el backend no encuentra la ruta
- Verificar que la URL incluya `/api`: `http://148.230.87.167:8080/api/auth/login`

