#!/usr/bin/env bash

# ===== Configuration =====
PORT=3000
SERVER_DIR="/home/sergio/mcp-servers/moodle-mcp-server"

echo "Démarrage Moodle MCP via socat (port $PORT)"

# Sécurité
set -e

# Aller dans le dossier du serveur
cd "$SERVER_DIR" || {
  echo "❌ Dossier introuvable : $SERVER_DIR"
  exit 1
}

# Vérifications minimales
if [ ! -f "build/index.js" ]; then
  echo "❌ build/index.js manquant – lance npm run build"
  exit 1
fi

if ! command -v socat >/dev/null 2>&1; then
  echo "❌ socat non installé"
  exit 1
fi

# ===== Lancement MCP TCP =====
exec socat \
  TCP-LISTEN:$PORT,fork,reuseaddr \
  EXEC:"/usr/bin/env node build/index.js",pty,raw,echo=0
