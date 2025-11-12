FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
# Copiar todo incluyendo .env.production
COPY . .
# Verificar que .env.production existe antes del build
RUN if [ ! -f .env.production ]; then echo "⚠️ WARNING: .env.production no encontrado"; fi
RUN cat .env.production || echo "⚠️ No se pudo leer .env.production"
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

