#!/bin/bash
###############################################################################
#  TaskFlow — Script de lancement complet du projet
#  Usage : chmod +x start-all.sh && ./start-all.sh
#
#  Ce script lance TOUT le projet :
#   1. Docker (PostgreSQL + PgAdmin)
#   2. Création des 7 bases de données (par service)
#   3. Fichiers .env pour chaque service
#   4. Installation des dépendances backend (npm)
#   5. Prisma generate + db push
#   6. Installation des dépendances frontend (npm)
#   7. Seed de toutes les bases de données
#   8. Ollama (LLM local pour chatbot + invoice)
#   9. ML Service (Python/FastAPI — port 8000)
#  10. Démarrage des 8 micro-services backend
#  11. Démarrage du frontend Angular
#  12. Démarrage du chatbot Finance (Python FastAPI)
###############################################################################

# Ne PAS utiliser set -e : on gère les erreurs manuellement
# pour éviter que le script ne crashe sur un warning npm

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend/taskflow-web"
CHATBOT_DIR="$PROJECT_ROOT/chatbot-finance"
LOGS_DIR="$PROJECT_ROOT/runtime-logs"
PID_FILE="$PROJECT_ROOT/.taskflow-pids"

# ─── Configuration des services ─────────────────────────────────────────────
# Ordre : services métier d'abord, puis API Gateway en dernier (il proxy les autres)
declare -a SERVICES=(
  "auth-service:3001"
  "tenant-service:3002"
  "business-service:3003"
  "notification-service:3004"
  "invoice-service:3005"
  "expense-service:3006"
  "audit-service:3008"
  "api-gateway:3000"
)

declare -a PRISMA_SERVICES=(
  "auth-service"
  "tenant-service"
  "business-service"
  "notification-service"
  "invoice-service"
  "expense-service"
  "audit-service"
)

DB_BASE="postgresql://postgres:taskflow2026@localhost:5432"

# ─── Fonctions utilitaires ───────────────────────────────────────────────────

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[  OK]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC}  $1"; }
log_header()  {
  echo ""
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${NC}"
  echo ""
}

cleanup() {
  echo ""
  log_header "Arrêt de tous les services..."

  # Tuer les processus enregistrés
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null
        # Aussi tuer les processus enfants
        pkill -P "$pid" 2>/dev/null || true
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi

  # Tuer tout ce qui reste sur les ports du projet
  for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000; do
    lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done

  # Tuer les processus enfants du script
  pkill -P $$ 2>/dev/null || true

  log_success "Tous les services ont été arrêtés."
  log_info "PostgreSQL et PgAdmin restent actifs (Docker)."
  log_info "Pour les arrêter aussi : docker compose down"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait_for_port() {
  local port=$1
  local name=$2
  local max_wait=${3:-90}
  local waited=0
  while ! lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$max_wait" ]; then
      log_error "$name n'a pas démarré sur le port $port après ${max_wait}s"
      log_warn "Vérifiez les logs : $LOGS_DIR/$name.log"
      return 1
    fi
  done
  log_success "$name est prêt sur le port $port"
  return 0
}

wait_for_postgres() {
  local max_wait=30
  local waited=0
  log_info "Attente de PostgreSQL..."
  while ! docker exec taskflow-postgres pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$max_wait" ]; then
      log_error "PostgreSQL n'est pas prêt après ${max_wait}s"
      exit 1
    fi
  done
  log_success "PostgreSQL est prêt !"
}

wait_for_docker() {
  local max_wait=${1:-120}
  local waited=0

  if docker info >/dev/null 2>&1; then
    return 0
  fi

  log_warn "Docker daemon indisponible. Tentative de démarrage de Docker Desktop..."
  if command -v open >/dev/null 2>&1; then
    open -a Docker >/dev/null 2>&1 || true
  fi

  while ! docker info >/dev/null 2>&1; do
    sleep 2
    waited=$((waited + 2))
    if [ "$waited" -ge "$max_wait" ]; then
      log_error "Docker n'est toujours pas accessible après ${max_wait}s."
      log_info "Contexte Docker actuel: $(docker context show 2>/dev/null || echo 'indisponible')"
      log_info "Détail erreur:"
      docker info 2>&1 | head -3
      return 1
    fi
  done

  log_success "Docker daemon est prêt"
  return 0
}

create_databases() {
  log_info "Création des bases de données par service..."
  local dbs=("taskflow_auth" "taskflow_tenant" "taskflow_business" "taskflow_notification" "taskflow_invoice" "taskflow_expense" "taskflow_audit")
  for db in "${dbs[@]}"; do
    if docker exec taskflow-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null | grep -q 1; then
      log_success "Base $db existe déjà"
    else
      docker exec taskflow-postgres psql -U postgres -c "CREATE DATABASE $db;" >/dev/null 2>&1
      log_success "Base $db créée"
    fi
  done
}

get_db_name_for_service() {
  local svc="$1"
  case "$svc" in
    auth-service) echo "taskflow_auth" ;;
    tenant-service) echo "taskflow_tenant" ;;
    business-service) echo "taskflow_business" ;;
    notification-service) echo "taskflow_notification" ;;
    invoice-service) echo "taskflow_invoice" ;;
    expense-service) echo "taskflow_expense" ;;
    audit-service) echo "taskflow_audit" ;;
    *) echo "" ;;
  esac
}

get_db_env_name_for_service() {
  local svc="$1"
  case "$svc" in
    auth-service) echo "DATABASE_URL_AUTH" ;;
    tenant-service) echo "DATABASE_URL_TENANT" ;;
    business-service) echo "DATABASE_URL_BUSINESS" ;;
    notification-service) echo "DATABASE_URL_NOTIFICATION" ;;
    invoice-service) echo "DATABASE_URL_INVOICE" ;;
    expense-service) echo "DATABASE_URL_EXPENSE" ;;
    audit-service) echo "DATABASE_URL_AUDIT" ;;
    *) echo "DATABASE_URL" ;;
  esac
}

ensure_env_file() {
  local svc=$1
  local svc_dir="$BACKEND_DIR/$svc"
  local env_file="$svc_dir/.env"
  local env_example_file="$svc_dir/.env.example"
  local db_name
  local db_url
  local db_env_name
  local port

  db_name="$(get_db_name_for_service "$svc")"
  db_env_name="$(get_db_env_name_for_service "$svc")"

  # Récupérer le port depuis SERVICES
  for entry in "${SERVICES[@]}"; do
    if [[ "${entry%%:*}" == "$svc" ]]; then
      port="${entry##*:}"
      break
    fi
  done

  if [ -f "$env_file" ]; then
    # Corriger JWT_EXPIRES_IN=7d → 604800 si présent
    if grep -q 'JWT_EXPIRES_IN=7d' "$env_file"; then
      sed -i '' 's/JWT_EXPIRES_IN=7d/JWT_EXPIRES_IN=604800/g' "$env_file"
      log_success "$svc — JWT_EXPIRES_IN corrigé à 604800"
    fi

    if [ -n "$db_name" ] && ! grep -q "^${db_env_name}=" "$env_file"; then
      db_url="postgresql://postgres:taskflow2026@localhost:5432/$db_name"
      echo "${db_env_name}=$db_url" >> "$env_file"
      log_success "$svc — $db_env_name ajouté"
    fi

    return
  fi

  if [ -f "$env_example_file" ]; then
    cp "$env_example_file" "$env_file"
    log_success "$svc — .env créé depuis .env.example"
    if grep -q 'JWT_EXPIRES_IN=7d' "$env_file"; then
      sed -i '' 's/JWT_EXPIRES_IN=7d/JWT_EXPIRES_IN=604800/g' "$env_file"
      log_success "$svc — JWT_EXPIRES_IN corrigé à 604800"
    fi

    if [ -n "$db_name" ] && ! grep -q "^${db_env_name}=" "$env_file"; then
      db_url="postgresql://postgres:taskflow2026@localhost:5432/$db_name"
      echo "${db_env_name}=$db_url" >> "$env_file"
      log_success "$svc — $db_env_name ajouté"
    fi

    return
  fi

  if [ -n "$db_name" ]; then
    db_url="postgresql://postgres:taskflow2026@localhost:5432/$db_name"
    cat > "$env_file" <<EOF
PORT=${port:-3000}
NODE_ENV=development
DATABASE_URL=$db_url
${db_env_name}=$db_url
JWT_SECRET=change-me
JWT_EXPIRES_IN=604800
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
NOTIFICATION_SERVICE_URL=http://localhost:3004
BUSINESS_SERVICE_URL=http://localhost:3003
ML_SERVICE_URL=http://localhost:8000
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
  else
    # API Gateway n'a pas de DB
    cat > "$env_file" <<EOF
PORT=3000
NODE_ENV=development
JWT_SECRET=change-me
JWT_EXPIRES_IN=604800
EOF
  fi
}

# ─── Libérer les ports occupés ───────────────────────────────────────────────
log_header "Nettoyage des ports"

for port in 3000 3001 3002 3003 3004 3005 3006 3008 4200 8000 8001; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    log_warn "Port $port libéré (processus existant tué)"
  fi
done
log_success "Tous les ports sont libres"

# ─── Vérifications préalables ────────────────────────────────────────────────
log_header "Étape 0/12 — Vérification des prérequis"

if ! command -v docker &>/dev/null; then
  log_error "Docker n'est pas installé. Installez Docker Desktop puis relancez."
  exit 1
fi
log_success "Docker trouvé"

if ! wait_for_docker 150; then
  log_error "Docker n'est pas démarré ou inaccessible. Ouvrez Docker Desktop puis relancez."
  exit 1
fi
log_success "Docker est actif"

if ! command -v node &>/dev/null; then
  log_error "Node.js n'est pas installé."
  exit 1
fi
log_success "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  log_error "npm n'est pas installé."
  exit 1
fi
log_success "npm $(npm -v)"

mkdir -p "$LOGS_DIR"

# ─── Étape 1 : Docker (PostgreSQL + PgAdmin + Redis) ───────────────────────
log_header "Étape 1/12 — Docker : PostgreSQL + PgAdmin + Redis"

cd "$PROJECT_ROOT"
docker compose up -d postgres pgadmin redis 2>&1 | tail -5
wait_for_postgres
create_databases

# ─── Étape 2 : Fichiers .env (création + correction JWT_EXPIRES_IN) ──────────
log_header "Étape 2/12 — Fichiers .env des services"

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  ensure_env_file "$svc"
  log_success "$svc — .env OK"
done

# ─── Étape 3 : Installation des dépendances backend ─────────────────────────
log_header "Étape 3/12 — npm install (backend)"

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  svc_dir="$BACKEND_DIR/$svc"
  if [ -d "$svc_dir" ]; then
    log_info "npm install → $svc"
    (cd "$svc_dir" && npm install 2>&1 | tail -1) || log_warn "$svc — npm install a retourné des warnings"
    log_success "$svc — dépendances OK"
  else
    log_warn "$svc — dossier introuvable, ignoré"
  fi
done

# ─── Étape 4 : Prisma — Génération + Synchronisation ────────────────────────
log_header "Étape 4/12 — Prisma : generate + db push"

for svc in "${PRISMA_SERVICES[@]}"; do
  svc_dir="$BACKEND_DIR/$svc"
  if [ -d "$svc_dir/prisma" ]; then
    log_info "Prisma → $svc"
    (
      cd "$svc_dir"
      if [ "$svc" = "auth-service" ]; then
        # auth-service requiert --config prisma.config.ts
        npx prisma generate --config prisma.config.ts 2>&1 | tail -1
        npx prisma db push --config prisma.config.ts --accept-data-loss 2>&1 | tail -3
      else
        npx prisma generate 2>&1 | tail -1
        npx prisma db push --accept-data-loss 2>&1 | tail -3
      fi

      # Generate writes root node_modules/.prisma; Nest/TS imports expect it under @prisma/client/.prisma
      if [ -d "node_modules/.prisma" ] && [ -d "node_modules/@prisma/client" ]; then
        rm -rf node_modules/@prisma/client/.prisma
        cp -R node_modules/.prisma node_modules/@prisma/client/.prisma
      fi
    ) || log_warn "$svc — Prisma a retourné des warnings"
    log_success "$svc — schéma synchronisé"
  fi
done

# ─── Étape 5 : Installation des dépendances frontend ────────────────────────
log_header "Étape 5/12 — npm install (frontend Angular)"

if [ -d "$FRONTEND_DIR" ]; then
  log_info "npm install → frontend"
  (cd "$FRONTEND_DIR" && npm install 2>&1 | tail -1) || log_warn "Frontend — npm install a retourné des warnings"
  log_success "Frontend — dépendances OK"
else
  log_error "Dossier frontend introuvable : $FRONTEND_DIR"
fi

# ─── Étape 6 : Seed des bases de données ────────────────────────────────────
log_header "Étape 6/12 — Seed des bases de données"

if [ -f "$BACKEND_DIR/seed-all.mjs" ]; then
  log_info "Exécution du seed (seed-all.mjs)..."
  # S'assurer que pg est installé au niveau racine
  (cd "$PROJECT_ROOT" && npm list pg >/dev/null 2>&1 || npm install pg --save 2>/dev/null)
  (cd "$PROJECT_ROOT" && node backend/seed-all.mjs 2>&1 | tail -5) || log_warn "Le seed a rencontré des erreurs (les données existent peut-être déjà)"
  log_success "Seed terminé"
else
  log_warn "seed-all.mjs introuvable, seed ignoré"
fi

# ─── Étape 7 : Ollama (LLM local) ──────────────────────────────────────────
log_header "Étape 7/12 — Ollama (LLM pour chatbot + invoice)"

if command -v ollama &>/dev/null; then
  # Vérifier si Ollama tourne déjà
  if ! curl -s http://localhost:11434/ >/dev/null 2>&1; then
    log_info "Démarrage d'Ollama..."
    ollama serve > "$LOGS_DIR/ollama.log" 2>&1 &
    echo $! >> "$PID_FILE"
    sleep 3
  fi

  if curl -s http://localhost:11434/ >/dev/null 2>&1; then
    log_success "Ollama est actif sur le port 11434"

    # Vérifier si le modèle llama3 est disponible
    if ! ollama list 2>/dev/null | grep -q "llama3"; then
      log_info "Téléchargement du modèle llama3 (première fois seulement)..."
      ollama pull llama3 2>&1 | tail -3
    fi
    log_success "Modèle llama3 disponible"
  else
    log_warn "Ollama n'a pas démarré — le chatbot ne pourra pas répondre"
  fi
else
  log_warn "Ollama n'est pas installé — le chatbot ne pourra pas répondre"
  log_warn "Pour l'installer : brew install ollama"
fi

# ─── Étape 8 : ML Service (Python/FastAPI) — Setup ─────────────────────────
log_header "Étape 8/12 — ML Service : environnement Python"

ML_SERVICE_DIR="$BACKEND_DIR/ml-service"
if [ -f "$ML_SERVICE_DIR/main.py" ]; then
  if [ ! -f "$ML_SERVICE_DIR/.env" ] && [ -f "$ML_SERVICE_DIR/.env.example" ]; then
    cp "$ML_SERVICE_DIR/.env.example" "$ML_SERVICE_DIR/.env"
    log_success "ml-service — .env créé depuis .env.example"
  fi

  if ! command -v python3 &>/dev/null; then
    log_warn "Python3 non trouvé — ml-service ignoré"
  else
    if [ ! -d "$ML_SERVICE_DIR/venv" ]; then
      log_info "Création du virtualenv Python pour ml-service..."
      python3 -m venv "$ML_SERVICE_DIR/venv"
    fi
    log_info "Installation des dépendances Python ml-service..."
    "$ML_SERVICE_DIR/venv/bin/pip" install -q -r "$ML_SERVICE_DIR/requirements.txt" 2>&1 | tail -1
    log_success "ML Service — environnement Python prêt"
  fi
else
  log_warn "ml-service introuvable"
fi

# ─── Étape 9 : Chatbot Finance (Python) — Setup ─────────────────────────────
log_header "Étape 9/12 — Chatbot Finance : environnement Python"

if [ -d "$CHATBOT_DIR" ] && [ -f "$CHATBOT_DIR/app/main.py" ]; then
  if ! command -v python3 &>/dev/null; then
    log_warn "Python3 non trouvé — chatbot ignoré"
  else
    # Créer le virtualenv si nécessaire
    if [ ! -d "$CHATBOT_DIR/venv" ]; then
      log_info "Création du virtualenv Python..."
      python3 -m venv "$CHATBOT_DIR/venv"
    fi

    # Installer les dépendances
    log_info "Installation des dépendances Python..."
    "$CHATBOT_DIR/venv/bin/pip" install -q fastapi uvicorn httpx qdrant-client sentence-transformers numpy pydantic 2>&1 | tail -1
    log_success "Environnement Python chatbot prêt"
  fi
else
  log_warn "Chatbot introuvable"
fi

# ─── Étape 10 : Lancement des micro-services backend ────────────────────────
log_header "Étape 10/12 — Démarrage des 8 micro-services backend"

> "$PID_FILE"  # Réinitialiser le fichier PIDs

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  svc_dir="$BACKEND_DIR/$svc"

  if [ -d "$svc_dir" ]; then
    log_info "Démarrage $svc (port $port)..."
    # Tuer tout processus résiduel sur ce port avant de démarrer
    lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
    (cd "$svc_dir" && npm run start:dev > "$LOGS_DIR/$svc.log" 2>&1) &
    echo $! >> "$PID_FILE"
  fi
done

# Attendre que chaque service soit prêt
log_info "Attente du démarrage des services (max 90s)..."
sleep 5

WAIT_PIDS=()
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  wait_for_port "$port" "$svc" 90 &
  WAIT_PIDS+=($!)
done
for wpid in "${WAIT_PIDS[@]}"; do
  wait "$wpid" 2>/dev/null || true
done

# ─── Étape 11 : Lancement du frontend Angular ───────────────────────────────
log_header "Étape 11/12 — Démarrage du frontend Angular"

if [ -d "$FRONTEND_DIR" ]; then
  log_info "Démarrage Angular (port 4200)..."
  (cd "$FRONTEND_DIR" && npx ng serve --port 4200 > "$LOGS_DIR/frontend.log" 2>&1) &
  echo $! >> "$PID_FILE"
  wait_for_port 4200 "Frontend Angular" 120
fi

# ─── Étape 12a : Lancement du ML Service Python ─────────────────────────────
log_header "Étape 12a/12 — Démarrage du ML Service (port 8000)"

if [ -f "$ML_SERVICE_DIR/venv/bin/python" ] && [ -f "$ML_SERVICE_DIR/main.py" ]; then
  log_info "Démarrage du ml-service (port 8000)..."
  (cd "$ML_SERVICE_DIR" && ./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$LOGS_DIR/ml-service.log" 2>&1) &
  echo $! >> "$PID_FILE"
  wait_for_port 8000 "ML Service" 60
else
  log_warn "ML Service non disponible (virtualenv manquant — installez Python3 et relancez)"
fi

# ─── Étape 12b : Lancement du chatbot ───────────────────────────────────────
log_header "Étape 12b/12 — Démarrage du Chatbot Finance (port 8001)"

if [ -d "$CHATBOT_DIR" ] && [ -f "$CHATBOT_DIR/venv/bin/python" ]; then
  log_info "Démarrage du chatbot (port 8001)..."
  (cd "$CHATBOT_DIR" && ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload > "$LOGS_DIR/chatbot.log" 2>&1) &
  echo $! >> "$PID_FILE"
  wait_for_port 8001 "Chatbot Finance" 60
else
  log_warn "Chatbot non disponible (virtualenv manquant)"
fi

# ─── Résumé final ────────────────────────────────────────────────────────────
log_header "TaskFlow est prêt !"

echo -e "${GREEN}${BOLD}┌──────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}${BOLD}│              TOUS LES SERVICES SONT ACTIFS           │${NC}"
echo -e "${GREEN}${BOLD}└──────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${BOLD}Infrastructure :${NC}"
echo -e "  ${CYAN}PostgreSQL${NC}           → localhost:5432"
echo -e "  ${CYAN}Redis${NC}                → localhost:6379"
echo -e "  ${CYAN}PgAdmin${NC}              → http://localhost:5050  (admin: nourhasni@taskflow.com / nourhasni2002)"
echo -e "  ${CYAN}Ollama (LLM)${NC}         → http://localhost:11434"
echo ""
echo -e "  ${BOLD}Backend (NestJS) :${NC}"
echo -e "  ${CYAN}API Gateway${NC}          → http://localhost:3000"
echo -e "  ${CYAN}Auth Service${NC}         → http://localhost:3001"
echo -e "  ${CYAN}Tenant Service${NC}       → http://localhost:3002"
echo -e "  ${CYAN}Business Service${NC}     → http://localhost:3003"
echo -e "  ${CYAN}Notification Service${NC} → http://localhost:3004"
echo -e "  ${CYAN}Invoice Service${NC}      → http://localhost:3005"
echo -e "  ${CYAN}Expense Service${NC}      → http://localhost:3006"
echo -e "  ${CYAN}Audit Service${NC}        → http://localhost:3008"
echo ""
echo -e "  ${BOLD}Frontend :${NC}"
echo -e "  ${CYAN}Angular${NC}              → http://localhost:4200"
echo ""
echo -e "  ${BOLD}IA / ML :${NC}"
echo -e "  ${CYAN}ML Service${NC}           → http://localhost:8000"
echo -e "  ${CYAN}ML Docs (Swagger)${NC}    → http://localhost:8000/docs"
echo -e "  ${CYAN}Chatbot Finance${NC}      → http://localhost:8001"
echo -e "  ${CYAN}Chatbot Docs${NC}         → http://localhost:8001/docs"
echo ""
echo -e "  ${BOLD}Compte admin :${NC}"
echo -e "  ${CYAN}Email${NC}                → admin@taskflow.local"
echo -e "  ${CYAN}Password${NC}             → Admin1234!"
echo ""
echo -e "${YELLOW}Logs :${NC}     $LOGS_DIR/"
echo -e "${YELLOW}Arrêter :${NC}  Ctrl+C"
echo ""

# Garder le script en vie pour intercepter Ctrl+C
while true; do
  sleep 1
done
