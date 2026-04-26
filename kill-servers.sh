#!/bin/bash
###############################################################################
#  TaskFlow — Script d'arrêt de tous les services
#  Usage : chmod +x kill-servers.sh && ./kill-servers.sh
#
#  Arrête :
#   - Tous les micro-services backend (ports 3000-3008)
#   - Le frontend Angular (port 4200)
#   - Le chatbot Finance Python (port 8000)
#   - Les PIDs enregistrés dans .taskflow-pids
#
#  NE touche PAS Docker (PostgreSQL + PgAdmin restent actifs)
#  Pour arrêter Docker aussi : docker compose down
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_ROOT/.taskflow-pids"

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[  OK]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_header()  {
  echo ""
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${NC}"
  echo ""
}

log_header "Arrêt de tous les services TaskFlow"

# ─── 0. Détection des services en cours ─────────────────────────────────────
declare -A PORT_NAMES=(
  [3000]="api-gateway"
  [3001]="auth-service"
  [3002]="tenant-service"
  [3003]="business-service"
  [3004]="notification-service"
  [3005]="invoice-service"
  [3006]="expense-service"
  [3008]="audit-service"
  [4200]="frontend Angular"
  [8000]="chatbot Finance (Python)"
  [11434]="Ollama"
)

echo -e "${BOLD}Services actuellement en marche :${NC}"
echo ""
found_any=false

for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000 11434; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    name="${PORT_NAMES[$port]}"
    proc=$(ps -p $(echo "$pids" | head -1) -o comm= 2>/dev/null || echo "?")
    echo -e "  ${GREEN}●${NC}  ${BOLD}${name}${NC} (port ${port}) — processus: ${proc} [PID: $(echo "$pids" | tr '\n' ' ')]"
    found_any=true
  fi
done

# Docker
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "taskflow"; then
  echo -e "  ${GREEN}●${NC}  ${BOLD}Docker${NC} (PostgreSQL + PgAdmin) — conteneurs actifs :"
  docker ps --filter "name=taskflow" --format "       - {{.Names}} ({{.Status}})" 2>/dev/null
  found_any=true
fi

# Ollama (process)
if pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo -e "  ${GREEN}●${NC}  ${BOLD}Ollama${NC} (serve) — PID: $(pgrep -f 'ollama serve' | tr '\n' ' ')"
  found_any=true
fi

if [ "$found_any" = false ]; then
  echo -e "  ${YELLOW}Aucun service TaskFlow détecté en cours d'exécution.${NC}"
fi

echo ""

# ─── Confirmation ────────────────────────────────────────────────────────────
read -rp "$(echo -e "${YELLOW}Voulez-vous arrêter tous ces services ? [o/N] :${NC} ")" confirm
if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
  echo ""
  log_warn "Annulé. Aucun service n'a été arrêté."
  echo ""
  exit 0
fi
echo ""

# ─── 1. Tuer les PIDs enregistrés par start-all.sh ──────────────────────────
if [ -f "$PID_FILE" ]; then
  log_info "Arrêt des processus enregistrés dans .taskflow-pids..."
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && log_success "PID $pid arrêté"
      pkill -P "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
  log_success "Fichier .taskflow-pids supprimé"
else
  log_warn "Aucun fichier .taskflow-pids trouvé"
fi

# ─── 2. Libérer tous les ports du projet ────────────────────────────────────
log_info "Libération des ports (3000, 3001, 3002, 3003, 3004, 3005, 3006, 3008, 4200, 8000)..."

for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    log_success "Port $port libéré"
  fi
done

# ─── 3. Tuer les processus node/python liés au projet ───────────────────────
log_info "Nettoyage des processus node/uvicorn résiduels..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "uvicorn.*main:app" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true

# ─── 4. Arrêter Ollama ──────────────────────────────────────────────────────
log_info "Arrêt d'Ollama..."
pkill -f "ollama serve" 2>/dev/null || true
pkill -f "ollama runner" 2>/dev/null || true
# Tuer le port Ollama (11434)
pids=$(lsof -ti :11434 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "$pids" | xargs kill -9 2>/dev/null || true
fi
log_success "Ollama arrêté"

# ─── 5. Arrêter Docker (PostgreSQL + PgAdmin) ───────────────────────────────
log_info "Arrêt de Docker (PostgreSQL + PgAdmin)..."
if docker compose -f "$PROJECT_ROOT/docker-compose.yml" down 2>/dev/null; then
  log_success "Docker arrêté"
else
  log_warn "docker compose down a échoué ou Docker n'était pas actif"
fi

echo ""
log_success "Tous les services ont été arrêtés (backend, frontend, chatbot, Ollama, Docker)."
echo ""
