#!/bin/bash
# ==============================================================================
# Script de Restauração de Backup da Gesso Bettone
# ==============================================================================
# Uso: ./restaurar.sh ./backups/bettone_backup_XXXX.tar.gz
# ==============================================================================

set -e

ARQUIVO_BACKUP="$1"

if [ -z "$ARQUIVO_BACKUP" ] || [ ! -f "$ARQUIVO_BACKUP" ]; then
  echo "❌ Erro: informe o caminho do arquivo de backup .tar.gz para restaurar."
  echo "Exemplo: ./restaurar.sh ./backups/bettone_backup_2025-01-01_12-00-00.tar.gz"
  exit 1
fi

echo "⚠️  ATENÇÃO: Este procedimento substituirá o banco e dados atuais pelo backup!"
read -p "Deseja continuar? (s/N): " CONFIRMA
if [ "$CONFIRMA" != "s" ] && [ "$CONFIRMA" != "S" ]; then
  echo "Operação cancelada."
  exit 0
fi

echo "Parando os contêineres..."
docker compose stop pocketbase

echo "Restaurando dados..."
docker run --rm \
  -v bettone_pb_data:/pb_data \
  -v "$(realpath "$(dirname "$ARQUIVO_BACKUP")"):/backup_src" \
  alpine:latest \
  sh -c "rm -rf /pb_data/* && tar -xzf /backup_src/$(basename "$ARQUIVO_BACKUP") -C /pb_data"

echo "Reiniciando os contêineres..."
docker compose start pocketbase

echo ""
echo "✅ Restauração finalizada com sucesso!"
