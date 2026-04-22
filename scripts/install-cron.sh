#!/usr/bin/env bash
set -euo pipefail

# Instala cron diario 23:00 ART para Research-X-Github
# Correr desde raíz del proyecto: bash scripts/install-cron.sh

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
LOG_FILE="/var/log/research-x.log"

if [ -z "$NODE_BIN" ]; then
  echo "Error: node no está en PATH" >&2
  exit 1
fi

CRON_LINE="0 23 * * * cd $PROJECT_DIR && TZ=America/Argentina/Buenos_Aires $NODE_BIN src/index.js >> $LOG_FILE 2>&1"

# Dedupe: saca líneas previas del mismo script antes de agregar
( crontab -l 2>/dev/null | grep -v "$PROJECT_DIR/src/index.js" ; echo "$CRON_LINE" ) | crontab -

echo "Cron instalado:"
echo "  $CRON_LINE"
echo
echo "Logs: $LOG_FILE"
echo "Ver crontab: crontab -l"
