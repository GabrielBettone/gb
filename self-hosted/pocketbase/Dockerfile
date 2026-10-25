# syntax=docker/dockerfile:1

# ==============================================================================
# ETAPA 1: Build do Front-End React + Vite + TypeScript
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Instalar dependências
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile || npm install

# Copiar código-fonte da aplicação
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Compilar para produção com URL relativa da API (mesma origem do proxy / PocketBase)
ENV VITE_POCKETBASE_URL=""
RUN npm run build

# ==============================================================================
# ETAPA 2: Imagem do PocketBase (Backend Oficial v0.26+)
# ==============================================================================
FROM alpine:3.20 AS pocketbase
ARG PB_VERSION=0.26.4
WORKDIR /pb

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    curl

# Baixar binário oficial do PocketBase para arquitetura x86_64 ou arm64
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then PB_ARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then PB_ARCH="arm64"; \
    else PB_ARCH="amd64"; fi && \
    curl -sL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" -o pb.zip && \
    unzip pb.zip && \
    rm pb.zip && \
    chmod +x /pb/pocketbase

# Copiar migrações de esquema e hooks
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

VOLUME /pb/pb_data
EXPOSE 8090

ENTRYPOINT ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
