#!/bin/bash
# ==============================================================================
# Script de Backup Automático do Banco e Uploads da Gesso Bettone
# ==============================================================================
# Execução: ./backup.sh
# ==============================================================================

set -e

DATA=$(date +%Y-%m-%d_%H-%M-%S)
DIR_BACKUP="./backups"
ARQUIVO_BACKUP="${DIR_BACKUP}/bettone_backup_${DATA}.tar.gz"

mkdir -p "$DIR_BACKUP"

echo "=========================================================="
echo "Iniciando backup do volume de dados (PocketBase + Uploads)..."
echo "Data: $DATA"
echo "=========================================================="

# Criar backup compacto do volume nomeado bettone_pb_data
docker run --rm \
  -v bettone_pb_data:/pb_data:ro \
  -v "$(pwd)/${DIR_BACKUP}:/backup_dest" \
  alpine:latest \
  tar -czf "/backup_dest/bettone_backup_${DATA}.tar.gz" -C /pb_data .

echo ""
echo "✅ Backup concluído com sucesso!"
echo "Arquivo gerado: ${ARQUIVO_BACKUP}"
ls -lh "$ARQUIVO_BACKUP"
echo "=========================================================="
