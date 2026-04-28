#!/bin/bash
###############################################################################
#  TaskFlow — Redémarrage propre d'un micro-service
#  Usage : ./restart-service.sh <nom-du-service>
#  Ex    : ./restart-service.sh api-gateway
#          ./restart-service.sh auth-service
###############################################################################

SERVICES_PORTS=(
  "api-gateway:3000"
  "auth-service:3001"
  "tenant-service:3002"
  "business-service:3003"
  "notification-service:3004"
  "invoice-service:3005"
  "expense-service:3006"
  "audit-service:3008"
)

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[  OK]${NC}  $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS_DIR="$PROJECT_ROOT/runtime-logs"
mkdir -p "$LOGS_DIR"

SVC="$1"
if [ -z "$SVC" ]; then
  log_error "Usage : $0 <nom-du-service>"
  echo "Services disponibles :"
  for entry in "${SERVICES_PORTS[@]}"; do echo "  ${entry%%:*} (port ${entry##*:})"; done
  exit 1
fi

PORT=""
for entry in "${SERVICES_PORTS[@]}"; do
  if [[ "${entry%%:*}" == "$SVC" ]]; then
    PORT="${entry##*:}"
    break
  fi
done

if [ -z "$PORT" ]; then
  log_error "Service inconnu : $SVC"
  exit 1
fi

SVC_DIR="$PROJECT_ROOT/backend/$SVC"
if [ ! -d "$SVC_DIR" ]; then
  log_error "Dossier introuvable : $SVC_DIR"
  exit 1
fi

log_info "Arrêt du service $SVC (port $PORT)..."
lsof -ti :"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Vérifier que le port est bien libéré
if lsof -ti :"$PORT" >/dev/null 2>&1; then
  log_warn "Port $PORT toujours occupé, nouvelle tentative..."
  sleep 2
  lsof -ti :"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1
fi

log_info "Démarrage de $SVC en arrière-plan..."
(cd "$SVC_DIR" && nohup npm run start:dev > "$LOGS_DIR/$SVC.log" 2>&1) &
NEW_PID=$!
log_info "PID=$NEW_PID — Attente du démarrage (max 60s)..."

waited=0
while ! lsof -i :"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  sleep 1
  waited=$((waited + 1))
  if [ "$waited" -ge 60 ]; then
    log_error "$SVC n'a pas démarré après 60s. Vérifiez : $LOGS_DIR/$SVC.log"
    exit 1
  fi
done

log_success "$SVC est prêt sur le port $PORT (PID=$NEW_PID)"
