# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependências
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm install -g pnpm && (pnpm install --frozen-lockfile || npm install)

# Copiar arquivos de configuração e código
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build do Vite com fallback para mesma origem
ARG VITE_POCKETBASE_URL=""
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
RUN npm run build

# Servidor web Nginx leve para servir os arquivos estáticos
FROM nginx:1.27-alpine AS runner

# Copiar build gerado
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração Nginx com suporte a SPA (HTML5 History API) e proxy reverso para PocketBase
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
