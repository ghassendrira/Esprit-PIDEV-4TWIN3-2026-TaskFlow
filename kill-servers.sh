#!/bin/bash
###############################################################################
#  TaskFlow — Script d'arrêt de tous les services
#  Usage : chmod +x kill-servers.sh && ./kill-servers.sh
#
#  Arrête (après confirmation) :
#   - Tous les micro-services backend (ports 3000-3008)
#   - Le frontend Angular (port 4200)
#   - ML Service Python (port 8000)
#   - Chatbot Finance Python (port 8001)
#   - Ollama LLM (port 11434)
#   - Les PIDs enregistrés dans .taskflow-pids
#
#  Docker (PostgreSQL + PgAdmin) : question séparée
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
  [3000]="API Gateway"
  [3001]="auth-service"
  [3002]="tenant-service"
  [3003]="business-service"
  [3004]="notification-service"
  [3005]="invoice-service"
  [3006]="expense-service"
  [3008]="audit-service"
  [4200]="Frontend Angular"
  [8000]="ML Service (Python)"
  [8001]="Chatbot Finance (Python)"
  [11434]="Ollama (LLM)"
)

echo -e "${BOLD}Services actuellement en marche :${NC}"
echo ""
found_app=false
found_docker=false

for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000 8001 11434; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    name="${PORT_NAMES[$port]}"
    proc=$(ps -p "$(echo "$pids" | head -1)" -o comm= 2>/dev/null || echo "?")
    echo -e "  ${GREEN}●${NC}  ${BOLD}${name}${NC} (port ${port}) — ${proc} [PID: $(echo "$pids" | tr '\n' ' ')]"
    found_app=true
  fi
done

# Ollama (process sans port)
if pgrep -f "ollama serve" >/dev/null 2>&1 && ! lsof -ti :11434 >/dev/null 2>&1; then
  echo -e "  ${GREEN}●${NC}  ${BOLD}Ollama${NC} (serve) — PID: $(pgrep -f 'ollama serve' | tr '\n' ' ')"
  found_app=true
fi

if [ "$found_app" = false ]; then
  echo -e "  ${YELLOW}Aucun service applicatif TaskFlow détecté.${NC}"
fi

# Docker — affichage séparé
echo ""
echo -e "${BOLD}Infrastructure Docker :${NC}"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "taskflow"; then
  docker ps --filter "name=taskflow" --format "  ${GREEN}●${NC}  {{.Names}} ({{.Status}})" 2>/dev/null || \
  docker ps --filter "name=taskflow" --format "  ● {{.Names}} ({{.Status}})" 2>/dev/null
  found_docker=true
else
  echo -e "  ${YELLOW}Aucun conteneur Docker TaskFlow actif.${NC}"
fi

echo ""

# ─── Confirmation — services applicatifs ─────────────────────────────────────
if [ "$found_app" = true ]; then
  read -rp "$(echo -e "${YELLOW}Arrêter tous les services applicatifs (backend, frontend, ML, chatbot, Ollama) ? [o/N] :${NC} ")" confirm_app
else
  confirm_app="n"
fi

if [[ ! "$confirm_app" =~ ^[oOyY]$ ]]; then
  echo ""
  log_warn "Services applicatifs : annulé."
  stop_app=false
else
  stop_app=true
fi

# ─── Confirmation — Docker ────────────────────────────────────────────────────
if [ "$found_docker" = true ]; then
  echo ""
  read -rp "$(echo -e "${YELLOW}Arrêter aussi Docker (PostgreSQL + PgAdmin) ? [o/N] :${NC} ")" confirm_docker
fi

if [[ ! "$confirm_docker" =~ ^[oOyY]$ ]]; then
  log_warn "Docker : conservé actif."
  stop_docker=false
else
  stop_docker=true
fi

echo ""

# ─── Vérification : rien à faire ─────────────────────────────────────────────
if [ "$stop_app" = false ] && [ "$stop_docker" = false ]; then
  log_warn "Rien n'a été arrêté."
  echo ""
  exit 0
fi

# ─── 1. Arrêt des services applicatifs ──────────────────────────────────────
if [ "$stop_app" = true ]; then
  log_header "Arrêt des services applicatifs"

  # 1a. PIDs enregistrés par start-all.sh
  if [ -f "$PID_FILE" ]; then
    log_info "Arrêt des processus enregistrés dans .taskflow-pids..."
    while IFS= read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null
        pkill -P "$pid" 2>/dev/null || true
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    log_success ".taskflow-pids nettoyé"
  fi

  # 1b. Libérer tous les ports applicatifs
  log_info "Libération des ports applicatifs..."
  for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000 8001; do
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
      log_success "Port $port libéré (${PORT_NAMES[$port]})"
    fi
  done

  # 1c. Nettoyage des processus résiduels
  log_info "Nettoyage des processus node/uvicorn résiduels..."
  pkill -f "nest start" 2>/dev/null || true
  pkill -f "ts-node.*src/main" 2>/dev/null || true
  pkill -f "nodemon" 2>/dev/null || true
  pkill -f "ng serve" 2>/dev/null || true
  pkill -f "uvicorn.*main" 2>/dev/null || true
  pkill -f "uvicorn.*app.main" 2>/dev/null || true
  log_success "Processus résiduels nettoyés"

  # 1d. Arrêter Ollama
  log_info "Arrêt d'Ollama (LLM)..."
  pkill -f "ollama serve" 2>/dev/null || true
  pkill -f "ollama runner" 2>/dev/null || true
  pids=$(lsof -ti :11434 2>/dev/null || true)
  [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
  log_success "Ollama arrêté"
fi

# ─── 2. Arrêt de Docker ──────────────────────────────────────────────────────
if [ "$stop_docker" = true ]; then
  log_header "Arrêt de Docker (PostgreSQL + PgAdmin)"
  if docker compose -f "$PROJECT_ROOT/docker-compose.yml" down 2>/dev/null; then
    log_success "Conteneurs Docker arrêtés"
  else
    log_warn "docker compose down a échoué ou Docker n'était pas actif"
  fi
fi

# ─── Résumé ──────────────────────────────────────────────────────────────────
echo ""
if [ "$stop_app" = true ] && [ "$stop_docker" = true ]; then
  log_success "Tout est arrêté (services + Docker)."
elif [ "$stop_app" = true ]; then
  log_success "Services applicatifs arrêtés. Docker (PostgreSQL + PgAdmin) reste actif."
  log_info  "Pour arrêter Docker aussi : docker compose down"
elif [ "$stop_docker" = true ]; then
  log_success "Docker arrêté. Les services applicatifs ont été conservés."
fi
echo ""
